const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const Resume = require('../models/Resume');
const ATSAnalysis = require('../models/ATSAnalysis');
const pdfParse = require('pdf-parse');
const aiService = require('../services/aiService');
const { calculateCareerReadiness } = require('../utils/readinessEngine');

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      uid: user.firebaseUid, 
      id: user._id, 
      email: user.email, 
      name: user.name, 
      role: user.role 
    },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Signup Endpoint
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, collegeName, department, graduationYear } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Full name is required.' }
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email address is required.' }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please enter a valid email address.' }
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long.' }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'An account with this email already exists. Please log in.' }
      });
    }

    // Create user with password (hashed via pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'student',
      institutionId: 'GCEK-MAIN',
      collegeName: collegeName || 'Government College of Engineering Kalahandi',
      department: department || 'Computer Science & Engineering',
      graduationYear: graduationYear || '2026'
    });

    // Ensure CandidateProfile exists
    let profile = await CandidateProfile.findOne({ userId: user.firebaseUid });
    if (!profile) {
      profile = await CandidateProfile.create({
        userId: user.firebaseUid,
        targetRole: 'MERN Stack Developer',
        collegeName: user.collegeName,
        degree: 'B.Tech ' + (user.department || 'Computer Science')
      });
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        profile,
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Signup failed. Please try again.' }
    });
  }
};

// Login Endpoint
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email address is required.' }
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password is required.' }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user including password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // If account was created without a password (e.g. initial Google OAuth / demo seed)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'PASSWORD_NOT_SET', 
          message: 'This account was signed up via Google or single sign-on. Please use Google Sign In or reset password.' 
        }
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Ensure CandidateProfile exists
    let profile = await CandidateProfile.findOne({ userId: user.firebaseUid });
    if (!profile) {
      profile = await CandidateProfile.create({
        userId: user.firebaseUid,
        targetRole: 'MERN Stack Developer',
        collegeName: user.collegeName
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        profile,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Login failed. Please try again.' }
    });
  }
};

