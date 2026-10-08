const InterviewSession = require('../models/InterviewSession');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const SkillGap = require('../models/SkillGap');
const companyInterviewService = require('../services/companyInterviewService');
const aiService = require('../services/aiService');
const { calculateCareerReadiness } = require('../utils/readinessEngine');

// Helper to refresh candidate readiness score whenever interview results change
async function refreshProfileReadiness(userId) {
  try {
    const profile = await CandidateProfile.findOne({ userId });
    const resume = await Resume.findOne({ userId });
    const latestGap = await SkillGap.findOne({ userId });
    
    if (profile) {
      const readiness = calculateCareerReadiness({
        resumeSkills: resume?.parsedData?.skills || [],
        roleMatchPercentage: latestGap?.skillMatchPercentage || profile.skillsScore || 70,
        atsScore: profile.resumeScore || 75,
        hasProjects: true,
        projectCount: 2,
        interviewScore: profile.interviewScore || 70,
        profile: {
          collegeName: profile.collegeName,
          degree: profile.degree,
          targetRole: profile.targetRole,
          dreamCompany: profile.dreamCompany
        }
      });

      profile.readinessScore = readiness.readinessScore;
      profile.readinessBreakdown = readiness.breakdown;
      await profile.save();
    }
  } catch (e) {
    console.error('Error refreshing readiness:', e.message);
  }
}

