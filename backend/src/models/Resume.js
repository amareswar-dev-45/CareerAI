const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: 'Amareswar_Nayak_Resume.pdf' },
  mimeType: { type: String, default: 'application/pdf' },
  extractedText: { type: String, default: '' },
  parsedData: {
    skills: [{ type: String }],
    education: [{
      institution: String,
      degree: String,
      year: String,
      grade: String
    }],
    experience: [{
      role: String,
      company: String,
      duration: String,
      description: String
    }],
    projects: [{
      title: String,
      techStack: [{ type: String }],
      description: String
    }],
    certifications: [{ type: String }]
  },
  targetRole: { type: String, default: '' },
  atsAnalysis: { type: Object, default: null },
  atsScore: { type: Number, default: 75 }
}, { timestamps: true });

module.exports = mongoose.model('Resume', ResumeSchema);
