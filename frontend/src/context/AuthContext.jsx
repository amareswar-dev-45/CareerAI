import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, loginWithGoogle as firebaseLoginWithGoogle, logoutUser as firebaseLogoutUser } from '../services/firebase';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from token on page load / refresh
  const restoreSession = async () => {
    const token = localStorage.getItem('career_ai_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await API.get('/users/me');
      if (res.data && res.data.data && res.data.data.user) {
        setUser(res.data.data.user);
      } else {
        localStorage.removeItem('career_ai_token');
        setUser(null);
      }
    } catch (err) {
      console.warn('Session restoration failed:', err?.response?.data?.error?.message || err.message);
      // If unauthorized / token expired, remove invalid token
      if (err?.response?.status === 401) {
        localStorage.removeItem('career_ai_token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  // Native backend login with email & password
  const login = async (email, password) => {
    try {
      const res = await API.post('/users/login', {
        email: email.trim(),
        password
      });

      if (res.data && res.data.data) {
        const { token, user: loggedUser } = res.data.data;
        localStorage.setItem('career_ai_token', token);
        setUser(loggedUser);
        return { success: true, user: loggedUser };
      }
      throw new Error('Invalid response from server');
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  // Native backend signup with validation
  const signup = async (userData) => {
    try {
      const res = await API.post('/users/signup', userData);

      if (res.data && res.data.data) {
        const { token, user: createdUser } = res.data.data;
        localStorage.setItem('career_ai_token', token);
        setUser(createdUser);
        return { success: true, user: createdUser };
      }
      throw new Error('Invalid response from server');
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Signup failed. Please try again.';
      return { success: false, error: message };
    }
  };

  // Firebase Google OAuth login fallback
  const loginGoogle = async () => {
    try {
      const res = await firebaseLoginWithGoogle();
      const fbUser = res.user;
      const syncRes = await API.post('/users/sync', {
        firebaseUid: fbUser.uid,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        email: fbUser.email,
        role: 'student'
      });
      if (syncRes.data && syncRes.data.data) {
        localStorage.setItem('career_ai_token', syncRes.data.data.token);
        setUser(syncRes.data.data.user);
        return { success: true, user: syncRes.data.data.user };
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Google sign in failed.';
      return { success: false, error: message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await firebaseLogoutUser();
    } catch (e) {
      // Firebase logout optional
    }
    localStorage.removeItem('career_ai_token');
    setUser(null);
  };

  // Submit Student Onboarding Data
  const submitOnboarding = async (formData) => {
    try {
      const res = await API.post('/users/onboarding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.data) {
        setUser(res.data.data.user);
        return { success: true, data: res.data.data };
      }
      throw new Error('Invalid response from server');
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message || 'Onboarding submission failed';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    currentUser: user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    signup,
    loginGoogle,
    logout,
    submitOnboarding,
    setUser,
    refreshUser: restoreSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

