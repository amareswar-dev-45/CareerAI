import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Sparkles, User } from 'lucide-react';
import { useCareer } from '../../context/CareerContext';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setIsAiDrawerOpen } = useCareer();
  const { user, isAuthenticated } = useAuth();

  const titleMap = {
    dashboard: 'Dashboard',
    profile: 'My Profile & Career Preferences',
    jobs: 'Find Your Next Opportunity',
    'resume-builder': 'Interactive Resume Builder',
    resume: 'My Resume & ATS Score',
    'job-match': 'Job Match Intelligence',
    applications: 'Applications Tracker',
    interview: 'AI Mock Interview Center',
    skills: 'Skill Gap Analysis',
    roadmap: '30-Day AI Career Roadmap',
    college: 'College Employability Dashboard'
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      if (user && !user.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/profile');
      }
    } else {
      navigate('/login');
    }
  };

  const currentTab = location.pathname.replace('/', '') || activeTab || 'dashboard';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
          {titleMap[currentTab] || 'CareerAI'}
        </h1>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search jobs, skills, companies..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 border border-transparent rounded-full focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsAiDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative transition">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-indigo-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

        {/* Profile / User Icon Button */}
        <div className="pl-2 border-l border-slate-200">
          <button
            id="profile-icon-button"
            onClick={handleProfileClick}
            className="flex items-center gap-2 cursor-pointer focus:outline-none group"
            title={isAuthenticated ? `Logged in as ${user?.name || 'User'} (Click for Profile)` : "Click to Sign In"}
          >
            {isAuthenticated ? (
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow group-hover:ring-2 group-hover:ring-indigo-500 group-hover:scale-105 transition-all">
                {user?.name ? user.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold border border-slate-200 hover:border-indigo-300 transition-all">
                <User className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600" />
                <span className="hidden sm:inline">Sign In</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

