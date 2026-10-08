import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, Globe, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ initialMode = 'login', onSuccess, onNavigateDashboard }) {
  const { login, signup, loginGoogle } = useAuth();
  const [isSignup, setIsSignup] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSignup(initialMode === 'signup');
    setError('');
  }, [initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignup) {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }

        const res = await signup({
          name: name.trim(),
          email: email.trim(),
          password,
          department,
          collegeName: 'Government College of Engineering Kalahandi',
          role: 'student'
        });

        if (res.success) {
          if (onSuccess) onSuccess(res.user);
        } else {
          setError(res.error || 'Failed to create account. Please try again.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          if (onSuccess) onSuccess(res.user);
        } else {
          setError(res.error || 'Invalid email or password.');
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await loginGoogle();
      if (res && res.success) {
        if (onSuccess) onSuccess(res.user);
      } else if (res && res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      {/* Return to Dashboard Link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onNavigateDashboard}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">CareerAI</h2>
          <p className="text-xs text-slate-500">
            {isSignup 
              ? 'Create your account to unlock career intelligence' 
              : 'Sign in to access your placement intelligence dashboard'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignup && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  id="signup-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amareswar Nayak"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amareswar@gcek.ac.in"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {isSignup && (
              <span className="text-[11px] text-slate-400 mt-1 block">Minimum 6 characters</span>
            )}
          </div>

          {isSignup && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Department</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-xs"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-button"
            disabled={isSubmitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block animate-pulse">
                {isSignup ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : (
              <>
                <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-semibold uppercase">Or continue with</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          id="google-auth-button"
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>Continue with Google</span>
        </button>

        <div className="text-center pt-2">
          <button 
            type="button"
            id="toggle-auth-mode-button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }} 
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
