const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  jobId: { type: String, default: '' },
  company: { type: String, required: true },
  role: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  salary: { type: String, default: 'Not specified' },
  applyUrl: { type: String, default: '' },
  appliedDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Saved', 'Applied', 'In Review', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
    default: 'Applied'
  },
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now }
  }],
  notes: { type: String, default: '' },
  interviewDate: { type: String, default: '' },
  source: { type: String, default: 'Platform' }
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema);
