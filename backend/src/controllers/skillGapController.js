const SkillGap = require('../models/SkillGap');
const Resume = require('../models/Resume');
const CandidateProfile = require('../models/CandidateProfile');
const aiService = require('../services/aiService');
const { calculateCareerReadiness } = require('../utils/readinessEngine');

/**
 * Extracts or retrieves real skills from stored resume
 */
async function getResumeSkills(resume) {
  if (!resume) return [];
  let skills = [];

  if (Array.isArray(resume.parsedData?.skills) && resume.parsedData.skills.length > 0) {
    skills = resume.parsedData.skills;
  } else if (Array.isArray(resume.atsAnalysis?.skillsFound) && resume.atsAnalysis.skillsFound.length > 0) {
    skills = resume.atsAnalysis.skillsFound;
  } else if (resume.extractedText && resume.extractedText.trim().length > 20) {
    // Parse text to extract skills if not already parsed
    const parsed = await aiService.parseResumeText(resume.extractedText);
    if (parsed && Array.isArray(parsed.skills)) {
      skills = parsed.skills;
      // Persist parsed skills for future reuse
      await Resume.updateOne(
        { _id: resume._id },
        { $set: { 'parsedData.skills': skills } }
      );
    }
  }

  return skills;
}

exports.analyzeSkillGap = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    if (!resume) {
      return res.status(400).json({
        success: false,
        error: { code: 'RESUME_MISSING', message: 'Please upload your resume first.' }
      });
    }

    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = (req.body.targetRole || profile?.targetRole || resume.targetRole || req.user.targetRole || '').trim();
    if (!targetRole) {
      return res.status(400).json({
        success: false,
        error: { code: 'ROLE_MISSING', message: 'Please select your target role first.' }
      });
    }

    const skills = await getResumeSkills(resume);
    const fileName = resume.fileName || 'resume.pdf';

    const gapData = await aiService.calculateSkillGap(skills, targetRole, fileName);

    const saved = await SkillGap.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      {
        $set: {
          targetRole,
          resumeFileName: fileName,
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
      resumeSkills: userSkills,
      roleMatchPercentage: gapData.skillMatchPercentage,
      atsScore: profile?.resumeScore || 75,
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

    // Update Profile readiness score & target role
    await CandidateProfile.updateOne(
      { userId: req.user.firebaseUid },
      { 
        $set: { 
          targetRole,
          readinessScore: readiness.readinessScore,
          readinessBreakdown: readiness.breakdown,
          skillsScore: gapData.skillMatchPercentage 
        } 
      }
    );

    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[SkillGapController] analyze error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'ANALYSIS_ERROR', message: "We couldn't generate the analysis right now. Please try again." } 
    });
  }
};

exports.getLatestSkillGap = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    if (!resume) {
      return res.status(400).json({
        success: false,
        error: { code: 'RESUME_MISSING', message: 'Please upload your resume first.' }
      });
    }

    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = (req.query.targetRole || profile?.targetRole || resume.targetRole || req.user.targetRole || '').trim();
    if (!targetRole) {
      return res.status(400).json({
        success: false,
        error: { code: 'ROLE_MISSING', message: 'Please select your target role first.' }
      });
    }

    let gap = await SkillGap.findOne({ userId: req.user.firebaseUid });

    // If gap doesn't exist or targetRole has changed, recalculate dynamically
    if (!gap || gap.targetRole !== targetRole) {
      const skills = await getResumeSkills(resume);
      const fileName = resume.fileName || 'resume.pdf';
      const gapData = await aiService.calculateSkillGap(skills, targetRole, fileName);

      gap = await SkillGap.findOneAndUpdate(
        { userId: req.user.firebaseUid },
        {
          $set: {
            targetRole,
            resumeFileName: fileName,
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
    }

    return res.json({ success: true, data: gap });
  } catch (error) {
    console.error('[SkillGapController] getLatest error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'ANALYSIS_ERROR', message: "We couldn't generate the analysis right now. Please try again." } 
    });
  }
};
