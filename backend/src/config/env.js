const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://launchxpax_db_user:mjA9RhxRZlVQ65Ue@cluster0.1kiugyp.mongodb.net/gcek_career_ai?retryWrites=true&w=majority',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  SERP_API_KEY: process.env.SERP_API_KEY || '',
  INDIAN_JOBS_API_KEY: process.env.INDIAN_JOBS_API_KEY || '',
  FINDWORK_API_KEY: process.env.FINDWORK_API_KEY || '',
  THE_MUSE_API_KEY: process.env.THE_MUSE_API_KEY || '',
  APIFY_API_KEY: process.env.APIFY_API_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'gcek_jwt_secret_2026',
  COLLEGE_ADMIN_EMAIL: process.env.COLLEGE_ADMIN_EMAIL || 'college123@gmail.com',
  COLLEGE_ADMIN_PASSWORD: process.env.COLLEGE_ADMIN_PASSWORD || 'college@123',
  COLLEGE_NAME: process.env.COLLEGE_NAME || 'GCEK',
  GEMINI_COMMUNICATION_API: process.env.GEMINI_COMMUNICATION_API || '',
  SPEECH_TO_TEXT_API_KEY: process.env.SPEECH_TO_TEXT_API_KEY || '',
  TEXT_TO_SPEECH_API_KEY: process.env.TEXT_TO_SPEECH_API_KEY || '',
  VOICE_AGENT_API_KEY: process.env.VOICE_AGENT_API_KEY || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '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'
};
