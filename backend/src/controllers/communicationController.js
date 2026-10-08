const communicationService = require('../services/communicationService');
const CommunicationSession = require('../models/CommunicationSession');

// 1. Generate Reading Practice Passage
exports.generateReadingPassage = async (req, res) => {
  try {
    const { level = 'Beginner', topic = 'College Life' } = req.body;
    const passageData = await communicationService.generateReadingPassage({ level, topic });
    return res.json({ success: true, data: passageData });
  } catch (err) {
    console.error('Error generating reading passage:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to generate reading passage.' } });
  }
};

// 2. Analyze Reading Speech (Expected vs Spoken)
exports.analyzeReadingSpeech = async (req, res) => {
  try {
    const userId = req.user?.firebaseUid || req.user?._id || 'guest_user';
    const { expectedText, spokenText: providedSpoken, level = 'Beginner', topic = 'Reading Practice', durationSeconds = 30 } = req.body;

    let spokenText = providedSpoken || '';
    let audioUrl = null;

    // If an audio file was uploaded with multipart/form-data
    if (req.file && req.file.buffer) {
      const transcribed = await communicationService.transcribeAudio(req.file.buffer, req.file.mimetype);
      if (transcribed) {
        spokenText = transcribed;
      }
      // Optionally store in Cloudinary if configured
      audioUrl = await communicationService.uploadAudioToCloudinary(req.file.buffer, `reading_${userId}`);
    }

    if (!expectedText) {
      return res.status(400).json({ success: false, error: { message: 'Expected passage text is required for analysis.' } });
    }

    const analysis = await communicationService.analyzeReadingSpeech({
      expectedText,
      spokenText,
      level,
      durationSeconds: Number(durationSeconds) || 30
    });

    // Save session to MongoDB for real progress tracking
    const session = await CommunicationSession.create({
      userId,
      sessionType: 'reading',
      level,
      topic,
      expectedText,
      transcript: spokenText,
      scores: {
        fluency: analysis.fluencyScore,
        grammar: analysis.grammarScore,
        vocabulary: analysis.grammarScore, // correlated
        accuracy: analysis.accuracyScore,
        pronunciation: analysis.pronunciationScore,
        overall: Math.round((analysis.fluencyScore + analysis.grammarScore + analysis.accuracyScore + analysis.pronunciationScore) / 4)
      },
      speakingSpeed: analysis.speakingSpeed,
      mistakes: (analysis.mistakes || []).map(m => ({
        spoken: m.spoken,
        correct: m.correct,
        explanation: m.explanation,
        type: m.type || 'grammar',
        resolved: false
      })),
      wordsToPractice: analysis.wordsToPractice || [],
      suggestions: analysis.suggestions || [],
      durationSeconds: Number(durationSeconds) || 30,
      audioUrl,
      status: 'completed'
    });

    return res.json({
      success: true,
      data: {
        ...analysis,
        transcript: spokenText,
        sessionId: session._id
      }
    });
  } catch (err) {
    console.error('Error analyzing reading speech:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to analyze speech at this moment.' } });
  }
};

// 3. Conversation Message Handler (Spoken Dialogue)
exports.handleConversationMessage = async (req, res) => {
  try {
    const { history = '[]', studentMessage: providedMessage, level = 'Beginner', topic = 'College Life' } = req.body;

    let parsedHistory = [];
    if (typeof history === 'string') {
      try { parsedHistory = JSON.parse(history); } catch (e) { parsedHistory = []; }
    } else if (Array.isArray(history)) {
      parsedHistory = history;
    }

    let studentMessage = providedMessage || '';

    // If audio file was uploaded for conversation
    if (req.file && req.file.buffer) {
      const transcribed = await communicationService.transcribeAudio(req.file.buffer, req.file.mimetype);
      if (transcribed) {
        studentMessage = transcribed;
      }
    }

    if (!studentMessage || !studentMessage.trim()) {
      return res.status(400).json({ success: false, error: { message: 'No student speech detected. Please speak clearly into the microphone.' } });
    }

    const replyData = await communicationService.generateConversationReply({
      history: parsedHistory,
      studentMessage: studentMessage.trim(),
      level,
      topic
    });

    // Synthesize audio voice for AI reply
    const audioBase64 = await communicationService.synthesizeSpeech(replyData.reply);

    return res.json({
      success: true,
      data: {
        studentMessage: studentMessage.trim(),
        reply: replyData.reply,
        subtleCorrection: replyData.subtleCorrection,
        encouragement: replyData.encouragement,
        audioUrl: audioBase64
      }
    });
  } catch (err) {
    console.error('Error handling conversation message:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to process conversation message.' } });
  }
};

