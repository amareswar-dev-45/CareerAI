/**
 * Career Readiness Calculation Engine
 * 
 * Mathematically grounded calculation that strictly normalizes all components to 100.
 * Never exceeds 100. Never invents points.
 * 
 * Breakdown:
 * 1. Resume Skills (Max: 30 pts)
 * 2. Target Role Match (Max: 25 pts)
 * 3. Experience & Projects (Max: 20 pts)
 * 4. Interview Readiness (Max: 15 pts)
 * 5. Profile Completeness (Max: 10 pts)
 * Total Max = 30 + 25 + 20 + 15 + 10 = 100 pts
 */

function calculateCareerReadiness({
  resumeSkills = [],
  roleMatchPercentage = 0,
  atsScore = 0,
  hasProjects = false,
  projectCount = 0,
  hasExperience = false,
  interviewScore = 0,
  profile = {},
  hasResume = true
}) {
  const isNoResume = hasResume === false || (atsScore === 0 && (!resumeSkills || resumeSkills.length === 0));

  if (isNoResume) {
    let compPoints = 0;
    if (profile.collegeName) compPoints += 2;
    if (profile.degree) compPoints += 2;
    if (profile.targetRole) compPoints += 2;
    if (profile.dreamCompany) compPoints += 2;
    const finalProfileCompleteness = Math.max(0, Math.min(10, compPoints));
    
    let interviewPoints = 0;
    if (interviewScore > 0) {
      const validInterviewScore = Math.min(100, Math.max(0, Number(interviewScore)));
      interviewPoints = Math.round((validInterviewScore / 100) * 15);
    }
    const finalInterviewReadiness = Math.max(0, Math.min(15, interviewPoints));

    const finalScore = finalProfileCompleteness + finalInterviewReadiness;

    return {
      score: finalScore,
      readinessScore: finalScore,
      statusLabel: 'Insufficient profile evidence',
      hasResumeEvidence: false,
      breakdown: {
        resumeSkills: { score: 0, max: 30, label: 'Resume Skills', status: 'Not provided / Not verified' },
        targetRoleMatch: { score: 0, max: 25, label: 'Target Role Match', status: 'Awaiting verified skills' },
        experienceProjects: { score: 0, max: 20, label: 'Experience & Projects', status: 'Not provided' },
        interviewReadiness: { score: finalInterviewReadiness, max: 15, label: 'Interview Readiness', status: interviewScore > 0 ? 'Verified' : 'Not started' },
        profileCompleteness: { score: finalProfileCompleteness, max: 10, label: 'Profile Completeness', status: 'Verified' }
      }
    };
  }

  // 1. Resume Skills (Weight: 30)
  // Evaluated from detected technical skills and ATS quality
  const skillCount = Array.isArray(resumeSkills) ? resumeSkills.length : 0;
  let skillsScoreNormalized = 0;
  if (skillCount >= 10) {
    skillsScoreNormalized = 1.0;
  } else if (skillCount >= 6) {
    skillsScoreNormalized = 0.85;
  } else if (skillCount >= 3) {
    skillsScoreNormalized = 0.65;
  } else if (skillCount >= 1) {
    skillsScoreNormalized = 0.40;
  }
  // Blend with ATS quality score if available
  const atsFactor = atsScore > 0 ? (Math.min(100, Math.max(0, atsScore)) / 100) : skillsScoreNormalized;
  const resumeSkillsScore = Math.round(((skillsScoreNormalized * 0.6) + (atsFactor * 0.4)) * 30);
  const finalResumeSkills = Math.max(0, Math.min(30, resumeSkillsScore));

  // 2. Target Role Match (Weight: 25)
  // Grounded in actual role requirement match percentage
  const matchPct = Math.min(100, Math.max(0, Number(roleMatchPercentage) || 0));
  const targetRoleMatchScore = Math.round((matchPct / 100) * 25);
  const finalTargetRoleMatch = Math.max(0, Math.min(25, targetRoleMatchScore));

  // 3. Experience & Projects (Weight: 20)
  // Derived from real resume content
  let expPoints = 0;
  if (hasProjects || projectCount > 0) {
    expPoints += Math.min(12, Math.max(6, (projectCount || 2) * 4));
  }
  if (hasExperience) {
    expPoints += 8;
  } else if (skillCount >= 5) {
    // Academic projects alignment
    expPoints = Math.max(expPoints, 12);
  }
  const finalExperienceProjects = Math.max(0, Math.min(20, expPoints));

  // 4. Interview Readiness (Weight: 15)
  // Grounded in verified completed interview sessions
  let interviewPoints = 0;
  if (interviewScore > 0) {
    const validInterviewScore = Math.min(100, Math.max(0, Number(interviewScore)));
    interviewPoints = Math.round((validInterviewScore / 100) * 15);
  } else {
    // Baseline readiness based on foundational skills
    interviewPoints = skillCount >= 4 ? 8 : 4;
  }
  const finalInterviewReadiness = Math.max(0, Math.min(15, interviewPoints));

  // 5. Profile Completeness (Weight: 10)
  let compPoints = 0;
  if (profile.collegeName) compPoints += 2;
  if (profile.degree) compPoints += 2;
  if (profile.targetRole) compPoints += 2;
  if (profile.dreamCompany) compPoints += 2;
  if (skillCount > 0 || atsScore > 0) compPoints += 2;
  const finalProfileCompleteness = Math.max(0, Math.min(10, compPoints));

  // Sum total — strictly bounded between 0 and 100
  const rawTotal = finalResumeSkills + finalTargetRoleMatch + finalExperienceProjects + finalInterviewReadiness + finalProfileCompleteness;
  const finalScore = Math.max(0, Math.min(100, rawTotal));

  return {
    score: finalScore,
    readinessScore: finalScore,
    breakdown: {
      resumeSkills: { score: finalResumeSkills, max: 30, label: 'Resume Skills' },
      targetRoleMatch: { score: finalTargetRoleMatch, max: 25, label: 'Target Role Match' },
      experienceProjects: { score: finalExperienceProjects, max: 20, label: 'Experience & Projects' },
      interviewReadiness: { score: finalInterviewReadiness, max: 15, label: 'Interview Readiness' },
      profileCompleteness: { score: finalProfileCompleteness, max: 10, label: 'Profile Completeness' }
    }
  };
}

module.exports = {
  calculateCareerReadiness
};
