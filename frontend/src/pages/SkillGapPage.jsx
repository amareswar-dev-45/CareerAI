import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  FileText, 
  Check, 
  AlertTriangle,
  Info,
  Clock,
  RefreshCw
} from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function SkillGapPage() {
  const navigate = useNavigate();
  const { profile, skillGap, setSkillGap, setRoadmap, setActiveTab } = useCareer();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your resume...');
  const [error, setError] = useState('');
  const [isResumeMissing, setIsResumeMissing] = useState(false);

  // Roadmap generation state
  const [durationDays, setDurationDays] = useState(30);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [roadmapStepIndex, setRoadmapStepIndex] = useState(0);

  const roadmapSteps = [
    'Analyzing your skill gaps...',
    'Building your personalized roadmap...',
    'Creating your daily learning plan...'
  ];

  // Fetch real skill gap on mount
  const fetchRealSkillGap = async () => {
    setLoading(true);
    setError('');
    setIsResumeMissing(false);
    setLoadingMessage('Comparing skills with your target role...');

    try {
      const res = await API.get('/skills/latest');
      if (res.data && res.data.success) {
        setSkillGap(res.data.data);
      }
    } catch (err) {
      console.error('Skill gap fetch notice:', err.response?.data || err.message);
      if (err.response?.data?.error?.code === 'RESUME_MISSING') {
        setIsResumeMissing(true);
      } else {
        setError(err.response?.data?.error?.message || "We couldn't generate the analysis right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealSkillGap();
  }, [user]);

  // Handle roadmap generation for exact requested days
  const handleGenerateRoadmap = async (daysToGenerate) => {
    const days = parseInt(daysToGenerate || durationDays, 10);
    if (!days || isNaN(days) || days < 1) {
      setError('Please enter a valid positive integer for roadmap duration (e.g. 7, 30, 60).');
      return;
    }
    if (days > 120) {
      setError('Maximum supported roadmap duration is 120 days.');
      return;
    }

    setError('');
    setGeneratingRoadmap(true);
    setRoadmapStepIndex(0);

    const stepInterval = setInterval(() => {
      setRoadmapStepIndex(prev => (prev + 1) % roadmapSteps.length);
    }, 1200);

    try {
      const res = await API.post('/roadmap/generate', {
        durationDays: days,
        targetRole: skillGap?.targetRole || profile?.targetRole || user?.targetRole
      });

      clearInterval(stepInterval);

      if (res.data && res.data.success) {
        setRoadmap(res.data.data);
        if (setActiveTab) setActiveTab('roadmap');
        navigate('/roadmap');
      } else {
        setError(res.data?.error?.message || "We couldn't generate the roadmap right now. Please try again.");
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Roadmap generate notice:', err);
      setError(err.response?.data?.error?.message || "We couldn't generate the roadmap right now. Please try again.");
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  // Loading state
  if (loading && !skillGap) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">{loadingMessage}</h3>
        <p className="text-xs text-slate-400">Benchmarking verified candidate skills against market hiring requirements...</p>
      </div>
    );
  }

  const gap = skillGap || {};
  const currentRole = gap.targetRole || profile?.targetRole || user?.targetRole || 'Software Engineer';
  const resumeFile = gap.resumeFileName || 'resume.pdf';
  const isNoResume = profile?.resumeStatus === 'skipped' || resumeFile === 'No Resume' || !resumeFile;
  const matchPercentage = typeof gap.skillMatchPercentage === 'number' ? gap.skillMatchPercentage : (gap.readinessScore || 0);

  const skillsYouHave = Array.isArray(gap.skillsYouHave) && gap.skillsYouHave.length > 0
    ? gap.skillsYouHave
    : (gap.existingSkills || []);

  const skillsToImprove = Array.isArray(gap.skillsToImprove) && gap.skillsToImprove.length > 0
    ? gap.skillsToImprove
    : (gap.missingSkills || []).map(s => ({
        skill: s,
        status: isNoResume ? 'Not provided / Not verified' : 'Missing',
        importance: 'High',
        reason: isNoResume 
          ? `Expected for ${currentRole}. Not provided / Missing from current profile.`
          : `Essential skill for ${currentRole}.`,
        action: `Practice key concepts and build a hands-on project.`
      }));

  const presetDurations = [7, 15, 30, 45, 60, 90];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* Title & Metadata Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Real Skill Gap Analysis</h2>
          <p className="text-xs text-slate-500 mt-1">
            {isNoResume 
              ? `Role-based industry benchmark for ${currentRole}.` 
              : 'Objective skill benchmark based on your uploaded resume and target role.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Resume Analyzed Badge */}
          {isNoResume ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Resume: <strong>Not provided</strong></span>
              <span className="text-[11px] text-amber-600">(Role baseline comparison)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resume: <strong>{resumeFile}</strong></span>
              <span className="text-[11px] text-emerald-600">✓ Successfully analyzed</span>
            </div>
          )}

          <button
            onClick={fetchRealSkillGap}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </button>
        </div>
      </div>

      {/* No-resume banner with quick actions */}
      {isNoResume && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">No resume provided for skill verification</p>
              <p className="text-amber-700 text-[11px]">
                Skills below are marked as "Not provided / Not verified" against the expected skills for <strong>{currentRole}</strong>. You can create a resume or upload one anytime to verify your skills.
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

      {/* Error Alert */}
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

      {/* Accuracy Disclaimer Note (Requirement 8) */}
      <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          {gap.note || (isNoResume
            ? `Skill gaps are based on the target role ${currentRole}. Skills not present in your profile are labeled 'Not provided / Not verified'.`
            : 'Skill gaps are generated by comparing your uploaded resume with the requirements for your selected target role. Review the results and update your profile if any skill is missing from your resume.')}
        </p>
      </div>

      {/* Top Split Grid: Target Role & Dial + Dynamic Roadmap Generator */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Target Role & Dial */}
        <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Role</span>
            <h3 className="text-lg font-bold text-indigo-950">{currentRole}</h3>
          </div>

          <ScoreGauge value={matchPercentage} size={150} strokeWidth={12} color="#4F46E5" />

          <div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-block">
              Skill Match: {matchPercentage}%
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Calculated dynamically from real resume skills vs role requirements.
            </p>
          </div>
        </div>

        {/* Right Column: DYNAMIC ROADMAP GENERATOR BOX (Requirements 9-15) */}
        <div className="md:col-span-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-800/60 border border-indigo-700/60 rounded-xl text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personalized Dynamic Learning Plan</span>
            </div>

            <h3 className="text-xl font-bold tracking-tight">
              How many days do you want for your roadmap?
            </h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed max-w-xl">
              Choose your timeline. Our system will generate a day-by-day roadmap tailored specifically to your missing skills ({skillsToImprove.slice(0, 3).map(s => s.skill).join(', ') || 'core concepts'}), without repeating what you already know.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-indigo-300 font-medium">Quick Select:</span>
              {presetDurations.map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    durationDays === days
                      ? 'bg-indigo-500 text-white font-bold ring-2 ring-white/30 shadow'
                      : 'bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-800'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>

            {/* Custom Input & Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Calendar className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="roadmap-days-input"
                  type="number"
                  min="1"
                  max="120"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Enter number of days (e.g. 30)"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-indigo-700/60 rounded-2xl text-white placeholder-indigo-300/50 text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:bg-white/15 transition"
                />
              </div>

              <button
                id="generate-roadmap-button"
                onClick={() => handleGenerateRoadmap(durationDays)}
                disabled={generatingRoadmap}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generatingRoadmap ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{roadmapSteps[roadmapStepIndex]}</span>
                  </>
                ) : (
                  <>
                    <span>Generate {durationDays || 30}-Day Roadmap</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SKILLS YOU ALREADY HAVE SECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Skills You Already Have ({skillsYouHave.length})</h3>
            <p className="text-[11px] text-slate-500">
              {isNoResume 
                ? 'Skills verified from your candidate profile.' 
                : 'Skills detected from your uploaded verified resume.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {skillsYouHave.length > 0 ? (
            skillsYouHave.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{skill}</span>
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">
              {isNoResume 
                ? 'No verified skills recorded yet. Build or upload a resume to verify skills.' 
                : 'No verified skills detected yet. Upload an updated resume.'}
            </p>
          )}
        </div>
      </div>

      {/* SKILLS YOU NEED TO IMPROVE SECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isNoResume ? `Target Role Expected Skills (${skillsToImprove.length})` : `Skills You Need to Improve (${skillsToImprove.length})`}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isNoResume 
                  ? `Expected industry competencies for ${currentRole}.` 
                  : `Actual gaps between your resume and ${currentRole} requirements.`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {skillsToImprove.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-2.5 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center ${
                    isNoResume ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs">{item.skill}</h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.status === 'Not provided / Not verified'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {item.status || 'Missing'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.importance === 'High' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {item.importance || 'High'} Priority
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Reason:</strong> {item.reason}
              </p>

              {item.action && (
                <p className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
                  <strong>Recommended Action:</strong> {item.action}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
