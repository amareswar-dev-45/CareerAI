const jobAggregator = require('../adapters/jobAggregator');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const CandidateProfile = require('../models/CandidateProfile');
const serpService = require('../services/serpService');
const companyIntelService = require('../services/companyIntelService');

function calculateTransparentMatch({ userSkills = [], userTargetRole = '', userDegree = '', job }) {
  const reqSkills = Array.isArray(job.skills) ? job.skills : [];
  const matched = reqSkills.filter(s => userSkills.some(us => us.toLowerCase() === s.toLowerCase()));
  const missing = reqSkills.filter(s => !userSkills.some(us => us.toLowerCase() === s.toLowerCase()));

  // 1. Skills Match %
  let skillsMatch = null;
  if (reqSkills.length > 0) {
    skillsMatch = Math.round((matched.length / reqSkills.length) * 100);
  }

  // 2. Role Alignment %
  let roleAlignment = null;
  if (userTargetRole && job.title) {
    const roleKeywords = userTargetRole.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const titleLower = job.title.toLowerCase();
    const matchedWords = roleKeywords.filter(w => titleLower.includes(w));
    if (matchedWords.length === roleKeywords.length) {
      roleAlignment = 95;
    } else if (matchedWords.length > 0) {
      roleAlignment = Math.round((matchedWords.length / roleKeywords.length) * 85);
    } else {
      roleAlignment = 40;
    }
  }

  // 3. Education Match %
  let educationMatch = null;
  if (userDegree && job.description) {
    const descLower = job.description.toLowerCase();
    const degLower = userDegree.toLowerCase();
    if (degLower.includes('b.tech') || degLower.includes('b.e.') || degLower.includes('mca') || degLower.includes('bca') || degLower.includes('b.sc')) {
      if (descLower.includes('bachelor') || descLower.includes('b.tech') || descLower.includes('degree') || descLower.includes('engineering') || descLower.includes('computer science') || descLower.includes('graduate')) {
        educationMatch = 90;
      } else {
        educationMatch = 80;
      }
    }
  }

  // 4. Experience Match %
  let experienceMatch = null;
  if (job.title || job.description) {
    const textLower = `${job.title} ${job.description}`.toLowerCase();
    if (textLower.includes('intern') || textLower.includes('fresher') || textLower.includes('junior') || textLower.includes('entry level') || textLower.includes('associate') || textLower.includes('trainee')) {
      experienceMatch = 95;
    } else if (textLower.includes('senior') || textLower.includes('lead') || textLower.includes('principal') || textLower.includes('5+ years') || textLower.includes('7+ years')) {
      experienceMatch = 45;
    } else {
      experienceMatch = 70;
    }
  }

  // Transparent overall Profile Match %
  let profileMatch = 60;
  if (skillsMatch !== null && roleAlignment !== null) {
    profileMatch = Math.round((skillsMatch * 0.55) + (roleAlignment * 0.45));
  } else if (skillsMatch !== null) {
    profileMatch = skillsMatch;
  } else if (roleAlignment !== null) {
    profileMatch = roleAlignment;
  }

  return {
    profileMatch: Math.min(100, Math.max(20, profileMatch)),
    skillsMatch: skillsMatch !== null ? `${skillsMatch}%` : 'Not available',
    skillsMatchNum: skillsMatch,
    experienceMatch: experienceMatch !== null ? `${experienceMatch}%` : 'Not available',
    educationMatch: educationMatch !== null ? `${educationMatch}%` : 'Not available',
    matchedSkills: matched,
    missingSkills: missing,
    explanation: reqSkills.length > 0 
      ? `Based on ${matched.length} of ${reqSkills.length} listed requirements matching your resume.`
      : 'Based on alignment with your target career profile.'
  };
}

exports.getJobs = async (req, res) => {
  try {
    const { q, role, location, workMode, company } = req.query;

    const [resume, profile] = await Promise.all([
      Resume.findOne({ userId: req.user.firebaseUid }).lean(),
      CandidateProfile.findOne({ userId: req.user.firebaseUid }).lean()
    ]);

    const userSkills = resume?.parsedData?.skills || resume?.atsAnalysis?.skillsFound || [];
    const userTargetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const userDegree = profile?.degree || req.user.degree || 'B.Tech';

    // Target role becomes primary search signal if no specific q/company provided
    const effectiveRole = role || (q ? '' : userTargetRole);

    const jobs = await jobAggregator.aggregateAll({
      q,
      role: effectiveRole,
      location,
      workMode,
      company
    });

    if (!jobs || jobs.length === 0) {
      const msg = location 
        ? `No matching jobs found for ${effectiveRole || 'this role'} in ${location}. Try another location or Remote.`
        : `No matching jobs found for ${effectiveRole || 'this role'}. Try another search term or location.`;
      return res.json({ 
        success: true, 
        data: [], 
        message: msg
      });
    }

    const matchedJobs = jobs.map(job => {
      const match = calculateTransparentMatch({ userSkills, userTargetRole, userDegree, job });
      return {
        ...job,
        matchScore: match.profileMatch,
        profileMatch: match.profileMatch,
        skillsMatch: match.skillsMatch,
        experienceMatch: match.experienceMatch,
        educationMatch: match.educationMatch,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        explanation: match.explanation
      };
    });

    // Sort by Profile Match descending
    matchedJobs.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ success: true, data: matchedJobs });
  } catch (error) {
    console.error('Job fetching error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Unable to load live jobs right now. Please try again.' } 
    });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.firebaseUid });
    const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    const userSkills = resume?.parsedData?.skills || [];
    const userTargetRole = profile?.targetRole || req.user.targetRole || 'Software Engineer';
    const userDegree = profile?.degree || req.user.degree || 'B.Tech';

    let job = null;
    try {
      job = await Job.findOne({
        $or: [
          { _id: req.params.id },
          { sourceJobId: req.params.id }
        ]
      });
    } catch (e) {
      job = await Job.findOne({ sourceJobId: req.params.id });
    }

    if (!job) {
      return res.status(404).json({ success: false, error: { message: 'Job opportunity not found' } });
    }

    const match = calculateTransparentMatch({ userSkills, userTargetRole, userDegree, job });

    return res.json({
      success: true,
      data: {
        ...job.toObject ? job.toObject() : job,
        matchScore: match.profileMatch,
        profileMatch: match.profileMatch,
        skillsMatch: match.skillsMatch,
        experienceMatch: match.experienceMatch,
        educationMatch: match.educationMatch,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        explanation: match.explanation
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.getCompanyIntelligence = async (req, res) => {
  try {
    const companyName = req.query.company || 'Google';
    const roleName = req.query.role || req.user?.targetRole || 'Software Engineer';
    const forceRefresh = req.query.refresh === 'true';

    let intel = null;
    try {
      intel = await companyIntelService.getCompanyIntel(companyName, roleName, forceRefresh);
    } catch (serviceErr) {
      console.warn('[jobController] companyIntelService error, fallback to serpService:', serviceErr.message);
      intel = await serpService.searchCompany(companyName);
    }

    return res.json({ success: true, data: intel });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
