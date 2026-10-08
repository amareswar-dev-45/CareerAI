const mongoose = require('mongoose');

const SourceItemSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  url: { type: String, default: '' },
  snippet: { type: String, default: '' },
  provenance: { type: String, default: 'Public employee/candidate report' }
}, { _id: false });

const CompanyIntelSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  normalizedCompanyName: { type: String, required: true, index: true },
  role: { type: String, default: 'Software Engineer' },
  normalizedRole: { type: String, default: 'software engineer', index: true },
  
  // Existing Base Fields (Preserved for compatibility)
  website: { type: String, default: 'Not available' },
  description: { type: String, default: 'Not available' },
  about: { type: String, default: 'Not available' },
  industry: { type: String, default: 'Not available' },
  headquarters: { type: String, default: 'Not available' },
  companySize: { type: String, default: 'Not available' },
  hiringLocations: { type: String, default: 'Not available' },
  interviewProcessVerified: { type: Boolean, default: false },
  interviewProcessMessage: { type: String, default: 'Interview process information is currently unavailable from reliable public sources.' },
  interviewRounds: [{ type: String }],
  rounds: [{
    roundNumber: Number,
    name: String,
    description: String,
    evidenceType: { type: String, default: 'Reported candidate experience' }
  }],
  interviewPatterns: [{
    roundName: String,
    focus: String,
    provenance: { type: String, default: 'Public source' }
  }],
  reportedTopics: [{ type: String }],
  sampleQuestions: [{ type: String }],
  commonlyRequestedSkills: [{ type: String }],
  hiringInfo: { type: String, default: 'Not available' },
  requiredSkills: [{ type: String }],
  sourceAttribution: { type: String, default: 'Public candidate reports & career resources' },
  sources: [SourceItemSchema],
  lastUpdated: { type: String, default: 'October 2026' },

  // NEW SECTION 1: Company Culture
  companyCulture: {
    summary: { type: String, default: '' },
    workPressure: { type: String, default: '' },
    workLifeBalance: { type: String, default: '' },
    supportiveness: { type: String, default: '' },
    employeeSentiment: { type: String, default: '' },
    sourcesCount: { type: Number, default: 0 },
    sources: [SourceItemSchema]
  },

  // NEW SECTION 2: Role Expectations (Specific to Company + Role)
  roleExpectations: {
    summary: { type: String, default: '' },
    responsibilities: [{ type: String }],
    technicalSkills: [{ type: String }],
    softSkills: [{ type: String }],
    technologies: [{ type: String }],
    expectedOwnership: { type: String, default: '' },
    sources: [SourceItemSchema]
  },

  // NEW SECTION 3: Previous Candidate Interview Experience
  interviewExperience: {
    summary: { type: String, default: '' },
    reportedRounds: [{
      roundNumber: Number,
      name: String,
      description: String,
      evidenceType: { type: String, default: 'Candidate report' }
    }],
    commonTopics: [{ type: String }],
    codingTopics: [{ type: String }],
    behavioralTopics: [{ type: String }],
    difficulty: { type: String, default: 'Medium' },
    candidateExperience: { type: String, default: '' },
    sources: [SourceItemSchema]
  }
}, { timestamps: true });

CompanyIntelSchema.index({ normalizedCompanyName: 1, normalizedRole: 1 });

module.exports = mongoose.model('CompanyIntel', CompanyIntelSchema);
