import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  FileEdit,
  Target, 
  KanbanSquare, 
  Bot, 
  Layers, 
  GitFork, 
  Sparkles, 
  MessageSquareQuote,
  Building2,
  User,
  LogOut,
  LogIn
} from 'lucide-react';
import { useCareer } from '../../context/CareerContext';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab, setIsAiDrawerOpen } = useCareer();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', path: '/jobs', label: 'Jobs', icon: Briefcase },
    { id: 'resume-builder', path: '/resume-builder', label: 'Resume Builder', icon: FileEdit },
    { id: 'resume', path: '/resume', label: 'Resume', icon: FileText },
    { id: 'job-match', path: '/job-match', label: 'Job Match', icon: Target },
    { id: 'applications', path: '/applications', label: 'Applications', icon: KanbanSquare },
    { id: 'interview', path: '/interview', label: 'Interview', icon: Bot },
    { id: 'communication', path: '/communication', label: 'Communication', icon: MessageSquareQuote },
    { id: 'skills', path: '/skills', label: 'Skills', icon: Layers },
    { id: 'roadmap', path: '/roadmap', label: 'Skills Roadmap', icon: GitFork },
  ];

  const handleNavClick = (item) => {
    if (setActiveTab) setActiveTab(item.id);
    navigate(item.path);
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      if (user && !user.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        if (setActiveTab) setActiveTab('profile');
        navigate('/profile');
      }
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async (e) => {
    e.stopPropagation();
    await logout();
    navigate('/login');
  };

  const isCurrentProfile = location.pathname === '/profile';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shadow-xl z-20 hidden md:flex">
      {/* Brand Header */}
      <div 
        onClick={() => { if (setActiveTab) setActiveTab('dashboard'); navigate('/dashboard'); }}
        className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">CareerAI</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.id === 'dashboard');
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* AI Assistant Quick Trigger */}
        <div className="pt-6 px-2">
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:animate-spin" />
              <span className="text-xs font-semibold">AI Assistant</span>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </button>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        {isAuthenticated ? (
          <div 
            id="sidebar-profile-card"
            onClick={handleProfileClick}
            className={`flex items-center gap-3 p-2 rounded-xl transition cursor-pointer group ${
              isCurrentProfile ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
            }`}
            title="Click to view/edit profile"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow">
              {user?.name ? user.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition">
                {user?.name || 'CareerAI Student'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.collegeName ? 'GCEK Kalahandi' : 'Student'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            id="sidebar-signin-button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Sign Up</span>
          </button>
        )}
      </div>
    </aside>
  );
}

