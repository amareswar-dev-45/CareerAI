const mongoose = require('mongoose');

const CandidateProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  collegeName: { type: String, default: 'Government College of Engineering Kalahandi' },
  degree: { type: String, default: 'B.Tech Computer Science' },
  graduationYear: { type: String, default: '2026' },
  currentYear: { type: String, default: '4th Year' },
  targetRole: { type: String, default: 'MERN Stack Developer' },
  location: { type: String, default: 'Bhubaneswar, India' },
  preferences: {
    workType: { type: String, default: 'Full-time' },
    preferredLocations: [{ type: String }],
    desiredMinSalary: { type: String, default: '₹6,000,000 / year' }
  },
  readinessScore: { type: Number, default: 78 },
  profileCompletion: { type: Number, default: 91 },
  skillsScore: { type: Number, default: 72 },
  resumeScore: { type: Number, default: 86 },
  interviewScore: { type: Number, default: 68 },
  dreamCompany: { type: String, default: '' },
  readinessBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  onboardingCompleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('CandidateProfile', CandidateProfileSchema);
