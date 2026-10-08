const aiService = require('../services/aiService');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const SkillGap = require('../models/SkillGap');
const Roadmap = require('../models/Roadmap');

exports.chat = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message is required' }
      });
    }

    // Retrieve real authenticated user context
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const gap = await SkillGap.findOne({ userId: req.user.firebaseUid });
    const roadmap = await Roadmap.findOne({ userId: req.user.firebaseUid });

    const userContext = {
      targetRole: profile?.targetRole || req.user.targetRole || 'Software Engineer',
      resumeSkills: resume?.parsedData?.skills || resume?.atsAnalysis?.skillsFound || [],
      skillGaps: gap?.skillsToImprove?.map(s => s.skill) || gap?.missingSkills || [],
      roadmapTitle: roadmap?.title || `${roadmap?.durationDays || 30}-Day Career Roadmap`,
      readinessScore: profile?.readinessScore || 78
    };

    const aiResponse = await aiService.chatCareerAssistant({
      message: message.trim(),
      conversationHistory,
      userContext
    });

    return res.json({
      success: true,
      data: aiResponse
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'CareerAI Assistant is currently unavailable. Please try again.' }
    });
  }
};
