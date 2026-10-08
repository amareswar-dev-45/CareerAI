const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  companyName: { type: String, default: 'TCS' },
  normalizedCompanyName: { type: String, default: 'tcs' },
  targetRole: { type: String, default: 'Software Developer' },
  normalizedRole: { type: String, default: 'software developer' },
  round: { type: String, default: 'technical' }, // legacy / primary round key
  currentRoundKey: { type: String, default: 'technical' },
  currentRoundNumber: { type: Number, default: 1 },
  rounds: [{
    roundKey: { type: String, required: true },
    roundNumber: { type: Number, default: 1 },
    name: { type: String, required: true },
    description: String,
    roundType: { type: String, default: 'technical' },
    evidenceType: { type: String, default: 'AI-generated based on hiring patterns' },
    durationMinutes: { type: Number, default: 20 },
    questionCount: { type: Number, default: 5 },
    topics: [{ type: String }],
    passThreshold: { type: Number, default: 60 },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
    score: { type: Number, default: 0 },
    feedback: { type: String, default: '' }
  }],
  score: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  performanceLevel: { type: String, default: 'Needs Improvement' }, // 'Ready' | 'Needs Improvement' | 'Exceptional'
  passed: { type: Boolean, default: false },
  correctCount: { type: Number, default: 0 },
  partiallyCorrectCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  weakTopics: [{ type: String }],
  strongTopics: [{ type: String }],
  topicScores: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  questions: [{
    questionId: String,
    round: String,
    roundKey: String,
    category: String,
    topic: String,
    topics: [{ type: String }],
    questionText: String,
    questionType: { type: String, default: 'conceptual' },
    difficulty: { type: String, default: 'Medium' },
    options: [{ type: String }],
    correctAnswer: String,
    userAnswer: String,
    answerTranscript: String,
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    feedback: String,
    mistakes: [{ type: String }],
    correctedExplanation: String,
    practiceTopic: String,
    timestamp: { type: Date, default: Date.now },
    evaluation: {
      score: Number,
      correctness: Number,
      technicalAccuracy: Number,
      completeness: Number,
      communication: Number,
      reasoning: Number,
      feedback: String,
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      mistakes: [{ type: String }],
      correctedExplanation: String,
      betterAnswer: String
    }
  }],
  transcript: [{
    role: { type: String, enum: ['ai', 'user'] },
    roundKey: String,
    content: String,
    audioUrl: String,
    timestamp: { type: Date, default: Date.now }
  }],
  performanceSummary: {
    totalQuestions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    technicalAccuracy: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    strongAreas: [{ type: String }],
    needsImprovement: [{ type: String }]
  },
  aiFeedback: {
    goodPoints: [{ type: String }],
    improvementPoints: [{ type: String }],
    suggestedAnswer: String
  },
  // Company interview plan snapshot
  companyInterviewPlan: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Final Comprehensive Report
  finalReport: {
    overallScore: Number,
    communicationScore: Number,
    confidenceScore: Number,
    technicalKnowledgeScore: Number,
    problemSolvingScore: Number,
    answerQualityScore: Number,
    roleUnderstandingScore: Number,
    hrReadinessScore: Number,
    performanceLevel: String,
    readinessRating: String, // 'Ready' | 'Needs Improvement' | 'Strong Preparation Needed'
    whatYouDidWell: [{ type: String }],
    whatYouShouldImprove: [{ type: String }],
    technicalWeaknesses: [{ type: String }],
    communicationWeaknesses: [{ type: String }],
    frequentMistakes: [{ type: String }],
    topicsToRevise: [{ type: String }],
    recommendedPractice: [{ type: String }],
    roleReadiness: String,
    finalCoachFeedback: String,
    betterAnswerApproach: [{
      question: String,
      candidateSpoken: String,
      whatWasMissing: String,
      howToStructure: String,
      strongerExample: String
    }],
    needsImprovementQuestions: [{
      questionId: String,
      question: String,
      roundKey: String,
      userAnswer: String,
      whatWasWrong: String,
      correctConcept: String,
      aiExplanation: String,
      practiceTopic: String
    }],
    companyRecommendations: [{ type: String }],
    researchedProcess: [{ type: String }],
    roundsCompleted: [{ type: String }],
    roundBreakdown: [{
      roundKey: String,
      name: String,
      score: Number,
      status: String,
      feedback: String
    }],
    sources: [{
      title: String,
      url: String,
      snippet: String
    }]
  },
  isRetake: { type: Boolean, default: false },
  previousSessionId: { type: String, default: null },
  durationMinutes: { type: Number, default: 20 },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }
}, { timestamps: true });

InterviewSessionSchema.index({ userId: 1, companyName: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
