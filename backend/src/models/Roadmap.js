const mongoose = require('mongoose');

const RoadmapSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  targetCompany: { type: String, default: 'TCS' },
  targetRole: { type: String, required: true },
  title: { type: String, default: 'Company-Specific Skills Roadmap' },
  readinessScore: { type: Number, default: 60 },
  durationWeeks: { type: Number, default: 8 },
  durationDays: { type: Number, default: 56 },
  currentSkills: [{ type: String }],
  skillGaps: {
    strong: [{ type: String }],
    needsImprovement: [{ type: String }],
    missing: [{ type: String }],
    highPriority: [{ type: String }],
    optional: [{ type: String }]
  },
  interviewWeaknesses: [{ type: String }],
  roadmap: [{
    phase: Number,
    title: String,
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'HIGH' },
    estimatedDays: Number,
    skills: [{
      id: String,
      name: String,
      category: String,
      priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'HIGH' },
      status: { type: String, enum: ['Not Started', 'Learning', 'Completed'], default: 'Not Started' },
      sourceRequirement: { type: String, default: 'Required by job posting' }, // 'Required by job posting' | 'Recommended for preparation' | 'Interview focus'
      why: String,
      whatToLearn: [{ type: String }],
      practice: String,
      miniTask: String,
      estimatedDays: Number
    }]
  }],
  weeklyPlan: [{
    week: Number,
    title: String,
    focus: String,
    topics: [{ type: String }],
    skills: [{ type: String }],
    miniTask: String,
    completed: { type: Boolean, default: false }
  }],
  projects: [{
    id: String,
    title: String,
    description: String,
    skills: [{ type: String }],
    technologies: String,
    whyItHelps: String,
    completed: { type: Boolean, default: false }
  }],
  recommendedNextSkill: {
    name: String,
    why: String,
    estimatedDays: Number,
    priority: String
  },
  overallProgress: { type: Number, default: 0 },
  sources: [{
    title: String,
    url: String,
    snippet: String
  }],

  // Legacy fields preserved for backward compatibility
  progressCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 30 },
  milestones: [{
    step: Number,
    title: String,
    status: { type: String, enum: ['completed', 'in_progress', 'locked'], default: 'locked' },
    details: String
  }],
  days: [{
    day: { type: Number },
    topic: { type: String },
    why: { type: String, default: '' },
    learn: [{ type: String }],
    practice: { type: String, default: '' },
    expectedOutcome: { type: String, default: '' },
    completed: { type: Boolean, default: false }
  }],
  weeks: [{
    weekNumber: Number,
    title: String,
    goals: [{ type: String }],
    skills: [{ type: String }],
    suggestedResource: String,
    miniProject: String,
    estimatedHours: Number,
    completed: { type: Boolean, default: false }
  }],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Roadmap', RoadmapSchema);
