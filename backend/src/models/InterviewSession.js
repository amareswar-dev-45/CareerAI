const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  companyName: { type: String, default: 'Google' },
  normalizedCompanyName: { type: String, default: 'google' },
  targetRole: { type: String, default: 'Software Engineer' },
  round: { type: String, enum: ['aptitude', 'technical', 'hr', 'final'], required: true },
  score: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  topicScores: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  questions: [{
    questionId: String,
    category: String,
    topic: String,
    questionText: String,
    options: [{ type: String }],
    correctAnswer: String,
    userAnswer: String,
    isCorrect: { type: Boolean, default: false },
    feedback: String,
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
      betterAnswer: String
    }
  }],
  transcript: [{
    role: { type: String, enum: ['ai', 'user'] },
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
    answerQualityScore: Number,
    roleUnderstandingScore: Number,
    hrReadinessScore: Number,
    readinessRating: String, // 'Ready' | 'Needs Improvement' | 'Strong Preparation Needed'
    whatYouDidWell: [{ type: String }],
    whatYouShouldImprove: [{ type: String }],
    betterAnswerApproach: [{
      question: String,
      candidateSpoken: String,
      whatWasMissing: String,
      howToStructure: String,
      strongerExample: String
    }],
    companyRecommendations: [{ type: String }],
    researchedProcess: [{ type: String }],
    roundsCompleted: [{ type: String }],
    sources: [{
      title: String,
      url: String,
      snippet: String
    }]
  },
  durationMinutes: { type: Number, default: 20 },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }
}, { timestamps: true });

InterviewSessionSchema.index({ userId: 1, companyName: 1, round: 1 });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
