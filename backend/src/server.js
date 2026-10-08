const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const atsRoutes = require('./routes/atsRoutes');
const skillGapRoutes = require('./routes/skillGapRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const communicationRoutes = require('./routes/communicationRoutes');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Base Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareerAI Engine v1.0', timestamp: new Date() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/resume', resumeRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/v1/ats', atsRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/v1/skills', skillGapRoutes);
app.use('/api/skills', skillGapRoutes);
app.use('/api/v1/roadmap', roadmapRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/v1/college', collegeRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/communication', communicationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]:', err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message || 'An unexpected server error occurred.' }
  });
});

const PORT = env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[CareerAI Backend Server] running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Server Error]: Port ${PORT} is already in use by another process.`);
    console.error(`A previous server instance or background task is running on port ${PORT}.\n`);
    process.exit(1);
  } else {
    console.error('[Server Error]:', err);
  }
});

