const mongoose = require('mongoose');

const CommunicationSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sessionType: { 
    type: String, 
    enum: ['reading', 'conversation', 'mistake_practice'], 
    required: true 
  },
  level: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced'], 
    default: 'Beginner' 
  },
  topic: { type: String, default: 'General English Practice' },
  expectedText: { type: String },
  transcript: { type: String },
  scores: {
    fluency: { type: Number, default: 0, min: 0, max: 100 },
    grammar: { type: Number, default: 0, min: 0, max: 100 },
    vocabulary: { type: Number, default: 0, min: 0, max: 100 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    pronunciation: { type: Number, default: 0, min: 0, max: 100 },
    overall: { type: Number, default: 0, min: 0, max: 100 }
  },
  speakingSpeed: { 
    type: String, 
    enum: ['Normal', 'Slow', 'Fast'], 
    default: 'Normal' 
  },
  mistakes: [{
    spoken: { type: String },
    correct: { type: String },
    explanation: { type: String },
    type: { type: String, enum: ['grammar', 'vocabulary', 'pronunciation', 'accuracy', 'other'], default: 'grammar' },
    resolved: { type: Boolean, default: false }
  }],
  wordsToPractice: [{ type: String }],
  suggestions: [{ type: String }],
  conversationMessages: [{
    role: { type: String, enum: ['student', 'ai'], required: true },
    content: { type: String, required: true },
    audioUrl: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  durationSeconds: { type: Number, default: 0 },
  audioUrl: { type: String },
  status: { type: String, enum: ['completed', 'in_progress'], default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('CommunicationSession', CommunicationSessionSchema);
