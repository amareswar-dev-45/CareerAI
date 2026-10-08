const mongoose = require('mongoose');

const BuiltResumeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'My Resume' },
  template: { type: String, enum: ['ats', 'modern', 'minimal'], default: 'ats' },
  targetRole: { type: String, default: 'Software Developer' },
  targetCompany: { type: String, default: '' },
  personal: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' }
  },
  summary: { type: String, default: '' },
  education: [{
    id: { type: String },
    degree: { type: String, default: '' },
    institution: { type: String, default: '' },
    location: { type: String, default: '' },
    startYear: { type: String, default: '' },
    endYear: { type: String, default: '' },
    grade: { type: String, default: '' }
  }],
  experience: [{
    id: { type: String },
    role: { type: String, default: '' },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    current: { type: Boolean, default: false },
    responsibilities: { type: String, default: '' },
    achievements: { type: String, default: '' }
  }],
  projects: [{
    id: { type: String },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    technologies: { type: String, default: '' },
    role: { type: String, default: '' },
    contributions: { type: String, default: '' },
    projectLink: { type: String, default: '' },
    githubLink: { type: String, default: '' }
  }],
  skills: {
    programming: [{ type: String }],
    frameworks: [{ type: String }],
    databases: [{ type: String }],
    tools: [{ type: String }],
    other: [{ type: String }]
  },
  achievements: [{
    id: { type: String },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    date: { type: String, default: '' }
  }],
  certifications: [{
    id: { type: String },
    name: { type: String, default: '' },
    issuer: { type: String, default: '' },
    date: { type: String, default: '' },
    link: { type: String, default: '' }
  }],
  languages: [{
    id: { type: String },
    language: { type: String, default: '' },
    proficiency: { type: String, default: '' }
  }],
  links: [{
    id: { type: String },
    label: { type: String, default: '' },
    url: { type: String, default: '' }
  }],
  atsReadiness: {
    score: { type: Number, default: 0 },
    strengths: [{ type: String }],
    missingAreas: [{ type: String }],
    suggestions: [{ type: String }],
    lastChecked: { type: Date }
  }
}, { timestamps: true });

BuiltResumeSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('BuiltResume', BuiltResumeSchema);