// 4. Generate End-of-Session Conversation Feedback
exports.generateConversationFeedback = async (req, res) => {
  try {
    const userId = req.user?.firebaseUid || req.user?._id || 'guest_user';
    const { history = [], level = 'Beginner', topic = 'Conversation Practice', durationSeconds = 60 } = req.body;

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Conversation history is required for feedback.' } });
    }

    const feedback = await communicationService.generateConversationFeedback({ history, level, topic });

    // Save session in MongoDB
    const session = await CommunicationSession.create({
      userId,
      sessionType: 'conversation',
      level,
      topic,
      scores: feedback.scores,
      mistakes: (feedback.mistakes || []).map(m => ({
        spoken: m.spoken,
        correct: m.better || m.correct,
        explanation: m.explanation,
        type: m.type || 'grammar',
        resolved: false
      })),
      suggestions: feedback.recommendedPractice || [],
      conversationMessages: history.map(h => ({
        role: h.role,
        content: h.content,
        timestamp: h.timestamp || new Date()
      })),
      durationSeconds: Number(durationSeconds) || 60,
      status: 'completed'
    });

    return res.json({
      success: true,
      data: {
        ...feedback,
        sessionId: session._id
      }
    });
  } catch (err) {
    console.error('Error generating conversation feedback:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to generate conversation feedback.' } });
  }
};

// 5. Evaluate Practice My Mistakes Attempt
exports.evaluatePractice = async (req, res) => {
  try {
    const { originalMistake, expectedCorrection, studentSpoken: providedSpoken, mistakeId } = req.body;

    let studentSpoken = providedSpoken || '';
    if (req.file && req.file.buffer) {
      const transcribed = await communicationService.transcribeAudio(req.file.buffer, req.file.mimetype);
      if (transcribed) studentSpoken = transcribed;
    }

    if (!studentSpoken || !studentSpoken.trim()) {
      return res.status(400).json({ success: false, error: { message: 'No speech detected. Please try speaking again.' } });
    }

    const evaluation = await communicationService.evaluatePracticeAttempt({
      originalMistake,
      expectedCorrection,
      studentSpoken: studentSpoken.trim()
    });

    // If marked as improved and mistakeId provided, mark as resolved in DB
    if (evaluation.improved && mistakeId) {
      CommunicationSession.updateOne(
        { 'mistakes._id': mistakeId },
        { $set: { 'mistakes.$.resolved': true } }
      ).catch(() => {});
    }

    return res.json({
      success: true,
      data: {
        ...evaluation,
        studentSpoken: studentSpoken.trim()
      }
    });
  } catch (err) {
    console.error('Error evaluating practice attempt:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to evaluate practice attempt.' } });
  }
};

// 6. Speech-to-Text Upload Utility
exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: { message: 'Audio file is required.' } });
    }

    const transcript = await communicationService.transcribeAudio(req.file.buffer, req.file.mimetype);
    return res.json({ success: true, data: { transcript } });
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return res.status(500).json({ success: false, error: { message: 'Speech recognition failed.' } });
  }
};

// 7. Text-to-Speech Synthesis Utility
exports.synthesizeSpeech = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Text is required for speech synthesis.' } });
    }

    const audioUrl = await communicationService.synthesizeSpeech(text.trim());
    return res.json({ success: true, data: { audioUrl } });
  } catch (err) {
    console.error('Error synthesizing speech:', err);
    return res.status(500).json({ success: false, error: { message: 'Speech synthesis failed.' } });
  }
};

