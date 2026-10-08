import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  KanbanSquare, 
  Bot, 
  Building2,
  User,
  LogIn
} from 'lucide-react';
import { useCareer } from '../../context/CareerContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab } = useCareer();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'jobs', path: '/jobs', label: 'Jobs', icon: Briefcase },
    { id: 'resume', path: '/resume', label: 'Resume', icon: FileText },
    { id: 'applications', path: '/applications', label: 'Tracker', icon: KanbanSquare },
    { id: 'interview', path: '/interview', label: 'Mock AI', icon: Bot },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-30 md:hidden shadow-lg">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (location.pathname === '/' && item.id === 'dashboard');
        return (
          <button
            key={item.id}
            onClick={() => {
              if (setActiveTab) setActiveTab(item.id);
              navigate(item.path);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}

      {/* Profile / Account Item */}
      <button
        id="mobile-profile-button"
        onClick={() => {
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
        }}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
          location.pathname === '/profile' ? 'text-indigo-600 font-bold' : 'text-slate-500'
        }`}
      >
        {isAuthenticated ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
        <span className="text-[10px]">{isAuthenticated ? 'Profile' : 'Sign In'}</span>
      </button>
    </nav>
  );
}

