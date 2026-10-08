import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  FileCheck, 
  Bot, 
  GitFork, 
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  XCircle
} from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, setActiveTab } = useCareer();
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Amareswar';

  const isSkipped = profile?.resumeStatus === 'skipped';
  const validatedScore = Math.max(0, Math.min(100, Math.round(profile?.readinessScore ?? (isSkipped ? 10 : 78))));
  const b = profile?.readinessBreakdown || {
    resumeSkills: { score: isSkipped ? 0 : Math.round(((profile?.resumeScore || 80) / 100) * 30), max: 30, label: 'Resume Skills' },
    targetRoleMatch: { score: isSkipped ? 0 : Math.round(((profile?.skillsScore || 75) / 100) * 25), max: 25, label: 'Target Role Match' },
    experienceProjects: { score: isSkipped ? 0 : 15, max: 20, label: 'Experience & Projects' },
    interviewReadiness: { score: Math.round(((profile?.interviewScore || 0) / 100) * 15), max: 15, label: 'Interview Readiness' },
    profileCompleteness: { score: Math.round(((profile?.profileCompletion || (isSkipped ? 100 : 85)) / 100) * 10), max: 10, label: 'Profile Completeness' }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Good morning, {firstName} 👋
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Build your dream career, one step at a time.
          </p>
        </div>
      </div>

      {/* Resume Skipped Notice Banner */}
      {isSkipped && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Resume Skipped During Onboarding</p>
              <p className="text-amber-700 text-[11px]">
                Your readiness is currently marked as <strong>Insufficient profile evidence</strong>. Build a structured resume or upload your file at any time to unlock verified ATS score and skill matching.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('builder');
                navigate('/resume-builder');
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Create Resume
            </button>
            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('resume');
                navigate('/resume');
              }}
              className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Upload Resume
            </button>
          </div>
        </div>
      )}

      {/* Top Grid: Career Readiness & Next Best Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Readiness Gauge with Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex flex-col items-center">
            <ScoreGauge value={validatedScore} size={130} color={isSkipped ? '#F59E0B' : (validatedScore >= 75 ? '#10B981' : (validatedScore >= 55 ? '#0EA5E9' : '#F59E0B'))} />
            <div className="mt-2 text-center">
              <span className="text-2xl font-black text-slate-900">{validatedScore}</span>
              <span className="text-xs font-bold text-slate-400">/100</span>
            </div>
            {isSkipped ? (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 text-center">
                Insufficient profile evidence
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                Normalized & Grounded
              </span>
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isSkipped ? 'Profile Evidence' : 'Career Readiness'}
              </h3>
              <span className="text-[11px] font-bold text-indigo-600">{validatedScore}/100 Total</span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] mb-0.5">
                  <span>Resume Skills</span>
                  <span className="font-bold text-slate-800">
                    {isSkipped ? 'Not provided (0/30)' : `${b.resumeSkills?.score || 0}/30`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${isSkipped ? 0 : ((b.resumeSkills?.score || 0) / 30) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] mb-0.5">
                  <span>Target Role Match</span>
                  <span className="font-bold text-slate-800">
                    {isSkipped ? 'Unverified (0/25)' : `${b.targetRoleMatch?.score || 0}/25`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${isSkipped ? 0 : ((b.targetRoleMatch?.score || 0) / 25) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] mb-0.5">
                  <span>Experience / Projects</span>
                  <span className="font-bold text-slate-800">
                    {isSkipped ? 'Not provided (0/20)' : `${b.experienceProjects?.score || 0}/20`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${isSkipped ? 0 : ((b.experienceProjects?.score || 0) / 20) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] mb-0.5">
                  <span>Interview Readiness</span>
                  <span className="font-bold text-slate-800">{b.interviewReadiness?.score || 0}/15</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((b.interviewReadiness?.score || 0) / 15) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-600 text-[11px] mb-0.5">
                  <span>Profile Completeness</span>
                  <span className="font-bold text-slate-800">{b.profileCompleteness?.score || 0}/10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${((b.profileCompleteness?.score || 0) / 10) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Best Action Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between col-span-1 md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Your Next Best Action</span>
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Address identified skill gaps for {profile.targetRole || user?.targetRole || 'Software Engineer'}.
            </h4>
            <p className="text-xs text-slate-600 max-w-xl">
              Target role: <span className="font-semibold text-indigo-900">{profile.targetRole || user?.targetRole || 'Software Engineer'}</span>. Benchmark your real resume skills against hiring expectations to elevate your placement readiness.
            </p>
          </div>

          <div className="pt-4">
            <button 
              id="dashboard-view-skill-gap-button"
              onClick={() => {
                if (setActiveTab) setActiveTab('skills');
                navigate('/skills');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <span>View Skill Gap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Applications Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Applications</p>
            <p className="text-xl font-bold text-slate-800">24</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Interviews</p>
            <p className="text-xl font-bold text-slate-800">5</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Offers</p>
            <p className="text-xl font-bold text-slate-800">1</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Rejected</p>
            <p className="text-xl font-bold text-slate-800">8</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Recent Applications & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Applications List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Recent Applications</h3>
            <button 
              onClick={() => setActiveTab('applications')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              View all →
            </button>
          </div>

          <div className="space-y-3">
            {[
              { company: 'Google', role: 'SDE Intern', date: 'Applied • Sep 20', status: 'Interview', color: 'bg-indigo-50 text-indigo-700' },
              { company: 'Microsoft', role: 'Software Intern', date: 'Applied • Sep 18', status: 'Applied', color: 'bg-blue-50 text-blue-700' },
              { company: 'Startup XYZ', role: 'MERN Intern', date: 'Applied • Sep 15', status: 'Assessment', color: 'bg-amber-50 text-amber-700' }
            ].map((app, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {app.company[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{app.company}</h4>
                    <p className="text-[11px] text-slate-500">{app.role} • {app.date}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${app.color}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Find Jobs', desc: 'Explore 1000+ opportunities', icon: Search, tab: 'jobs' },
              { label: 'Check Resume ATS Score', desc: 'Get detailed feedback', icon: FileCheck, tab: 'resume' },
              { label: 'Start AI Interview', desc: 'Practice with real companies', icon: Bot, tab: 'interview' },
              { label: 'View Career Roadmap', desc: 'Your personalized plan', icon: GitFork, tab: 'roadmap' }
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => setActiveTab(action.tab)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition group text-left"
                >
                  <div className="p-2 bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white rounded-lg text-slate-600 transition">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">{action.label}</h4>
                    <p className="text-[10px] text-slate-500">{action.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
