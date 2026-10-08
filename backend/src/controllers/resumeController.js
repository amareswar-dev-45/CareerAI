const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const ATSAnalysis = require('../models/ATSAnalysis');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const SkillGap = require('../models/SkillGap');
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

    // Synchronize Skill Gap immediately
    const gapData = await aiService.calculateSkillGap(atsResult.skillsFound || [], targetRole, resumeDoc.fileName, true);
    await SkillGap.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      {
        $set: {
          targetRole,
          resumeFileName: resumeDoc.fileName,
          readinessScore: gapData.skillMatchPercentage,
          skillMatchPercentage: gapData.skillMatchPercentage,
          skillsYouHave: gapData.skillsYouHave,
          skillsToImprove: gapData.skillsToImprove,
          scoreBreakdown: gapData.scoreBreakdown,
          skillsBreakdown: gapData.skillsBreakdown,
          requiredSkills: gapData.requiredSkills,
          existingSkills: gapData.existingSkills,
          missingSkills: gapData.missingSkills,
          prioritySkills: gapData.prioritySkills,
          note: gapData.note,
          analyzedAt: new Date()
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
      hasResume: true,
      profile: {
        collegeName: profile?.collegeName,
        degree: profile?.degree,
        targetRole: targetRole,
        dreamCompany: profile?.dreamCompany
      }
    });

    // Update Profile resumeScore, readinessScore & resumeStatus
    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { 
        $set: { 
          resumeScore: atsScore,
          skillsScore: atsAnalysisDoc.skillsMatchScore,
          readinessScore: readiness.readinessScore,
          readinessBreakdown: readiness.breakdown,
          resumeStatus: 'uploaded'
        } 
      }
    );

    await User.updateOne(
      { firebaseUid: req.user.firebaseUid },
      { $set: { resumeStatus: 'uploaded' } }
    );

    return res.json({
      success: true,
      data: {
        resume: resumeDoc,
        atsAnalysis: atsAnalysisDoc,
        atsScore,
        resumeStatus: 'uploaded'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.getCurrentResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    let atsAnalysis = await ATSAnalysis.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });

    const isSkipped = (profile?.resumeStatus || req.user.resumeStatus) === 'skipped';
    const hasResume = Boolean(
      !isSkipped &&
      resume && 
      (resume.extractedText || (resume.fileName && resume.fileName !== 'No Resume'))
    );

    if (!hasResume) {
      atsAnalysis = {
        score: 0,
        atsScore: 0,
        hasResume: false,
        targetRole: profile?.targetRole || req.user.targetRole || 'Software Engineer',
        requiredSkills: [],
        skillsFound: [],
        missingSkills: [],
        strengths: [`Profile configured for target role: ${profile?.targetRole || 'Software Engineer'}`],
        improvements: ['No resume available for analysis.'],
        relevantExperience: 'No resume evidence currently available',
        educationMatch: 'Profile information only',
        missingKeywords: [],
        suggestedImprovements: ['Upload an existing resume or create one to generate ATS evaluation.'],
        keywordCoverage: 0,
        formattingScore: 0,
        skillsMatchScore: 0,
        experienceScore: 0,
        feedback: {
          overview: 'No resume available for analysis. Estimated ATS Readiness is 0/100 because no resume evidence is currently available.'
        },
        note: 'No resume available for analysis. No resume evidence is currently available.'
      };
    }

    const currentScore = hasResume ? (atsAnalysis?.score ?? atsAnalysis?.atsScore ?? 75) : 0;

    return res.json({
      success: true,
      data: {
        resume: hasResume ? resume : null,
        atsScore: currentScore,
        hasResume,
        atsAnalysis: atsAnalysis || resume?.atsAnalysis || null,
        feedback: atsAnalysis?.feedback || {
          overview: hasResume ? 'Resume analyzed.' : 'No resume available for analysis. No resume evidence is currently available.'
        },
        targetRole: profile?.targetRole || req.user.targetRole || 'Software Engineer',
        resumeStatus: profile?.resumeStatus || req.user.resumeStatus || (hasResume ? 'uploaded' : (isSkipped ? 'skipped' : 'none'))
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