// Sync User (for Firebase OAuth or external auth)
exports.syncUser = async (req, res) => {
  try {
    const { firebaseUid, name, email, role } = req.body;
    let user = null;

    if (firebaseUid) {
      user = await User.findOne({ firebaseUid });
    }
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      user = await User.create({
        firebaseUid: firebaseUid || `user-${Date.now()}`,
        name: name || (email ? email.split('@')[0] : 'CareerAI Student'),
        email: email ? email.toLowerCase().trim() : 'student@gcek.ac.in',
        role: role || 'student'
      });
    } else if (firebaseUid && !user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }

    // Ensure CandidateProfile exists
    let profile = await CandidateProfile.findOne({ userId: user.firebaseUid });
    if (!profile) {
      profile = await CandidateProfile.create({
        userId: user.firebaseUid,
        targetRole: 'MERN Stack Developer',
        collegeName: user.collegeName
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      data: { user: sanitizeUser(user), profile, token }
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Get Current Logged-in User
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    let profile = await CandidateProfile.findOne({ userId: user.firebaseUid });
    if (!profile) {
      profile = await CandidateProfile.create({ 
        userId: user.firebaseUid,
        targetRole: 'MERN Stack Developer',
        collegeName: user.collegeName 
      });
    }
    return res.json({ success: true, data: { user: sanitizeUser(user), profile } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Get Candidate Profile
exports.getProfile = async (req, res) => {
  try {
    let profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
    if (!profile) {
      profile = await CandidateProfile.create({ 
        userId: req.user.firebaseUid,
        targetRole: 'MERN Stack Developer',
        collegeName: req.user.collegeName 
      });
    }

    // Ensure valid bounded readinessScore & complete breakdown
    if (!profile.readinessBreakdown || profile.readinessScore > 100) {
      const resume = await Resume.findOne({ userId: req.user.firebaseUid });
      const ats = await ATSAnalysis.findOne({ userId: req.user.firebaseUid });
      const readiness = calculateCareerReadiness({
        resumeSkills: resume?.parsedData?.skills || ats?.skillsFound || [],
        roleMatchPercentage: profile.skillsScore || 70,
        atsScore: profile.resumeScore || 75,
        hasProjects: true,
        projectCount: 2,
        interviewScore: profile.interviewScore || 70,
        profile: {
          collegeName: profile.collegeName,
          degree: profile.degree,
          targetRole: profile.targetRole,
          dreamCompany: profile.dreamCompany
        }
      });
      profile.readinessScore = readiness.readinessScore;
      profile.readinessBreakdown = readiness.breakdown;
      await CandidateProfile.updateOne(
        { _id: profile._id },
        { $set: { readinessScore: readiness.readinessScore, readinessBreakdown: readiness.breakdown } }
      );
    }

    return res.json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Update Candidate Profile
exports.updateProfile = async (req, res) => {
  try {
    const updated = await CandidateProfile.findOneAndUpdate(
      { userId: req.user.firebaseUid },
      { $set: req.body },
      { new: true, upsert: true }
    );
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Complete Student Onboarding
exports.completeOnboarding = async (req, res) => {
  try {
    const { collegeName, degree, graduationYear = '2026', dreamCompany, targetRole } = req.body;
    const user = req.user;

    if (!collegeName || !collegeName.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'College name is required.' }
      });
    }

    if (!degree || !degree.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Degree is required.' }
      });
    }

    if (!dreamCompany || !dreamCompany.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dream company is required.' }
      });
    }

    if (!targetRole || !targetRole.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Target role is required.' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please upload your resume file.' }
      });
    }

    let extractedText = `${user.name} | ${degree} | ${collegeName} | Target: ${targetRole}`;
    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        try {
          const parsedPdf = await pdfParse(req.file.buffer);
          if (parsedPdf.text && parsedPdf.text.trim()) {
            extractedText = parsedPdf.text;
          }
        } catch (e) {
          console.log('PDF Parse notice in onboarding:', e.message);
          extractedText = req.file.buffer.toString('utf-8');
        }
      } else {
        extractedText = req.file.buffer.toString('utf-8');
      }
    }

    // Real ATS Analysis against target role using Groq
    const atsResult = await aiService.analyzeResumeAgainstTargetRole(extractedText, targetRole.trim());
    const atsScore = atsResult.atsScore || 75;

    const resumeDoc = await Resume.findOneAndUpdate(
      { userId: user.firebaseUid },
      {
        $set: {
          fileUrl: `uploads/${req.file.originalname}`,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          extractedText,
          parsedData: {
            skills: atsResult.skillsFound || [],
            education: [{ institution: collegeName.trim(), degree: degree.trim(), year: (graduationYear || '2026').trim() }],
            experience: [],
            projects: []
          },
          targetRole: targetRole.trim(),
          atsScore: atsScore,
          atsAnalysis: atsResult
        }
      },
      { new: true, upsert: true }
    );

    const atsAnalysisDoc = await ATSAnalysis.findOneAndUpdate(
      { userId: user.firebaseUid },
      {
        $set: {
          targetRole: targetRole.trim(),
          score: atsScore,
          atsScore: atsScore,
          requiredSkills: atsResult.requiredSkills || [],
          skillsFound: atsResult.skillsFound || [],
          missingSkills: atsResult.missingSkills || [],
          strengths: atsResult.strengths || [],
          improvements: atsResult.improvements || [],
          relevantExperience: atsResult.relevantExperience || 'Relevant academic or personal projects listed',
          educationMatch: atsResult.educationMatch || 'Degree matches standard technical prerequisites',
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

    // Update user record
    user.collegeName = collegeName.trim();
    user.degree = degree.trim();
    user.graduationYear = (graduationYear || '2026').trim();
    user.dreamCompany = dreamCompany.trim();
    user.targetRole = targetRole.trim();
    user.onboardingCompleted = true;
    await user.save();

    // Calculate scientifically normalized career readiness
    const readiness = calculateCareerReadiness({
      resumeSkills: atsResult.skillsFound || [],
      roleMatchPercentage: atsAnalysisDoc.skillsMatchScore,
      atsScore: atsScore,
      hasProjects: true,
      projectCount: 2,
      interviewScore: 70,
      profile: {
        collegeName: user.collegeName,
        degree: user.degree,
        targetRole: user.targetRole,
        dreamCompany: user.dreamCompany
      }
    });

    // Update CandidateProfile record
    const profile = await CandidateProfile.findOneAndUpdate(
      { userId: user.firebaseUid },
      {
        $set: {
          name: user.name,
          email: user.email,
          collegeName: user.collegeName,
          degree: user.degree,
          graduationYear: user.graduationYear,
          dreamCompany: user.dreamCompany,
          targetRole: user.targetRole,
          resumeScore: atsScore,
          skillsScore: atsAnalysisDoc.skillsMatchScore,
          readinessScore: readiness.readinessScore,
          readinessBreakdown: readiness.breakdown,
          onboardingCompleted: true
        }
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        user: sanitizeUser(user),
        profile,
        resume: resumeDoc,
        atsAnalysis: atsResult
      }
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to complete onboarding.' }
    });
  }
};


