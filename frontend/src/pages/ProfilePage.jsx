import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Award, 
  LogOut, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCareer } from '../context/CareerContext';
import API from '../services/api';

export default function ProfilePage({ onNavigateDashboard }) {
  const { user, logout } = useAuth();
  const { profile, setProfile, setActiveTab } = useCareer();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    collegeName: profile?.collegeName || user?.collegeName || 'Government College of Engineering Kalahandi',
    degree: profile?.degree || 'B.Tech Computer Science & Engineering',
    currentYear: profile?.currentYear || '4th Year',
    targetRole: profile?.targetRole || 'MERN Stack Developer',
    location: profile?.location || 'Bhubaneswar, India',
    workType: profile?.preferences?.workType || 'Full-time',
    desiredMinSalary: profile?.preferences?.desiredMinSalary || '₹6,00,000 / year'
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await API.patch('/profile', {
        collegeName: formData.collegeName,
        degree: formData.degree,
        currentYear: formData.currentYear,
        targetRole: formData.targetRole,
        location: formData.location,
        preferences: {
          workType: formData.workType,
          desiredMinSalary: formData.desiredMinSalary
        }
      });
      if (res.data && res.data.data) {
        setProfile(res.data.data);
      }
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error?.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (onNavigateDashboard) {
      onNavigateDashboard();
    } else if (setActiveTab) {
      setActiveTab('dashboard');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateDashboard ? onNavigateDashboard() : (setActiveTab && setActiveTab('dashboard'))}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={handleLogout}
          id="logout-button"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 border-2 border-white/20">
            {getInitials(user?.name)}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{user?.name || 'CareerAI Student'}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.role === 'college_admin' ? 'College Administrator' : 'Verified Student'}
              </span>
            </div>

            <p className="text-sm text-slate-300 flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>{user?.email || 'student@gcek.ac.in'}</span>
            </p>

            <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{user?.collegeName || 'Government College of Engineering Kalahandi (GCEK)'}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur border border-white/10 transition"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Readiness Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Readiness Score</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{profile?.readinessScore || 78}%</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">ATS Resume Score</span>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">{profile?.resumeScore || 86}%</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Skills Match</span>
            <div className="text-xl font-bold text-blue-400 mt-0.5">{profile?.skillsScore || 72}%</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Interview Score</span>
            <div className="text-xl font-bold text-purple-400 mt-0.5">{profile?.interviewScore || 68}%</div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Academic Information</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">College / University</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.collegeName}
                  onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="font-semibold text-slate-700">{formData.collegeName}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Degree & Branch</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="font-semibold text-slate-700">{formData.degree}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Current Academic Year</span>
              {isEditing ? (
                <select
                  value={formData.currentYear}
                  onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Alumni">Alumni / Graduate</option>
                </select>
              ) : (
                <p className="font-semibold text-slate-700">{formData.currentYear}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Expected Graduation Year</span>
              <p className="font-semibold text-slate-700">{user?.graduationYear || '2026'}</p>
            </div>
          </div>
        </div>

        {/* Career Preferences */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Career & Placement Preferences</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Target Job Role</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  placeholder="e.g. MERN Stack Developer, Data Analyst"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="font-semibold text-indigo-600">{formData.targetRole}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Preferred Location</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="font-semibold text-slate-700">{formData.location}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Preferred Work Type</span>
              {isEditing ? (
                <select
                  value={formData.workType}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                  <option value="Contract">Contract</option>
                </select>
              ) : (
                <p className="font-semibold text-slate-700">{formData.workType}</p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Desired Compensation</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.desiredMinSalary}
                  onChange={(e) => setFormData({ ...formData, desiredMinSalary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <p className="font-semibold text-slate-700">{formData.desiredMinSalary}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button in edit mode */}
      {isEditing && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
