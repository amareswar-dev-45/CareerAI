const mongoose = require('mongoose');

const CompanyInterviewPlanSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  normalizedCompanyName: { type: String, required: true, index: true },
  targetRole: { type: String, required: true },
  normalizedRole: { type: String, required: true, index: true },
  difficulty: { type: String, default: 'Medium' },
  rounds: [{
    roundKey: { type: String, enum: ['aptitude', 'technical', 'hr', 'coding', 'system_design'], required: true },
    roundNumber: Number,
    name: String,
    description: String,
    evidenceType: { type: String, default: 'Reported by candidates' }, // 'Reported by candidates' | 'Official company information' | 'Based on multiple public sources'
    durationMinutes: Number,
    reportedTopics: [{ type: String }],
    passThreshold: { type: Number, default: 60 }
  }],
  summary: { type: String, default: '' },
  frequentlyAskedTopics: [{ type: String }],
  candidateExperience: { type: String, default: '' },
  sourceAttribution: { type: String, default: 'Public candidate reports & search indices' },
  sources: [{
    title: String,
    url: String,
    snippet: String
  }],
  lastResearched: { type: Date, default: Date.now }
}, { timestamps: true });

CompanyInterviewPlanSchema.index({ normalizedCompanyName: 1, normalizedRole: 1 });

module.exports = mongoose.model('CompanyInterviewPlan', CompanyInterviewPlanSchema);
