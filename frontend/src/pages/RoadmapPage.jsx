import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  BookOpen, 
  Code, 
  Check, 
  Calendar, 
  ArrowRight, 
  Target,
  RefreshCw, 
  Award, 
  AlertCircle,
  Building2,
  Briefcase,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  PlayCircle,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  FolderGit2,
  SlidersHorizontal,
  X,
  Plus
} from 'lucide-react';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function RoadmapPage() {
  const navigate = useNavigate();
  const { roadmap, setRoadmap, profile } = useCareer();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!roadmap);
  const [generating, setGenerating] = useState(false);
  const [updatingSkillId, setUpdatingSkillId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // View & Filter State
  const [activeView, setActiveView] = useState('phases'); // 'phases' | 'weekly' | 'projects'
  const [filterPriority, setFilterPriority] = useState('all'); // 'all' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'Not Started' | 'Learning' | 'Completed'

  // Expandable States
  const [expandedPhases, setExpandedPhases] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true });
  const [expandedSkills, setExpandedSkills] = useState({});

  // Change Target Modal State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [modalCompany, setModalCompany] = useState('');
  const [modalRole, setModalRole] = useState('');
  const [modalWeeks, setModalWeeks] = useState(8);
  const [modalSkills, setModalSkills] = useState([]);
  const [skillTagInput, setSkillTagInput] = useState('');

  // Fetch current roadmap on mount if not loaded
  const fetchCurrentRoadmap = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/roadmap/current');
      if (res.data && res.data.success && res.data.data) {
        setRoadmap(res.data.data);
      }
    } catch (e) {
      console.error('Roadmap fetch notice:', e);
      setError(e.response?.data?.error?.message || 'Could not load your skills roadmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roadmap) {
      fetchCurrentRoadmap();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Open Target Modal & Prefill
  const handleOpenTargetModal = () => {
    const comp = roadmap?.targetCompany || profile?.dreamCompany || user?.dreamCompany || 'TCS';
    const rle = roadmap?.targetRole || profile?.targetRole || user?.targetRole || 'Software Developer';
    setModalCompany(comp);
    setModalRole(rle);
    setModalWeeks(roadmap?.durationWeeks || 8);
    setModalSkills(Array.isArray(roadmap?.currentSkills) ? [...roadmap.currentSkills] : []);
    setIsTargetModalOpen(true);
  };

  // Add tag in modal
  const handleAddModalSkill = () => {
    if (skillTagInput.trim() && !modalSkills.includes(skillTagInput.trim())) {
      setModalSkills([...modalSkills, skillTagInput.trim()]);
      setSkillTagInput('');
    }
  };

  // Remove tag in modal
  const handleRemoveModalSkill = (skillToRemove) => {
    setModalSkills(modalSkills.filter(s => s !== skillToRemove));
  };

  // Generate / Regenerate Roadmap
  const handleGenerateRoadmap = async ({ company, role, durationWeeks, currentSkills } = {}) => {
    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const comp = company || roadmap?.targetCompany || profile?.dreamCompany || 'TCS';
      const rle = role || roadmap?.targetRole || profile?.targetRole || 'Software Developer';
      const weeks = durationWeeks || roadmap?.durationWeeks || 8;
      const skills = currentSkills || roadmap?.currentSkills || [];

      const res = await API.post('/roadmap/generate', {
        company: comp,
        role: rle,
        durationWeeks: weeks,
        currentSkills: skills
      });

      if (res.data && res.data.success) {
        setRoadmap(res.data.data);
        setIsTargetModalOpen(false);
        setSuccessMsg(`Roadmap tailored for ${comp} — ${rle} generated successfully!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res.data?.error?.message || 'Failed to generate roadmap.');
      }
    } catch (err) {
      console.error('Roadmap generate error:', err);
      setError(err.response?.data?.error?.message || 'Failed to generate roadmap. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Update Individual Skill Status
  const handleUpdateSkillStatus = async (skillId, newStatus) => {
    if (updatingSkillId) return;
    setUpdatingSkillId(skillId);

    // Optimistic UI update
    if (roadmap && Array.isArray(roadmap.roadmap)) {
      const updatedPhases = roadmap.roadmap.map(phase => ({
        ...phase,
        skills: (phase.skills || []).map(s => s.id === skillId ? { ...s, status: newStatus } : s)
      }));

      let total = 0;
      let completed = 0;
      updatedPhases.forEach(p => {
        (p.skills || []).forEach(s => {
          total++;
          if (s.status === 'Completed') completed++;
        });
      });
      const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      setRoadmap({
        ...roadmap,
        roadmap: updatedPhases,
        overallProgress: newProgress
      });
    }

    try {
      const res = await API.patch('/roadmap/skill-status', {
        skillId,
        status: newStatus
      });

      if (res.data && res.data.success) {
        setRoadmap(prev => ({
          ...prev,
          roadmap: res.data.data.roadmap,
          overallProgress: res.data.data.overallProgress
        }));
      }
    } catch (err) {
      console.error('Skill update error:', err);
      // Revert by re-fetching
      fetchCurrentRoadmap();
    } finally {
      setUpdatingSkillId(null);
    }
  };

  // Toggle Phase Accordion
  const togglePhase = (phaseNum) => {
    setExpandedPhases(prev => ({ ...prev, [phaseNum]: !prev[phaseNum] }));
  };

  // Toggle Skill Card Detail
  const toggleSkillDetail = (skillId) => {
    setExpandedSkills(prev => ({ ...prev, [skillId]: !prev[skillId] }));
  };

  // Derived metrics
  const targetCompany = roadmap?.targetCompany || profile?.dreamCompany || user?.dreamCompany || 'TCS';
  const targetRole = roadmap?.targetRole || profile?.targetRole || user?.targetRole || 'Software Developer';
  const readinessScore = roadmap?.readinessScore || 65;
  const overallProgress = roadmap?.overallProgress || 0;
  const durationWeeks = roadmap?.durationWeeks || 8;
  const phases = Array.isArray(roadmap?.roadmap) ? roadmap.roadmap : [];
  const weeklyPlan = Array.isArray(roadmap?.weeklyPlan) ? roadmap.weeklyPlan : [];
  const projects = Array.isArray(roadmap?.projects) ? roadmap.projects : [];
  const sources = Array.isArray(roadmap?.sources) ? roadmap.sources : [];
  const skillGaps = roadmap?.skillGaps || { strong: [], needsImprovement: [], missing: [], highPriority: [], optional: [] };
  const interviewWeaknesses = Array.isArray(roadmap?.interviewWeaknesses) ? roadmap.interviewWeaknesses : [];
  const recommendedNextSkill = roadmap?.recommendedNextSkill || null;

  // Flattened skills for count & filtering
  const allSkills = phases.flatMap(p => p.skills || []);
  const completedSkillsCount = allSkills.filter(s => s.status === 'Completed').length;
  const learningSkillsCount = allSkills.filter(s => s.status === 'Learning').length;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 animate-pulse">
          <GitFork className="w-7 h-7 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-slate-800">Analyzing Target Company & Job Postings...</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Researching live qualifications, interview questions, and mapping your personalized learning dependencies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      
      {/* 1. TOP BANNER: TARGET COMPANY & ROLE + ACTIONS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Company-Specific Learning Roadmap</span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Continue with your target:</p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center gap-3 mt-1">
                <span className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-indigo-400" />
                  {targetCompany}
                </span>
                <span className="text-indigo-400 font-light">—</span>
                <span className="text-indigo-200">{targetRole}</span>
              </h1>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Curated from verified {targetCompany} job descriptions, candidate interview reports, and your current skills. 
              Skills are strictly sequenced from fundamentals to production systems.
            </p>
          </div>

          {/* Quick Actions & Modal Trigger */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              id="change-target-modal-btn"
              onClick={handleOpenTargetModal}
              disabled={generating}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-300" />
              <span>Change Target</span>
            </button>

            <button
              id="regenerate-roadmap-btn"
              onClick={() => handleGenerateRoadmap()}
              disabled={generating}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Regenerating...' : 'Regenerate Roadmap'}</span>
            </button>
          </div>
        </div>

        {/* METRICS STRIP: Readiness Gauge & Overall Progress */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Readiness Score */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Target Role Readiness</p>
              <p className="text-2xl font-black text-white mt-0.5">{readinessScore}%</p>
              <span className={`text-[10px] font-bold ${
                readinessScore >= 75 ? 'text-emerald-400' : readinessScore >= 55 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {readinessScore >= 75 ? 'Target Ready' : readinessScore >= 55 ? 'Moderate Gap' : 'Foundational'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-300">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Overall Progress */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400">Roadmap Progress</p>
              <span className="text-xs font-bold text-emerald-400">{overallProgress}%</span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {completedSkillsCount} of {allSkills.length} skills completed
            </p>
          </div>

          {/* Duration */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Preparation Timeline</p>
              <p className="text-2xl font-black text-white mt-0.5">{durationWeeks} Weeks</p>
              <p className="text-[10px] text-slate-400">{durationWeeks * 7} Days Scheduled</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/20 flex items-center justify-center text-purple-300">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Active Learning */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Learning in Progress</p>
              <p className="text-2xl font-black text-white mt-0.5">{learningSkillsCount}</p>
              <p className="text-[10px] text-indigo-300">{allSkills.length - completedSkillsCount - learningSkillsCount} remaining</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/20 flex items-center justify-center text-amber-300">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold text-red-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-bold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. ADAPTIVE INTERVIEW WEAKNESSES ALERT (Requirement 9) */}
      {interviewWeaknesses.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-purple-950 flex items-center gap-2">
                <span>Adaptive Interview Simulator Weaknesses Detected</span>
                <span className="text-[10px] bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  High Priority Sync
                </span>
              </h4>
              <p className="text-[11px] text-purple-800">
                Your recent mock interview identified weaknesses in: <strong>{interviewWeaknesses.join(', ')}</strong>. 
                These topics are marked with an <em>"Interview focus"</em> badge and elevated to HIGH priority below.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/interview')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <span>Retest in Interview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. RECOMMENDED NEXT SKILL CARD (Requirement 7) */}
      {recommendedNextSkill && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Recommended Next Focus
                </span>
                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                  {recommendedNextSkill.priority || 'HIGH'} Priority
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Master {recommendedNextSkill.name}
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {recommendedNextSkill.why || `Crucial requirement for ${targetRole} positions at ${targetCompany}. Estimated ~${recommendedNextSkill.estimatedDays || 3} days to complete.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs hidden sm:block">
              <span className="text-slate-500 block">Est. Duration</span>
              <span className="font-bold text-slate-800">~{recommendedNextSkill.estimatedDays || 3} Days</span>
            </div>
            <button
              onClick={() => {
                const matched = allSkills.find(s => s.name?.toLowerCase() === recommendedNextSkill.name?.toLowerCase());
                if (matched) {
                  handleUpdateSkillStatus(matched.id, 'Learning');
                }
                setActiveView('phases');
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>Start Learning Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. GAP ANALYSIS BREAKDOWN (Requirement 4) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Skill Gap Analysis for {targetCompany}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Categorized by current mastery vs required qualifications
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Already Strong */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Already Strong
              </span>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                {skillGaps.strong?.length || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {skillGaps.strong && skillGaps.strong.length > 0 ? (
                skillGaps.strong.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-emerald-700 italic">None tagged yet</span>
              )}
            </div>
          </div>

          {/* Need Improvement */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                Needs Polish
              </span>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                {skillGaps.needsImprovement?.length || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {skillGaps.needsImprovement && skillGaps.needsImprovement.length > 0 ? (
                skillGaps.needsImprovement.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-amber-800 px-2 py-0.5 rounded-md border border-amber-100 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-amber-700 italic">None</span>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Missing Core
              </span>
              <span className="text-[10px] bg-rose-200/70 text-rose-900 font-bold px-2 py-0.5 rounded-full">
                {skillGaps.missing?.length || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {skillGaps.missing && skillGaps.missing.length > 0 ? (
                skillGaps.missing.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-rose-800 px-2 py-0.5 rounded-md border border-rose-100 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-rose-700 italic">None</span>
              )}
            </div>
          </div>

          {/* High Priority */}
          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                High Priority
              </span>
              <span className="text-[10px] bg-purple-200/70 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                {skillGaps.highPriority?.length || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {skillGaps.highPriority && skillGaps.highPriority.length > 0 ? (
                skillGaps.highPriority.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-purple-800 px-2 py-0.5 rounded-md border border-purple-100 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-purple-700 italic">All covered</span>
              )}
            </div>
          </div>

          {/* Optional / Advanced */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                Optional / Edge
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {skillGaps.optional?.length || 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {skillGaps.optional && skillGaps.optional.length > 0 ? (
                skillGaps.optional.map((s, i) => (
                  <span key={i} className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 italic">None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. VIEW TOGGLE BAR & SCHEDULE OPTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            id="tab-phases"
            onClick={() => setActiveView('phases')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeView === 'phases'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <span>Phased Roadmap ({phases.length} Phases)</span>
          </button>

          <button
            id="tab-weekly"
            onClick={() => setActiveView('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeView === 'weekly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Weekly Schedule ({weeklyPlan.length} Weeks)</span>
          </button>

          <button
            id="tab-projects"
            onClick={() => setActiveView('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeView === 'projects'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Production Projects ({projects.length})</span>
          </button>
        </div>

        {/* Filter Pills when on Phases view */}
        {activeView === 'phases' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-2">Priority:</span>
              {['all', 'HIGH', 'MEDIUM'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    filterPriority === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-2">Status:</span>
              {['all', 'Not Started', 'Learning', 'Completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    filterStatus === st ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. MAIN CONTENT AREA BASED ON ACTIVE VIEW */}

      {/* VIEW A: PHASED ROADMAP (5 Logical Phases strictly ordered) */}
      {activeView === 'phases' && (
        <div className="space-y-6">
          {phases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <GitFork className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600">No phases generated yet for this roadmap.</p>
              <button
                onClick={() => handleGenerateRoadmap()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Generate Phases
              </button>
            </div>
          ) : (
            phases.map((phase) => {
              const isExpanded = !!expandedPhases[phase.phase];
              const phaseSkills = (phase.skills || []).filter(s => {
                if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
                if (filterStatus !== 'all' && s.status !== filterStatus) return false;
                return true;
              });

              const phaseTotal = (phase.skills || []).length;
              const phaseCompleted = (phase.skills || []).filter(s => s.status === 'Completed').length;

              return (
                <div 
                  key={phase.phase} 
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition"
                >
                  {/* Phase Header Accordion */}
                  <div
                    onClick={() => togglePhase(phase.phase)}
                    className="p-5 md:p-6 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-indigo-600/20 shrink-0">
                        P{phase.phase}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Phase {phase.phase} of 5
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            phase.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {phase.priority} Priority
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {phase.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right text-xs">
                        <span className="text-slate-500 block text-[11px]">
                          {phaseCompleted} of {phaseTotal} Completed
                        </span>
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${phaseTotal > 0 ? (phaseCompleted / phaseTotal) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Skills List in Phase */}
                  {isExpanded && (
                    <div className="p-4 md:p-6 space-y-4">
                      {phaseSkills.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">
                          No skills match the current filters in this phase.
                        </p>
                      ) : (
                        phaseSkills.map((skill) => {
                          const isSkillDetailOpen = !!expandedSkills[skill.id];
                          const isUpdating = updatingSkillId === skill.id;

                          return (
                            <div
                              key={skill.id}
                              className={`rounded-2xl border transition ${
                                skill.status === 'Completed'
                                  ? 'bg-emerald-50/30 border-emerald-200'
                                  : skill.status === 'Learning'
                                  ? 'bg-indigo-50/30 border-indigo-200'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Skill Row */}
                              <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Priority Badge */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      skill.priority === 'HIGH' 
                                        ? 'bg-rose-100 text-rose-700' 
                                        : skill.priority === 'MEDIUM'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {skill.priority}
                                    </span>

                                    {/* Source Requirement Badge (Requirement 2 & 12) */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                      skill.sourceRequirement === 'Interview focus'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : skill.sourceRequirement === 'Required by job posting'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-teal-100 text-teal-800'
                                    }`}>
                                      {skill.sourceRequirement === 'Interview focus' && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                                      {skill.sourceRequirement}
                                    </span>

                                    {/* Category tag */}
                                    {skill.category && (
                                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {skill.category}
                                      </span>
                                    )}

                                    {/* Est Days */}
                                    <span className="text-[10px] text-slate-400">
                                      ~{skill.estimatedDays || 2} days
                                    </span>
                                  </div>

                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <span>{skill.name}</span>
                                    {skill.status === 'Completed' && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                  </h4>

                                  {skill.why && (
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                      <strong className="text-slate-700">Why for {targetCompany}:</strong> {skill.why}
                                    </p>
                                  )}
                                </div>

                                {/* Right Side: Status Changer + Detail Expand */}
                                <div className="flex items-center gap-3 shrink-0 self-start lg:self-auto">
                                  {/* Three-State Status Switcher (Requirement 10) */}
                                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                    {['Not Started', 'Learning', 'Completed'].map((st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateSkillStatus(skill.id, st)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                          skill.status === st
                                            ? st === 'Completed'
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : st === 'Learning'
                                              ? 'bg-indigo-600 text-white shadow-xs'
                                              : 'bg-slate-700 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Expand guide button */}
                                  <button
                                    type="button"
                                    onClick={() => toggleSkillDetail(skill.id)}
                                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                                    title="View learning topics and practice task"
                                  >
                                    {isSkillDetailOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {/* Expandable Learning Detail: What to learn, Practice task, Mini-task */}
                              {isSkillDetailOpen && (
                                <div className="border-t border-slate-100 p-4 md:p-5 bg-slate-50/50 rounded-b-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* What to Learn */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>What to Learn</span>
                                    </h5>
                                    <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                                      {Array.isArray(skill.whatToLearn) && skill.whatToLearn.length > 0 ? (
                                        skill.whatToLearn.map((item, idx) => <li key={idx}>{item}</li>)
                                      ) : (
                                        <li>Core architectural principles and code patterns.</li>
                                      )}
                                    </ul>
                                  </div>

                                  {/* Actionable Practice Task */}
                                  <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-1.5">
                                    <h5 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                                      <Code className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Practice Prompt</span>
                                    </h5>
                                    <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                                      {skill.practice || 'Build and test a focused practical module demonstrating this skill.'}
                                    </p>
                                  </div>

                                  {/* Mini Deliverable Task */}
                                  <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-1.5">
                                    <h5 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Deliverable Mini-Task</span>
                                    </h5>
                                    <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                                      {skill.miniTask || 'Commit code sample to GitHub repository and document in notes.'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW B: WEEKLY SCHEDULE BREAKDOWN (Requirement 6) */}
      {activeView === 'weekly' && (
        <div className="space-y-4">
          {weeklyPlan.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 mt-2">No weekly breakdown available. Regenerate to populate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyPlan.map((week) => (
                <div
                  key={week.week}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        Week {week.week} of {weeklyPlan.length}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Focus: {week.focus || 'Core Foundations'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {week.title}
                    </h4>

                    {/* Topics / Skills covered */}
                    {Array.isArray(week.skills) && week.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {week.skills.map((sk, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Mini project deliverable for the week */}
                    {week.miniTask && (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                        <strong className="text-slate-700 block text-[11px] mb-0.5">Weekly Milestone Task:</strong>
                        <p className="text-[11px] text-slate-600">{week.miniTask}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW C: PRODUCTION PROJECTS (Requirement 8) */}
      {activeView === 'projects' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900">
            <strong>Target-Aligned Portfolio Projects:</strong> These projects are specifically designed to showcase the exact tech stack and architectural challenges relevant to <strong>{targetCompany}</strong>.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj, idx) => (
              <div 
                key={proj.id || idx}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{proj.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>

                  {proj.technologies && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Tech Stack</span>
                      <p className="text-xs font-semibold text-slate-800">{proj.technologies}</p>
                    </div>
                  )}

                  {proj.whyItHelps && (
                    <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 text-[11px] text-indigo-950">
                      <strong>Why It Helps for {targetCompany}:</strong> {proj.whyItHelps}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-500">Portfolio Project</span>
                  <button 
                    onClick={() => navigate('/resume-builder')}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Add to Resume</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. RESEARCH VERIFICATION & PUBLIC SOURCES FOOTER (Requirement 3 & 12) */}
      {sources.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Researched Public Job Postings & Interview Sources for {targetCompany}</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              Verified by Tavily & SerpAPI
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Skills are derived directly from live requirements and candidate interview debriefs. 
            We clearly distinguish <em>"Required by job posting"</em> from <em>"Recommended for preparation"</em> to ensure maximum accuracy without hallucinating prerequisites.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {sources.map((src, idx) => (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition flex items-start justify-between gap-2 group"
              >
                <div className="space-y-0.5 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                    {src.title}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    {src.snippet || 'Public job specification & technical requirement guidelines.'}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 8. CHANGE TARGET MODAL (Requirement 1 & 11) */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Change Target Company & Role</h3>
                <p className="text-xs text-slate-500">
                  Reconfigure your target. Your previously completed skills will be safely preserved.
                </p>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Target Company */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target Company</span>
                </label>
                <input
                  id="target-company-input"
                  type="text"
                  value={modalCompany}
                  onChange={(e) => setModalCompany(e.target.value)}
                  placeholder="e.g. TCS, Infosys, Google, Amazon, Microsoft"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon', 'Google', 'Microsoft'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModalCompany(c)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        modalCompany.toLowerCase() === c.toLowerCase()
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target Role</span>
                </label>
                <input
                  id="target-role-input"
                  type="text"
                  value={modalRole}
                  onChange={(e) => setModalRole(e.target.value)}
                  placeholder="e.g. Software Developer, Frontend Engineer, Data Analyst"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Software Developer', 'Full Stack Developer', 'Data Analyst', 'Cloud Engineer'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setModalRole(r)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        modalRole.toLowerCase() === r.toLowerCase()
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Duration (Weeks) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Timeline Duration</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 8, 12, 16].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setModalWeeks(w)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        modalWeeks === w
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {w} Weeks
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Skills Adjuster */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Your Current Known Skills</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional tag adjustment</span>
                </label>
                
                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[48px]">
                  {modalSkills.map((sk, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                    >
                      <span>{sk}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveModalSkill(sk)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {modalSkills.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No skills added yet</span>
                  )}
                </div>

                {/* Add new tag */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={skillTagInput}
                    onChange={(e) => setSkillTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddModalSkill();
                      }
                    }}
                    placeholder="Add a skill and press Enter (e.g. Python, SQL)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddModalSkill}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="apply-target-generate-btn"
                disabled={generating || !modalCompany.trim() || !modalRole.trim()}
                onClick={() => handleGenerateRoadmap({
                  company: modalCompany.trim(),
                  role: modalRole.trim(),
                  durationWeeks: modalWeeks,
                  currentSkills: modalSkills
                })}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{generating ? 'Regenerating Roadmap...' : 'Generate Adaptive Roadmap'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
