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
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = (req.body.targetRole || profile?.targetRole || resume?.targetRole || req.user.targetRole || 'Software Engineer').trim();

    const hasResume = Boolean(resume && (resume.extractedText || (resume.parsedData?.skills && resume.parsedData.skills.length > 0)));
    const skills = hasResume ? await getResumeSkills(resume) : [];
    const fileName = resume?.fileName || (hasResume ? 'resume.pdf' : 'No Resume');

    const gapData = await aiService.calculateSkillGap(skills, targetRole, fileName, hasResume);

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
      resumeSkills: skills,
      roleMatchPercentage: gapData.skillMatchPercentage,
      atsScore: hasResume ? (profile?.resumeScore || 75) : 0,
      hasProjects: hasResume,
      projectCount: hasResume ? 2 : 0,
      interviewScore: profile?.interviewScore || 0,
      hasResume,
      profile: {
        collegeName: profile?.collegeName || req.user.collegeName,
        degree: profile?.degree || req.user.degree,
        targetRole: targetRole,
        dreamCompany: profile?.dreamCompany || req.user.dreamCompany
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
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const targetRole = (req.query.targetRole || profile?.targetRole || resume?.targetRole || req.user.targetRole || 'Software Engineer').trim();

    let gap = await SkillGap.findOne({ userId: req.user.firebaseUid });

    // If gap doesn't exist or targetRole has changed, recalculate dynamically
    if (!gap || gap.targetRole !== targetRole) {
      const hasResume = Boolean(resume && (resume.extractedText || (resume.parsedData?.skills && resume.parsedData.skills.length > 0)));
      const skills = hasResume ? await getResumeSkills(resume) : [];
      const fileName = resume?.fileName || (hasResume ? 'resume.pdf' : 'No Resume');
      const gapData = await aiService.calculateSkillGap(skills, targetRole, fileName, hasResume);

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
