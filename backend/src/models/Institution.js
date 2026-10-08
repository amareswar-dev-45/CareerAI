const mongoose = require('mongoose');

const InstitutionSchema = new mongoose.Schema({
  institutionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  adminUserIds: [{ type: String }],
  departments: [{ type: String }],
  commonSkillGaps: [{
    skill: String,
    percentage: Number,
    suggestedIntervention: String
  }],
  avgReadinessScore: { type: Number, default: 76 }
}, { timestamps: true });

module.exports = mongoose.model('Institution', InstitutionSchema);
