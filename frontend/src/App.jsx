import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CareerProvider, useCareer } from './context/CareerContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import AIAssistantDrawer from './components/layout/AIAssistantDrawer';

import Dashboard from './pages/Dashboard';
import JobsPage from './pages/JobsPage';
import CompanyIntelPage from './pages/CompanyIntelPage';
import ResumeATSPage from './pages/ResumeATSPage';
import ResumeBuilderPage from './pages/ResumeBuilderPage';
import SkillGapPage from './pages/SkillGapPage';
import RoadmapPage from './pages/RoadmapPage';
import InterviewCenterPage from './pages/InterviewCenterPage';
import CommunicationPage from './pages/CommunicationPage';
import ApplicationTrackerPage from './pages/ApplicationTrackerPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import CollegeAdminLoginPage from './pages/college/CollegeAdminLoginPage';
import CollegeAdminDashboardPage from './pages/college/CollegeAdminDashboardPage';

// Main App Layout for dashboard and internal pages
function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
      <MobileNav />
      <AIAssistantDrawer />
    </div>
  );
}

// Protected Route Component for pages requiring login
function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If student has not completed first-login onboarding, redirect to onboarding
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Protected Route Component for College Placement Administrators
function CollegeAdminProtectedRoute({ children }) {
  const token = localStorage.getItem('college_admin_token');
  if (!token) {
    return <Navigate to="/college" replace />;
  }
  return children;
}

// Onboarding route wrapper - only for authenticated users who have NOT completed onboarding
function OnboardingRouteWrapper() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding is already completed, go straight to Student Dashboard
  if (user && user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <OnboardingPage />;
}

// Login/Signup wrapper to handle redirects if already authenticated
function AuthRouteWrapper({ mode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user && !user.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthPage 
      initialMode={mode} 
      onSuccess={(loggedUser) => {
        if (loggedUser && !loggedUser.onboardingCompleted) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }} 
      onNavigateDashboard={() => navigate('/dashboard')} 
    />
  );
}

// Home route handler
function HomeRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading CareerAI...</p>
      </div>
    );
  }

  if (isAuthenticated && user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function AppRoutes() {
  const { loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Loading CareerAI...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<AuthRouteWrapper mode="login" />} />
      <Route path="/signup" element={<AuthRouteWrapper mode="signup" />} />
      <Route path="/auth" element={<AuthRouteWrapper mode="login" />} />

      {/* First-login Onboarding Route */}
      <Route path="/onboarding" element={<OnboardingRouteWrapper />} />

      {/* Main Pages inside Layout */}
      <Route path="/" element={<HomeRoute />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Profile Route */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage onNavigateDashboard={() => navigate('/dashboard')} />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Other App Pages */}
      <Route 
        path="/jobs" 
        element={
          <ProtectedRoute>
            <AppLayout><JobsPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/company-intel" 
        element={
          <ProtectedRoute>
            <AppLayout><CompanyIntelPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resume" 
        element={
          <ProtectedRoute>
            <AppLayout><ResumeATSPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resume-builder" 
        element={
          <ProtectedRoute>
            <AppLayout><ResumeBuilderPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/job-match" 
        element={
          <ProtectedRoute>
            <AppLayout><JobsPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/applications" 
        element={
          <ProtectedRoute>
            <AppLayout><ApplicationTrackerPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview" 
        element={
          <ProtectedRoute>
            <AppLayout><InterviewCenterPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/communication" 
        element={
          <ProtectedRoute>
            <AppLayout><CommunicationPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/skills" 
        element={
          <ProtectedRoute>
            <AppLayout><SkillGapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/skills-gap" 
        element={
          <ProtectedRoute>
            <AppLayout><SkillGapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/roadmap" 
        element={
          <ProtectedRoute>
            <AppLayout><RoadmapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      {/* College Admin Routes - Completely separated from Student AppLayout */}
      <Route path="/college" element={<CollegeAdminLoginPage />} />
      <Route 
        path="/college/dashboard" 
        element={
          <CollegeAdminProtectedRoute>
            <CollegeAdminDashboardPage />
          </CollegeAdminProtectedRoute>
        } 
      />

      {/* Catch-all redirect to Dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CareerProvider>
          <AppRoutes />
        </CareerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