// 1. Research Company Interview Plan & Flow
exports.getInterviewPlan = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const company = req.query.company || profile?.dreamCompany || req.user.dreamCompany || 'Google';
    const role = req.query.role || profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const refresh = req.query.refresh === 'true';

    const plan = await companyInterviewService.researchInterviewProcess(company, role, refresh);
    return res.json({ success: true, data: plan });
  } catch (error) {
    console.error('getInterviewPlan error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 2. Start Aptitude Round for Company + Role
exports.startAptitude = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const company = req.body.company || profile?.dreamCompany || 'Google';
    const role = req.body.role || profile?.targetRole || 'Software Engineer';

    // Get company interview plan
    const plan = await companyInterviewService.researchInterviewProcess(company, role);
    const questions = await companyInterviewService.generateAptitudeQuestions(company, role, plan);

    const session = await InterviewSession.create({
      userId: req.user.firebaseUid,
      companyName: company,
      normalizedCompanyName: company.toLowerCase().trim(),
      targetRole: role,
      round: 'aptitude',
      durationMinutes: 15,
      companyInterviewPlan: plan,
      questions: questions.map(q => ({
        questionId: q.id,
        category: q.category,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: '',
        isCorrect: false,
        feedback: q.explanation
      }))
    });

    const clientQuestions = session.questions.map(q => ({
      _id: q._id,
      questionId: q.questionId,
      category: q.category,
      questionText: q.questionText,
      options: q.options
    }));

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        company,
        role,
        durationMinutes: 15,
        totalQuestions: clientQuestions.length,
        questions: clientQuestions
      }
    });
  } catch (error) {
    console.error('startAptitude error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 3. Complete Aptitude Round
exports.completeAptitude = async (req, res) => {
  try {
    const { sessionId, answers } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const userAnswers = answers || {};
    let correctCount = 0;
    const categoryStats = {};

    session.questions.forEach((q, idx) => {
      let uAns = '';
      if (Array.isArray(userAnswers)) {
        const found = userAnswers.find(a => a.questionId === q.questionId || a.questionIndex === idx);
        uAns = found ? (found.selectedOption || found.userAnswer || '') : '';
      } else if (userAnswers && typeof userAnswers === 'object') {
        uAns = userAnswers[q.questionId] || userAnswers[q._id] || userAnswers[idx] || '';
      }
      q.userAnswer = String(uAns || '');
      const isRight = Boolean(uAns && q.correctAnswer && String(uAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
      q.isCorrect = Boolean(isRight);

      if (!categoryStats[q.category]) categoryStats[q.category] = { total: 0, correct: 0 };
      categoryStats[q.category].total += 1;

      if (isRight) {
        correctCount += 1;
        categoryStats[q.category].correct += 1;
      }
    });

    const totalQuestions = session.questions.length || 10;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);

    const strengths = [];
    const needsImprovement = [];

    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      const pct = Math.round((stats.correct / stats.total) * 100);
      if (pct >= 60) {
        strengths.push(`${cat} (${stats.correct}/${stats.total} correct)`);
      } else {
        needsImprovement.push(`${cat} (${stats.correct}/${stats.total} correct)`);
      }
    });

    if (strengths.length === 0) strengths.push('Completed full assessment under timed conditions');
    if (needsImprovement.length === 0) needsImprovement.push('Maintain speed and accuracy under pressure');

    const passed = accuracy >= 60;
    session.score = accuracy;
    session.passed = passed;
    session.status = 'completed';
    session.performanceSummary = {
      totalQuestions,
      averageScore: accuracy,
      technicalAccuracy: accuracy,
      completeness: 100,
      communication: 90,
      strongAreas: strengths,
      needsImprovement
    };
    await session.save();

    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { $set: { interviewScore: accuracy } }
    );
    await refreshProfileReadiness(req.user.firebaseUid);

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        score: accuracy,
        totalQuestions,
        correctAnswers: correctCount,
        accuracy: `${accuracy}%`,
        passed,
        strengths,
        needsImprovement,
        categoryStats,
        questions: session.questions
      }
    });
  } catch (error) {
    console.error('completeAptitude error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 4. Start Technical Round for Company + Role
exports.startTechnical = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const gap = await SkillGap.findOne({ userId: req.user.firebaseUid });

    const company = req.body.company || profile?.dreamCompany || 'Google';
    const role = req.body.role || profile?.targetRole || 'Software Engineer';
    const resumeSkills = resume?.parsedData?.skills || resume?.atsAnalysis?.skillsFound || [];
    const skillGaps = gap?.skillsToImprove?.map(s => s.skill) || gap?.missingSkills || [];

    const plan = await companyInterviewService.researchInterviewProcess(company, role);
    const questions = await companyInterviewService.generateTechnicalQuestions(
      company,
      role,
      resumeSkills,
      skillGaps,
      plan
    );

    const session = await InterviewSession.create({
      userId: req.user.firebaseUid,
      companyName: company,
      normalizedCompanyName: company.toLowerCase().trim(),
      targetRole: role,
      round: 'technical',
      durationMinutes: 30,
      companyInterviewPlan: plan,
      questions: questions.map(q => ({
        questionId: q.id,
        topic: q.topic,
        category: 'Technical',
        questionText: q.questionText,
        options: [],
        correctAnswer: '',
        userAnswer: '',
        isCorrect: false,
        feedback: ''
      }))
    });

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        company,
        role,
        totalQuestions: session.questions.length,
        questions: session.questions
      }
    });
  } catch (error) {
    console.error('startTechnical error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 5. Evaluate Technical Answer
exports.evaluateTechnicalAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, question, answer, targetRole, company } = req.body;
    const evaluation = await aiService.gradeInterviewResponse({
      round: 'technical',
      question,
      answer,
      targetRole: targetRole || 'Software Engineer',
      company: company || 'Company'
    });

    if (sessionId) {
      await InterviewSession.updateOne(
        { _id: sessionId, "questions.questionId": questionId },
        {
          $set: {
            "questions.$.userAnswer": answer,
            "questions.$.evaluation": evaluation
          }
        }
      ).catch(() => {});
    }

    return res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('evaluateTechnicalAnswer error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 6. Complete Technical Round
exports.completeTechnical = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const evaluated = session.questions.filter(q => q.evaluation && typeof q.evaluation.score === 'number');
    const totalCount = evaluated.length || session.questions.length || 1;

    let scoreSum = 0;
    let accSum = 0;
    let compSum = 0;
    let commSum = 0;
    const strengths = new Set();
    const improvements = new Set();

    evaluated.forEach(q => {
      scoreSum += q.evaluation.score || 0;
      accSum += q.evaluation.technicalAccuracy || q.evaluation.score || 0;
      compSum += q.evaluation.completeness || q.evaluation.score || 0;
      commSum += q.evaluation.communication || q.evaluation.score || 0;
      if (q.evaluation.strengths) q.evaluation.strengths.forEach(s => strengths.add(s));
      if (q.evaluation.improvements) q.evaluation.improvements.forEach(i => improvements.add(i));
    });

    const averageScore = Math.round(scoreSum / totalCount) || 75;
    const technicalAccuracy = Math.round(accSum / totalCount) || 75;
    const completeness = Math.round(compSum / totalCount) || 75;
    const communication = Math.round(commSum / totalCount) || 75;
    const passed = averageScore >= 60;

    session.score = averageScore;
    session.passed = passed;
    session.status = 'completed';
    session.performanceSummary = {
      totalQuestions: session.questions.length,
      averageScore,
      technicalAccuracy,
      completeness,
      communication,
      strongAreas: Array.from(strengths).slice(0, 4),
      needsImprovement: Array.from(improvements).slice(0, 4)
    };
    await session.save();

    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { $set: { interviewScore: averageScore } }
    );
    await refreshProfileReadiness(req.user.firebaseUid);

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        averageScore,
        technicalAccuracy,
        completeness,
        communication,
        passed,
        recommendation: passed ? 'Ready' : 'Needs Improvement',
        strongAreas: session.performanceSummary.strongAreas,
        needsImprovement: session.performanceSummary.needsImprovement,
        questions: session.questions
      }
    });
  } catch (error) {
    console.error('completeTechnical error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 7. Generate Gemini Live Ephemeral Token (Secure backend minting)
exports.generateLiveToken = async (req, res) => {
  try {
    const { company, role } = req.body;
    const token = companyInterviewService.generateLiveToken(
      req.user.firebaseUid,
      company || 'Google',
      role || 'Software Engineer'
    );

    return res.json({
      success: true,
      data: {
        token,
        expiresIn: 7200,
        model: 'models/gemini-2.5-flash',
        company: company || 'Google',
        role: role || 'Software Engineer'
      }
    });
  } catch (error) {
    console.error('generateLiveToken error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 8. Start HR Round (Gemini Live Setup)
exports.startHR = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const company = req.body.company || profile?.dreamCompany || 'Google';
    const role = req.body.role || profile?.targetRole || 'Software Engineer';
    const plan = await companyInterviewService.researchInterviewProcess(company, role);

    const initialWelcome = `Hello! Welcome to your HR interview for the ${role} position at ${company}. Let's begin — could you please introduce yourself and tell me what drives your interest in engineering?`;

    const audioUrl = await companyInterviewService.synthesizeSpeech(initialWelcome);

    const session = await InterviewSession.create({
      userId: req.user.firebaseUid,
      companyName: company,
      normalizedCompanyName: company.toLowerCase().trim(),
      targetRole: role,
      round: 'hr',
      durationMinutes: 20,
      companyInterviewPlan: plan,
      transcript: [
        {
          role: 'ai',
          content: initialWelcome,
          audioUrl
        }
      ]
    });

    const liveToken = companyInterviewService.generateLiveToken(req.user.firebaseUid, company, role);

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        company,
        role,
        liveToken,
        initialQuestion: initialWelcome,
        audioUrl,
        transcript: session.transcript
      }
    });
  } catch (error) {
    console.error('startHR error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 9. Real-Time HR Live Dialogue Exchange
exports.handleHRLiveExchange = async (req, res) => {
  try {
    const { sessionId, company, role, userMessage, history } = req.body;
    const audioBuffer = req.file?.buffer || null;

    let parsedHistory = [];
    if (history) {
      parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
    }

    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const exchange = await companyInterviewService.handleHRLiveExchange({
      companyName: company || 'Google',
      targetRole: role || 'Software Engineer',
      userMessage,
      history: parsedHistory,
      audioBuffer,
      candidateProfile: {
        name: req.user.name || profile?.name || 'Candidate',
        degree: profile?.degree || 'B.Tech'
      }
    });

    // Save transcript into MongoDB session
    if (sessionId) {
      await InterviewSession.findByIdAndUpdate(sessionId, {
        $push: {
          transcript: {
            $each: [
              { role: 'user', content: exchange.userText },
              { role: 'ai', content: exchange.replyText, audioUrl: exchange.audioUrl }
            ]
          }
        }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error('handleHRLiveExchange error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 10. Single HR Answer Evaluation (Alternative / Form flow)
exports.evaluateHRAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, question, answer, targetRole, company } = req.body;
    const evaluation = await aiService.gradeInterviewResponse({
      round: 'hr',
      question,
      answer,
      targetRole: targetRole || 'Software Engineer',
      company: company || 'Company'
    });

    if (sessionId) {
      await InterviewSession.updateOne(
        { _id: sessionId, "questions.questionId": questionId },
        {
          $set: {
            "questions.$.userAnswer": answer,
            "questions.$.evaluation": evaluation
          }
        }
      ).catch(() => {});
    }

    return res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('evaluateHRAnswer error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 11. Complete HR Interview & Generate Final Comprehensive Report
exports.completeHR = async (req, res) => {
  try {
    const { sessionId, company, role } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const companyName = company || session.companyName || 'Google';
    const targetRole = role || session.targetRole || 'Software Engineer';

    // Retrieve previous rounds for candidate
    const latestAptitude = await InterviewSession.findOne({
      userId: req.user.firebaseUid,
      round: 'aptitude',
      status: 'completed'
    }).sort({ createdAt: -1 });

    const latestTechnical = await InterviewSession.findOne({
      userId: req.user.firebaseUid,
      round: 'technical',
      status: 'completed'
    }).sort({ createdAt: -1 });

    const plan = await companyInterviewService.researchInterviewProcess(companyName, targetRole);

    const finalReport = await companyInterviewService.generateFinalReport({
      companyName,
      targetRole,
      aptitudeScore: latestAptitude?.score || 70,
      technicalScore: latestTechnical?.score || 75,
      hrDialogue: session.transcript || [],
      technicalQuestions: latestTechnical?.questions || [],
      plan
    });

    session.score = finalReport.overallScore;
    session.passed = finalReport.overallScore >= 60;
    session.status = 'completed';
    session.finalReport = finalReport;
    session.performanceSummary = {
      totalQuestions: session.transcript.length,
      averageScore: finalReport.overallScore,
      communication: finalReport.communicationScore,
      confidence: finalReport.confidenceScore,
      completeness: finalReport.answerQualityScore,
      technicalAccuracy: finalReport.roleUnderstandingScore,
      strongAreas: finalReport.whatYouDidWell,
      needsImprovement: finalReport.whatYouShouldImprove
    };
    await session.save();

    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { $set: { interviewScore: finalReport.overallScore } }
    );
    await refreshProfileReadiness(req.user.firebaseUid);

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        finalReport,
        transcript: session.transcript
      }
    });
  } catch (error) {
    console.error('completeHR error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 12. Explicit Final Report Generator
exports.generateFinalReport = async (req, res) => {
  try {
    const { company, role, aptitudeSessionId, technicalSessionId, hrSessionId } = req.body;
    const companyName = company || 'Google';
    const targetRole = role || 'Software Engineer';

    const aptSession = aptitudeSessionId ? await InterviewSession.findById(aptitudeSessionId) : null;
    const techSession = technicalSessionId ? await InterviewSession.findById(technicalSessionId) : null;
    const hrSession = hrSessionId ? await InterviewSession.findById(hrSessionId) : null;

    const plan = await companyInterviewService.researchInterviewProcess(companyName, targetRole);
    const finalReport = await companyInterviewService.generateFinalReport({
      companyName,
      targetRole,
      aptitudeScore: aptSession?.score || 70,
      technicalScore: techSession?.score || 75,
      hrDialogue: hrSession?.transcript || [],
      technicalQuestions: techSession?.questions || [],
      plan
    });

    return res.json({ success: true, data: finalReport });
  } catch (error) {
    console.error('generateFinalReport error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 13. Get Interview History for Company & Role (with analytics & trend)
exports.getInterviewHistory = async (req, res) => {
  try {
    const company = req.query.company;
    const query = { userId: req.user.firebaseUid, status: 'completed' };
    if (company) query.normalizedCompanyName = company.toLowerCase().trim();

    // Fetch all completed sessions for this user
    const sessions = await InterviewSession.find(query).sort({ createdAt: -1 });

    const latestAptitude = sessions.find(s => s.round === 'aptitude');
    const latestTechnical = sessions.find(s => s.round === 'technical');
    const latestHR = sessions.find(s => s.round === 'hr');

    // Compute historical analytics
    const totalSessions = sessions.length;
    let totalScoreSum = 0;
    let bestScore = 0;
    let latestScore = 0;
    let techScoreSum = 0;
    let commScoreSum = 0;

    const historyCards = sessions.map(s => {
      const sScore = s.overallScore || s.score || (s.finalReport?.overallScore) || 70;
      totalScoreSum += sScore;
      if (sScore > bestScore) bestScore = sScore;
      
      const tech = s.performanceSummary?.technicalAccuracy || s.finalReport?.technicalKnowledgeScore || sScore;
      const comm = s.performanceSummary?.communication || s.finalReport?.communicationScore || 75;
      techScoreSum += tech;
      commScoreSum += comm;

      return {
        sessionId: s._id,
        company: s.companyName,
        role: s.targetRole,
        date: s.createdAt,
        overallScore: sScore,
        roundsCount: s.rounds?.length || (s.finalReport?.roundBreakdown?.length) || 3,
        questionsCount: s.questions?.length || s.performanceSummary?.totalQuestions || 5,
        correctAnswers: s.correctCount || s.questions?.filter(q => q.isCorrect).length || 0,
        incorrectAnswers: s.incorrectCount || s.questions?.filter(q => !q.isCorrect && q.userAnswer).length || 0,
        performanceLevel: s.performanceLevel || s.finalReport?.readinessRating || (sScore >= 75 ? 'Ready' : 'Needs Improvement'),
        passed: s.passed || sScore >= 60
      };
    });

    if (historyCards.length > 0) {
      latestScore = historyCards[0].overallScore;
    }

    const averageScore = totalSessions > 0 ? Math.round(totalScoreSum / totalSessions) : 0;
    const oldestScore = historyCards.length > 1 ? historyCards[historyCards.length - 1].overallScore : latestScore;
    const improvement = oldestScore > 0 ? Math.round(((latestScore - oldestScore) / oldestScore) * 100) : 0;

    // Performance trend chronological (oldest to newest)
    const trend = [...historyCards].reverse().map((h, idx) => ({
      interviewIndex: idx + 1,
      label: `Interview ${idx + 1}`,
      company: h.company,
      date: h.date,
      overallScore: h.overallScore
    }));

    return res.json({
      success: true,
      data: {
        aptitude: latestAptitude,
        technical: latestTechnical,
        hr: latestHR,
        finalReport: latestHR?.finalReport || sessions[0]?.finalReport || null,
        analytics: {
          totalInterviews: totalSessions,
          averageScore,
          bestScore,
          latestScore,
          improvementPercentage: improvement,
          technicalAverage: totalSessions > 0 ? Math.round(techScoreSum / totalSessions) : 0,
          communicationAverage: totalSessions > 0 ? Math.round(commScoreSum / totalSessions) : 0,
          trend
        },
        sessions: historyCards
      }
    });
  } catch (error) {
    console.error('getInterviewHistory error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 14. Get Detailed Report for a Specific Completed Session
exports.getSessionReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.user.firebaseUid
    });

    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Interview session not found.' } });
    }

    return res.json({
      success: true,
      data: {
        session,
        finalReport: session.finalReport || null,
        questions: session.questions || [],
        rounds: session.rounds || [],
        transcript: session.transcript || []
      }
    });
  } catch (error) {
    console.error('getSessionReport error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 15. START UNIFIED MULTI-ROUND INTERVIEW SESSION (Role + Company Dependent)
exports.startLiveSession = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const company = req.body.company || profile?.dreamCompany || 'TCS';
    const role = req.body.role || profile?.targetRole || 'Software Developer';
    const isRetake = Boolean(req.body.isRetake);
    const previousSessionId = req.body.previousSessionId || null;

    // 1. Gather historical weaknesses and mistakes for personalization
    let previousMistakes = [];
    let pastSessions = await InterviewSession.find({
      userId: req.user.firebaseUid,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(3);

    pastSessions.forEach(ps => {
      if (Array.isArray(ps.weakTopics)) previousMistakes.push(...ps.weakTopics);
      if (ps.finalReport?.frequentMistakes) previousMistakes.push(...ps.finalReport.frequentMistakes);
      (ps.questions || []).forEach(q => {
        if (!q.isCorrect && Array.isArray(q.mistakes)) {
          previousMistakes.push(...q.mistakes);
        }
      });
    });
    previousMistakes = Array.from(new Set(previousMistakes)).slice(0, 5);

    // 2. Fetch or dynamically generate rounds based on Company + Role
    const plan = await companyInterviewService.researchInterviewProcess(company, role);
    const rounds = plan.rounds || companyInterviewService.buildDynamicRounds(company, role);

    const firstRound = rounds[0] || {
      roundKey: 'technical',
      roundNumber: 1,
      name: 'Technical Competency Round',
      durationMinutes: 25,
      questionCount: 5,
      topics: ['Fundamentals']
    };

    // 3. Generate initial question for first round
    const initialQuestion = await companyInterviewService.generateAdaptiveQuestion({
      companyName: company,
      targetRole: role,
      roundKey: firstRound.roundKey,
      questionIndex: 0,
      previousMistakes
    });

    // 4. Create master session in MongoDB
    const session = await InterviewSession.create({
      userId: req.user.firebaseUid,
      companyName: company,
      normalizedCompanyName: company.toLowerCase().trim(),
      targetRole: role,
      normalizedRole: role.toLowerCase().trim(),
      round: firstRound.roundKey,
      currentRoundKey: firstRound.roundKey,
      currentRoundNumber: 1,
      rounds: rounds.map(r => ({
        roundKey: r.roundKey,
        roundNumber: r.roundNumber,
        name: r.name,
        description: r.description,
        roundType: r.roundType || r.roundKey,
        evidenceType: r.evidenceType || 'AI-generated based on hiring patterns',
        durationMinutes: r.durationMinutes || 20,
        questionCount: r.questionCount || 5,
        topics: r.reportedTopics || r.topics || [],
        passThreshold: r.passThreshold || 60,
        status: r.roundKey === firstRound.roundKey ? 'in_progress' : 'pending',
        score: 0,
        feedback: ''
      })),
      questions: [{
        questionId: initialQuestion.questionId,
        roundKey: firstRound.roundKey,
        round: firstRound.roundKey,
        questionText: initialQuestion.questionText,
        topic: initialQuestion.topic,
        topics: [initialQuestion.topic],
        expectedKeyPoints: initialQuestion.expectedKeyPoints,
        difficulty: initialQuestion.difficulty,
        practiceTopic: initialQuestion.practiceTopic,
        timestamp: new Date()
      }],
      transcript: [{
        role: 'ai',
        roundKey: firstRound.roundKey,
        content: initialQuestion.questionText,
        audioUrl: initialQuestion.audioUrl,
        timestamp: new Date()
      }],
      companyInterviewPlan: plan,
      isRetake,
      previousSessionId,
      status: 'in_progress'
    });

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        company,
        role,
        rounds: session.rounds,
        currentRound: session.rounds[0],
        currentQuestion: initialQuestion,
        previousMistakesIncorporated: previousMistakes.length > 0
      }
    });
  } catch (error) {
    console.error('startLiveSession error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 16. GET NEXT ADAPTIVE QUESTION IN SESSION
exports.getNextLiveQuestion = async (req, res) => {
  try {
    const { sessionId, roundKey, previousAnswer } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const currentRound = session.rounds.find(r => r.roundKey === roundKey) || session.rounds[0];
    const roundQuestions = session.questions.filter(q => q.roundKey === roundKey);
    const questionIndex = roundQuestions.length;

    // Check if round limit reached
    const maxQuestions = currentRound?.questionCount || 5;
    if (questionIndex >= maxQuestions) {
      return res.json({
        success: true,
        data: {
          isRoundFinished: true,
          roundKey,
          message: 'All questions for this round have been completed.'
        }
      });
    }

    const nextQ = await companyInterviewService.generateAdaptiveQuestion({
      companyName: session.companyName,
      targetRole: session.targetRole,
      roundKey,
      questionIndex,
      previousQuestions: roundQuestions,
      previousMistakes: session.weakTopics || [],
      candidateLastAnswer: previousAnswer || ''
    });

    session.questions.push({
      questionId: nextQ.questionId,
      roundKey,
      round: roundKey,
      questionText: nextQ.questionText,
      topic: nextQ.topic,
      topics: [nextQ.topic],
      expectedKeyPoints: nextQ.expectedKeyPoints,
      difficulty: nextQ.difficulty,
      practiceTopic: nextQ.practiceTopic,
      timestamp: new Date()
    });

    session.transcript.push({
      role: 'ai',
      roundKey,
      content: nextQ.questionText,
      audioUrl: nextQ.audioUrl,
      timestamp: new Date()
    });

    await session.save();

    return res.json({
      success: true,
      data: {
        isRoundFinished: false,
        question: nextQ,
        questionIndex: questionIndex + 1,
        totalQuestions: maxQuestions
      }
    });
  } catch (error) {
    console.error('getNextLiveQuestion error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 17. EVALUATE LIVE ANSWER & GIVE COACHING FEEDBACK
exports.evaluateLiveAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, roundKey, question, answer } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const evaluation = await companyInterviewService.evaluateAnswerWithCoaching({
      companyName: session.companyName,
      targetRole: session.targetRole,
      roundKey: roundKey || session.currentRoundKey,
      question,
      answer,
      previousMistakes: session.weakTopics || []
    });

    // Update the question entry in session
    const qIdx = session.questions.findIndex(q => q.questionId === questionId);
    if (qIdx !== -1) {
      session.questions[qIdx].userAnswer = answer;
      session.questions[qIdx].answerTranscript = answer;
      session.questions[qIdx].isCorrect = evaluation.isCorrect;
      session.questions[qIdx].score = evaluation.score;
      session.questions[qIdx].feedback = evaluation.spokenFeedback;
      session.questions[qIdx].mistakes = evaluation.mistakes;
      session.questions[qIdx].correctedExplanation = evaluation.correctedExplanation;
      session.questions[qIdx].practiceTopic = evaluation.practiceTopic;
      session.questions[qIdx].evaluation = evaluation;
    } else {
      session.questions.push({
        questionId: questionId || `q_${Date.now()}`,
        roundKey: roundKey || session.currentRoundKey,
        questionText: question,
        userAnswer: answer,
        answerTranscript: answer,
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.spokenFeedback,
        mistakes: evaluation.mistakes,
        correctedExplanation: evaluation.correctedExplanation,
        practiceTopic: evaluation.practiceTopic,
        evaluation
      });
    }

    // Append to transcript
    session.transcript.push({
      role: 'user',
      roundKey: roundKey || session.currentRoundKey,
      content: answer,
      timestamp: new Date()
    });

    if (evaluation.spokenFeedback) {
      session.transcript.push({
        role: 'ai',
        roundKey: roundKey || session.currentRoundKey,
        content: evaluation.spokenFeedback,
        audioUrl: evaluation.audioUrl,
        timestamp: new Date()
      });
    }

    // Update counts
    if (evaluation.isCorrect) {
      session.correctCount = (session.correctCount || 0) + 1;
    } else if (evaluation.isPartiallyCorrect) {
      session.partiallyCorrectCount = (session.partiallyCorrectCount || 0) + 1;
    } else {
      session.incorrectCount = (session.incorrectCount || 0) + 1;
      if (evaluation.practiceTopic && !session.weakTopics.includes(evaluation.practiceTopic)) {
        session.weakTopics.push(evaluation.practiceTopic);
      }
    }

    await session.save();

    return res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('evaluateLiveAnswer error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 18. COMPLETE LIVE ROUND & TRANSITION SMOOTHLY
exports.completeLiveRound = async (req, res) => {
  try {
    const { sessionId, roundKey } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    const roundQuestions = session.questions.filter(q => q.roundKey === roundKey);
    let roundScoreSum = 0;
    let answeredCount = 0;

    roundQuestions.forEach(q => {
      if (typeof q.score === 'number' && q.userAnswer) {
        roundScoreSum += q.score;
        answeredCount += 1;
      }
    });

    const roundScore = answeredCount > 0 ? Math.round(roundScoreSum / answeredCount) : 75;

    // Update round status in session
    const rIdx = session.rounds.findIndex(r => r.roundKey === roundKey);
    if (rIdx !== -1) {
      session.rounds[rIdx].status = 'completed';
      session.rounds[rIdx].score = roundScore;
      session.rounds[rIdx].feedback = roundScore >= 65 
        ? `Solid performance in ${session.rounds[rIdx].name}. Keep maintaining your structured explanations.`
        : `Completed ${session.rounds[rIdx].name}. Review core trade-offs and deepen technical reasoning.`;
    }

    // Determine next round
    const nextRoundIndex = session.rounds.findIndex(r => r.status === 'pending');
    let nextRound = null;
    let isInterviewComplete = false;

    if (nextRoundIndex !== -1) {
      nextRound = session.rounds[nextRoundIndex];
      session.rounds[nextRoundIndex].status = 'in_progress';
      session.currentRoundKey = nextRound.roundKey;
      session.currentRoundNumber = nextRoundIndex + 1;
    } else {
      isInterviewComplete = true;
    }

    await session.save();

    return res.json({
      success: true,
      data: {
        roundCompleted: true,
        roundKey,
        roundScore,
        roundFeedback: session.rounds[rIdx]?.feedback || '',
        nextRound,
        isInterviewComplete
      }
    });
  } catch (error) {
    console.error('completeLiveRound error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 19. COMPLETE LIVE INTERVIEW & GENERATE FULL FINAL REPORT
exports.completeLiveInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found' } });
    }

    // Collect all round scores
    const completedRounds = session.rounds.filter(r => r.status === 'completed');
    let overallScoreSum = 0;
    completedRounds.forEach(r => { overallScoreSum += r.score || 0; });
    const overallScore = completedRounds.length > 0 ? Math.round(overallScoreSum / completedRounds.length) : (session.score || 75);

    // Filter incorrect or partially correct questions for the dedicated "Needs Improvement" section
    const needsImprovementQuestions = session.questions
      .filter(q => (!q.isCorrect || q.score < 65) && q.userAnswer)
      .map(q => ({
        questionId: q.questionId,
        question: q.questionText,
        roundKey: q.roundKey,
        userAnswer: q.userAnswer,
        whatWasWrong: Array.isArray(q.mistakes) && q.mistakes.length > 0 ? q.mistakes.join('; ') : 'Explanation lacked technical precision or missed the core concept.',
        correctConcept: q.correctedExplanation || 'Organized data structures and standard software engineering patterns.',
        aiExplanation: q.feedback || q.correctedExplanation || '',
        practiceTopic: q.practiceTopic || q.topic || 'Core Fundamentals'
      }));

    // AI Final Report Generation
    const finalReport = await companyInterviewService.generateFinalReport({
      companyName: session.companyName,
      targetRole: session.targetRole,
      aptitudeScore: session.rounds.find(r => r.roundKey === 'aptitude')?.score || 70,
      technicalScore: session.rounds.find(r => r.roundKey === 'technical')?.score || overallScore,
      hrDialogue: session.transcript || [],
      technicalQuestions: session.questions || [],
      plan: session.companyInterviewPlan
    });

    finalReport.overallScore = overallScore;
    finalReport.needsImprovementQuestions = needsImprovementQuestions;
    finalReport.roundBreakdown = session.rounds.map(r => ({
      roundKey: r.roundKey,
      name: r.name,
      score: r.score,
      status: r.status,
      feedback: r.feedback
    }));

    session.overallScore = overallScore;
    session.score = overallScore;
    session.passed = overallScore >= 60;
    session.performanceLevel = overallScore >= 75 ? 'Ready' : (overallScore >= 60 ? 'Needs Improvement' : 'Strong Preparation Needed');
    session.status = 'completed';
    session.finalReport = finalReport;
    session.performanceSummary = {
      totalQuestions: session.questions.length,
      averageScore: overallScore,
      technicalAccuracy: finalReport.roleUnderstandingScore || overallScore,
      completeness: finalReport.answerQualityScore || overallScore,
      communication: finalReport.communicationScore || 78,
      confidence: finalReport.confidenceScore || 75,
      strongAreas: finalReport.whatYouDidWell || [],
      needsImprovement: finalReport.whatYouShouldImprove || []
    };

    await session.save();

    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { $set: { interviewScore: overallScore } }
    );
    await refreshProfileReadiness(req.user.firebaseUid);

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        finalReport,
        session
      }
    });
  } catch (error) {
    console.error('completeLiveInterview error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 20. GENERATE PRACTICE QUESTIONS FOR WEAK AREAS (AI Coach Mode)
exports.getPracticeWeakAreas = async (req, res) => {
  try {
    const { sessionId, role, company } = req.body;
    let session = null;
    if (sessionId) {
      session = await InterviewSession.findById(sessionId);
    }

    const targetRole = role || session?.targetRole || 'Software Developer';
    const targetCompany = company || session?.companyName || 'TCS';

    let weakTopics = session?.weakTopics || [];
    let mistakes = [];

    if (session?.questions) {
      session.questions.forEach(q => {
        if (!q.isCorrect && Array.isArray(q.mistakes)) {
          mistakes.push(...q.mistakes);
        }
      });
    }

    const practiceQuestions = await companyInterviewService.generatePracticeQuestions({
      weakTopics,
      mistakes,
      targetRole,
      companyName: targetCompany
    });

    return res.json({
      success: true,
      data: {
        company: targetCompany,
        role: targetRole,
        questions: practiceQuestions
      }
    });
  } catch (error) {
    console.error('getPracticeWeakAreas error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 21. EVALUATE PRACTICE ANSWER
exports.evaluatePracticeAnswer = async (req, res) => {
  try {
    const { question, answer, topic, targetRole, company } = req.body;
    const evaluation = await companyInterviewService.evaluateAnswerWithCoaching({
      companyName: company || 'TCS',
      targetRole: targetRole || 'Software Developer',
      roundKey: 'practice',
      question,
      answer
    });

    return res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('evaluatePracticeAnswer error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

