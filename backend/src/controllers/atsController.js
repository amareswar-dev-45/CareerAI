const ATSAnalysis = require('../models/ATSAnalysis');
const Resume = require('../models/Resume');
const CandidateProfile = require('../models/CandidateProfile');
const aiService = require('../services/aiService');

exports.analyzeATS = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const resumeText = resume?.extractedText || 'React, Node.js, Express, MongoDB, JavaScript';

    const result = await aiService.analyzeResumeAgainstTargetRole(resumeText, targetRole);

    const saved = await ATSAnalysis.create({
      userId: req.user.firebaseUid,
      targetRole,
      score: result.atsScore,
      atsScore: result.atsScore,
      requiredSkills: result.requiredSkills || [],
      skillsFound: result.skillsFound || [],
      missingSkills: result.missingSkills || [],
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      relevantExperience: result.relevantExperience || 'Relevant project experience listed',
      educationMatch: result.educationMatch || 'Degree meets technical prerequisites',
      missingKeywords: result.missingKeywords || [],
      suggestedImprovements: result.suggestedImprovements || [],
      keywordCoverage: Math.round(((result.skillsFound?.length || 1) / Math.max(result.requiredSkills?.length || 1, 1)) * 100),
      formattingScore: 85,
      skillsMatchScore: Math.round(((result.skillsFound?.length || 1) / Math.max(result.requiredSkills?.length || 1, 1)) * 100),
      experienceScore: 70
    });

    return res.json({ success: true, data: saved });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.getLatestATS = async (req, res) => {
  try {
    let ats = await ATSAnalysis.findOne({ userId: req.user.firebaseUid }).sort({ createdAt: -1 });
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';

    if (!ats && resume && resume.extractedText) {
      const realAnalysis = await aiService.analyzeResumeAgainstTargetRole(resume.extractedText, targetRole);
      ats = await ATSAnalysis.create({
        userId: req.user.firebaseUid,
        targetRole,
        score: realAnalysis.atsScore,
        atsScore: realAnalysis.atsScore,
        requiredSkills: realAnalysis.requiredSkills || [],
        skillsFound: realAnalysis.skillsFound || [],
        missingSkills: realAnalysis.missingSkills || [],
        strengths: realAnalysis.strengths || [],
        improvements: realAnalysis.improvements || [],
        relevantExperience: realAnalysis.relevantExperience || 'Relevant project experience listed',
        educationMatch: realAnalysis.educationMatch || 'Degree meets technical prerequisites',
        missingKeywords: realAnalysis.missingKeywords || [],
        suggestedImprovements: realAnalysis.suggestedImprovements || [],
        keywordCoverage: Math.round(((realAnalysis.skillsFound?.length || 1) / Math.max(realAnalysis.requiredSkills?.length || 1, 1)) * 100),
        formattingScore: 85,
        skillsMatchScore: Math.round(((realAnalysis.skillsFound?.length || 1) / Math.max(realAnalysis.requiredSkills?.length || 1, 1)) * 100),
        experienceScore: 70
      });
    }
    return res.json({ success: true, data: ats });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
