const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const ATSAnalysis = require('../models/ATSAnalysis');
const CandidateProfile = require('../models/CandidateProfile');
const aiService = require('../services/aiService');
const { calculateCareerReadiness } = require('../utils/readinessEngine');

exports.uploadResume = async (req, res) => {
  try {
    let extractedText = "Amareswar Nayak | Software Engineer | React, Node.js, Express, MongoDB, JavaScript, REST API, Git, SQL.";
    
    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        try {
          const parsedPdf = await pdfParse(req.file.buffer);
          if (parsedPdf.text && parsedPdf.text.trim()) {
            extractedText = parsedPdf.text;
          }
        } catch (e) {
          console.log('PDF Parse notice in uploadResume:', e.message);
          extractedText = req.file.buffer.toString('utf-8');
        }
      } else {
        extractedText = req.file.buffer.toString('utf-8');
      }
    }

    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';

    const atsResult = await aiService.analyzeResumeAgainstTargetRole(extractedText, targetRole);
    const atsScore = atsResult.atsScore || 75;

    const resumeDoc = await Resume.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      {
        $set: {
          fileUrl: req.file ? `uploads/${req.file.originalname}` : '/demo-resume.pdf',
          fileName: req.file ? req.file.originalname : 'Uploaded_Resume.pdf',
          mimeType: req.file ? req.file.mimetype : 'application/pdf',
          extractedText,
          parsedData: {
            skills: atsResult.skillsFound || [],
            education: [{ institution: profile?.collegeName || req.user.collegeName || 'GCEK Kalahandi', degree: profile?.degree || req.user.degree || 'B.Tech', year: '2026' }],
            experience: [],
            projects: []
          },
          targetRole,
          atsScore,
          atsAnalysis: atsResult
        }
      },
      { new: true, upsert: true }
    );

    const atsAnalysisDoc = await ATSAnalysis.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      {
        $set: {
          targetRole,
          score: atsScore,
          atsScore,
          requiredSkills: atsResult.requiredSkills || [],
          skillsFound: atsResult.skillsFound || [],
          missingSkills: atsResult.missingSkills || [],
          strengths: atsResult.strengths || [],
          improvements: atsResult.improvements || [],
          relevantExperience: atsResult.relevantExperience,
          educationMatch: atsResult.educationMatch,
          missingKeywords: atsResult.missingKeywords || [],
          suggestedImprovements: atsResult.suggestedImprovements || [],
          keywordCoverage: Math.round(((atsResult.skillsFound?.length || 1) / Math.max(atsResult.requiredSkills?.length || 1, 1)) * 100),
          formattingScore: 85,
          skillsMatchScore: Math.round(((atsResult.skillsFound?.length || 1) / Math.max(atsResult.requiredSkills?.length || 1, 1)) * 100),
          experienceScore: 70
        }
      },
      { new: true, upsert: true }
    );

    // Calculate scientifically normalized career readiness
    const readiness = calculateCareerReadiness({
      resumeSkills: atsResult.skillsFound || [],
      roleMatchPercentage: atsAnalysisDoc.skillsMatchScore,
      atsScore: atsScore,
      hasProjects: true,
      projectCount: 2,
      interviewScore: profile?.interviewScore || 70,
      profile: {
        collegeName: profile?.collegeName,
        degree: profile?.degree,
        targetRole: targetRole,
        dreamCompany: profile?.dreamCompany
      }
    });

    // Update Profile resumeScore & readinessScore
    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { 
        $set: { 
          resumeScore: atsScore,
          skillsScore: atsAnalysisDoc.skillsMatchScore,
          readinessScore: readiness.readinessScore,
          readinessBreakdown: readiness.breakdown
        } 
      }
    );

    return res.json({
      success: true,
      data: { resume: resumeDoc, atsAnalysis: atsResult }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.getCurrentResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const atsAnalysis = await ATSAnalysis.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });

    return res.json({
      success: true,
      data: {
        resume,
        atsAnalysis: atsAnalysis || resume?.atsAnalysis || null,
        targetRole: profile?.targetRole || req.user.targetRole || 'Software Engineer'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.analyzeResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const resumeText = resume?.extractedText || 'React, Node.js, Express, MongoDB, JavaScript';

    const result = await aiService.analyzeResumeAgainstTargetRole(resumeText, targetRole);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.tailorResume = async (req, res) => {
  try {
    const { jobTitle, company, jobDescription, targetRole } = req.body;
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });

    if (!resume || !resume.extractedText) {
      return res.status(400).json({
        success: false,
        error: { code: 'RESUME_MISSING', message: 'Please upload your resume first before tailoring.' }
      });
    }

    const effectiveRole = targetRole || profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const resumeSkills = resume.parsedData?.skills || resume.atsAnalysis?.skillsFound || [];

    const tailored = await aiService.tailorResumeForJob({
      resumeText: resume.extractedText,
      resumeSkills,
      jobTitle: jobTitle || effectiveRole,
      company: company || 'Target Company',
      jobDescription: jobDescription || '',
      targetRole: effectiveRole
    });

    return res.json({ success: true, data: tailored });
  } catch (error) {
    console.error('Tailor resume error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

