const mongoose = require('mongoose');

const ATSAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  targetRole: { type: String, default: '' },
  score: { type: Number, default: 75 },
  atsScore: { type: Number, default: 75 },
  requiredSkills: [{ type: String }],
  skillsFound: [{ type: String }],
  missingSkills: [{ type: String }],
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  relevantExperience: { type: String, default: 'Not specified' },
  educationMatch: { type: String, default: 'Not specified' },
  missingKeywords: [{ type: String }],
  suggestedImprovements: [{ type: String }],
  keywordCoverage: { type: Number, default: 75 },
  formattingScore: { type: Number, default: 85 },
  skillsMatchScore: { type: Number, default: 70 },
  experienceScore: { type: Number, default: 65 },
  parsingWarnings: [{ type: String }],
  weakBulletPoints: [{
    originalText: String,
    issue: String
  }],
  suggestions: [{
    existingText: String,
    suggestedText: String,
    reason: String,
    targetSkill: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ATSAnalysis', ATSAnalysisSchema);
