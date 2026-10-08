const Roadmap = require('../models/Roadmap');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const skillsRoadmapService = require('../services/skillsRoadmapService');

// 1. Get or Auto-Initialize Adaptive Roadmap
exports.getCurrentRoadmap = async (req, res) => {
  try {
    let roadmap = await Roadmap.findOne({ userId: req.user.firebaseUid });

    if (!roadmap || !Array.isArray(roadmap.roadmap) || roadmap.roadmap.length === 0) {
      // Auto-initialize from user profile and resume
      const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
      const resume = await Resume.findOne({ userId: req.user.firebaseUid });

      const company = profile?.dreamCompany || req.user.dreamCompany || 'TCS';
      const role = profile?.targetRole || req.user.targetRole || 'Software Developer';
      const userSkills = resume?.parsedData?.skills || resume?.atsAnalysis?.skillsFound || profile?.skills || [];

      const generated = await skillsRoadmapService.generateAdaptiveRoadmap({
        userId: req.user.firebaseUid,
        company,
        role,
        durationWeeks: 8,
        userSkills
      });

      roadmap = await Roadmap.findOneAndUpdate(
        { userId: req.user.firebaseUid },
        {
          $set: {
            ...generated,
            userId: req.user.firebaseUid
          }
        },
        { new: true, upsert: true }
      );
    }

    return res.json({ success: true, data: roadmap });
  } catch (error) {
    console.error('[RoadmapController] getCurrent error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 2. Generate or Regenerate Roadmap (Preserves completed progress)
exports.generateRoadmap = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });

    const company = (req.body.company || req.body.targetCompany || profile?.dreamCompany || req.user.dreamCompany || 'TCS').trim();
    const role = (req.body.role || req.body.targetRole || profile?.targetRole || req.user.targetRole || 'Software Developer').trim();
    const durationWeeks = parseInt(req.body.durationWeeks || req.body.durationDays ? Math.round((req.body.durationDays || 56) / 7) : 8, 10) || 8;

    // Gather user skills: from body or resume or profile
    let userSkills = [];
    if (Array.isArray(req.body.currentSkills) && req.body.currentSkills.length > 0) {
      userSkills = req.body.currentSkills;
    } else if (Array.isArray(req.body.manualSkills) && req.body.manualSkills.length > 0) {
      userSkills = req.body.manualSkills;
    } else {
      userSkills = resume?.parsedData?.skills || resume?.atsAnalysis?.skillsFound || profile?.skills || [];
    }

    // Capture existing completed skills to PRESERVE progress
    const existing = await Roadmap.findOne({ userId: req.user.firebaseUid });
    const existingProgress = {};
    if (existing && Array.isArray(existing.roadmap)) {
      existing.roadmap.forEach(phase => {
        (phase.skills || []).forEach(s => {
          if (s.status === 'Completed' || s.status === 'Learning') {
            existingProgress[s.id] = s.status;
            if (s.name) existingProgress[s.name.toLowerCase()] = s.status;
          }
        });
      });
    }

    const generated = await skillsRoadmapService.generateAdaptiveRoadmap({
      userId: req.user.firebaseUid,
      company,
      role,
      durationWeeks,
      userSkills,
      existingProgress
    });

    const saved = await Roadmap.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      {
        $set: {
          ...generated,
          userId: req.user.firebaseUid,
          generatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    return res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[RoadmapController] generate error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 3. Update Individual Skill Status ('Not Started' | 'Learning' | 'Completed')
exports.updateSkillStatus = async (req, res) => {
  try {
    const { skillId, status } = req.body;
    if (!skillId || !status) {
      return res.status(400).json({ success: false, error: { message: 'skillId and status are required' } });
    }

    const roadmap = await Roadmap.findOne({ userId: req.user.firebaseUid });
    if (!roadmap) {
      return res.status(404).json({ success: false, error: { message: 'Roadmap not found' } });
    }

    let found = false;
    let totalSkills = 0;
    let completedSkills = 0;

    (roadmap.roadmap || []).forEach(phase => {
      (phase.skills || []).forEach(s => {
        totalSkills++;
        if (s.id === skillId) {
          s.status = status;
          found = true;
        }
        if (s.status === 'Completed') {
          completedSkills++;
        }
      });
    });

    if (!found) {
      return res.status(404).json({ success: false, error: { message: 'Skill not found in roadmap' } });
    }

    roadmap.overallProgress = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
    roadmap.markModified('roadmap');
    await roadmap.save();

    return res.json({
      success: true,
      data: {
        skillId,
        status,
        overallProgress: roadmap.overallProgress,
        roadmap: roadmap.roadmap
      }
    });
  } catch (error) {
    console.error('[RoadmapController] updateSkillStatus error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 4. Legacy toggles preserved for backward compatibility
exports.toggleWeekCompletion = async (req, res) => {
  try {
    const { weekNumber } = req.body;
    const roadmap = await Roadmap.findOne({ userId: req.user.firebaseUid });
    if (!roadmap) return res.status(404).json({ success: false, error: { message: 'Roadmap not found' } });

    const week = (roadmap.weeks || []).find(w => w.weekNumber === weekNumber);
    if (week) {
      week.completed = !week.completed;
      roadmap.markModified('weeks');
      await roadmap.save();
    }
    return res.json({ success: true, data: roadmap });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: e.message } });
  }
};

exports.toggleDayCompletion = async (req, res) => {
  try {
    const { dayNumber } = req.body;
    const roadmap = await Roadmap.findOne({ userId: req.user.firebaseUid });
    if (!roadmap) return res.status(404).json({ success: false, error: { message: 'Roadmap not found' } });

    const day = (roadmap.days || []).find(d => d.day === dayNumber);
    if (day) {
      day.completed = !day.completed;
      roadmap.markModified('days');
      await roadmap.save();
    }
    return res.json({ success: true, data: roadmap });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: e.message } });
  }
};
