const mongoose = require('mongoose');

const JobMatchSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  jobId: { type: String, required: true },
  fitScore: { type: Number, required: true },
  classification: { type: String, enum: ['Safe Fit', 'Stretch', 'Reach'], default: 'Safe Fit' },
  matchedSkills: [{ type: String }],
  partialSkills: [{ type: String }],
  missingSkills: [{ type: String }],
  explanation: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('JobMatch', JobMatchSchema);
