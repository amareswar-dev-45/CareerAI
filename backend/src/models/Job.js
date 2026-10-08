const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  source: { type: String, required: true },
  sourceJobId: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: 'India' },
  workMode: { type: String, default: 'Onsite' },
  salary: { type: String, default: 'Not available' },
  description: { type: String, required: true },
  skills: [{ type: String }],
  employmentType: { type: String, default: 'Full-time' },
  applyUrl: { type: String, required: true },
  postedAt: { type: String, default: 'Recently' },
  fingerprint: { type: String, index: true }
}, { timestamps: true });

JobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });

module.exports = mongoose.model('Job', JobSchema);
