const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' }
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format. Please log in.' }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID_OR_EXPIRED', message: 'Session expired or token invalid. Please log in again.' }
      });
    }

    let user = null;
    if (decoded.uid) {
      user = await User.findOne({ firebaseUid: decoded.uid });
    }
    if (!user && decoded.id) {
      user = await User.findById(decoded.id);
    }
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User account not found. Please log in again.' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, error: { code: 'AUTH_ERROR', message: 'Unauthorized access' } });
  }
};

const authenticateCollegeAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'College administrator authentication required. Please log in.' }
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format.' }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID_OR_EXPIRED', message: 'Session expired or invalid. Please log in again.' }
      });
    }

    if (!decoded || decoded.role !== 'college_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied. College administrator privileges required.' }
      });
    }

    req.collegeAdmin = {
      id: decoded.id,
      email: decoded.email,
      role: 'college_admin',
      collegeName: decoded.collegeName || env.COLLEGE_NAME || 'GCEK'
    };

    next();
  } catch (error) {
    console.error('College admin auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Unauthorized access' }
    });
  }
};

module.exports = { authenticateUser, authenticateToken: authenticateUser, requireCollegeAdmin: authenticateCollegeAdmin, authenticateCollegeAdmin };
