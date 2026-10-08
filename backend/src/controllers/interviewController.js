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

// 13. Get Interview History for Company & Role
exports.getInterviewHistory = async (req, res) => {
  try {
    const company = req.query.company;
    const query = { userId: req.user.firebaseUid, status: 'completed' };
    if (company) query.normalizedCompanyName = company.toLowerCase().trim();

    const latestAptitude = await InterviewSession.findOne({ ...query, round: 'aptitude' }).sort({ createdAt: -1 });
    const latestTechnical = await InterviewSession.findOne({ ...query, round: 'technical' }).sort({ createdAt: -1 });
    const latestHR = await InterviewSession.findOne({ ...query, round: 'hr' }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        aptitude: latestAptitude,
        technical: latestTechnical,
        hr: latestHR,
        finalReport: latestHR?.finalReport || null
      }
    });
  } catch (error) {
    console.error('getInterviewHistory error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