// 8. Get Real Student Communication Progress
exports.getProgress = async (req, res) => {
  try {
    const userId = req.user?.firebaseUid || req.user?._id || 'guest_user';

    const sessions = await CommunicationSession.find({ userId }).sort({ createdAt: -1 }).lean();

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalSessions: 0,
          readingSessionsCount: 0,
          conversationSessionsCount: 0,
          averageScores: {
            fluency: 0,
            grammar: 0,
            vocabulary: 0,
            accuracy: 0,
            overall: 0
          },
          recentSessions: [],
          unresolvedMistakes: [],
          weakAreas: ['Vocabulary enrichment', 'Pronunciation rhythm', 'Speaking fluency'],
          recommendedPractice: [
            'Start with Reading Practice to build vocal confidence.',
            'Engage in a 5-minute daily conversation with the AI coach.'
          ]
        }
      });
    }

    let sumFluency = 0;
    let sumGrammar = 0;
    let sumVocab = 0;
    let sumAccuracy = 0;
    let sumOverall = 0;

    let readingCount = 0;
    let conversationCount = 0;

    const allMistakes = [];

    sessions.forEach(s => {
      if (s.sessionType === 'reading') readingCount++;
      if (s.sessionType === 'conversation') conversationCount++;

      const sc = s.scores || {};
      sumFluency += sc.fluency || 0;
      sumGrammar += sc.grammar || 0;
      sumVocab += sc.vocabulary || 0;
      sumAccuracy += sc.accuracy || 0;
      sumOverall += sc.overall || 0;

      if (Array.isArray(s.mistakes)) {
        s.mistakes.forEach(m => {
          if (!m.resolved) {
            allMistakes.push({
              _id: m._id,
              sessionId: s._id,
              spoken: m.spoken,
              correct: m.correct,
              explanation: m.explanation,
              type: m.type || 'grammar',
              sessionTopic: s.topic,
              date: s.createdAt
            });
          }
        });
      }
    });

    const count = sessions.length;
    const averageScores = {
      fluency: Math.min(100, Math.round(sumFluency / count)),
      grammar: Math.min(100, Math.round(sumGrammar / count)),
      vocabulary: Math.min(100, Math.round(sumVocab / count)),
      accuracy: Math.min(100, Math.round(sumAccuracy / count)),
      overall: Math.min(100, Math.round(sumOverall / count))
    };

    // Calculate weak areas based on lowest averages
    const scorePairs = [
      { area: 'Speaking Fluency & Pacing', score: averageScores.fluency },
      { area: 'Grammar & Sentence Structures', score: averageScores.grammar },
      { area: 'Professional Vocabulary', score: averageScores.vocabulary },
      { area: 'Pronunciation Accuracy', score: averageScores.accuracy }
    ].sort((a, b) => a.score - b.score);

    const weakAreas = scorePairs.slice(0, 2).map(p => p.area);

    const recommendedPractice = [
      'Practice daily conversation with the AI coach on technical & campus topics.',
      'Read passages aloud daily to reinforce pronunciation and pacing.',
      'Use the "Practice My Mistakes" loop to eliminate recurring grammar habits.'
    ];

    return res.json({
      success: true,
      data: {
        totalSessions: count,
        readingSessionsCount: readingCount,
        conversationSessionsCount: conversationCount,
        averageScores,
        recentSessions: sessions.slice(0, 8).map(s => ({
          _id: s._id,
          sessionType: s.sessionType,
          level: s.level,
          topic: s.topic,
          overallScore: s.scores?.overall || 0,
          date: s.createdAt,
          durationSeconds: s.durationSeconds
        })),
        unresolvedMistakes: allMistakes.slice(0, 10),
        weakAreas,
        recommendedPractice
      }
    });
  } catch (err) {
    console.error('Error retrieving communication progress:', err);
    return res.status(500).json({ success: false, error: { message: 'Unable to retrieve communication progress.' } });
  }
};
