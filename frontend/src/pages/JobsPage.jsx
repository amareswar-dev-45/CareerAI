import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Building2, 
  Sparkles, 
  FileText,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight,
  Globe,
  HelpCircle,
  Check,
  Copy,
  Info,
  RotateCcw
} from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import { useCareer } from '../context/CareerContext';
import API from '../services/api';
import CompanyIntelContent from '../components/intel/CompanyIntelContent';

export default function JobsPage() {
  const navigate = useNavigate();
  const { 
    profile, 
    jobs, 
    jobsMeta, 
    selectedJob, 
    setSelectedJob, 
    jobsLoading, 
    jobsError, 
    fetchJobsData, 
    setApplications, 
    applications 
  } = useCareer();
  
  const [searchQuery, setSearchQuery] = useState(jobsMeta?.searchQuery || '');
  const [locationQuery, setLocationQuery] = useState(jobsMeta?.locationQuery || '');
  const [workMode, setWorkMode] = useState(jobsMeta?.workMode || 'All'); // All, Remote, Hybrid, Onsite

  const jobsList = jobs || [];
  const loading = jobsLoading;
  const apiError = jobsError;

  // Company Intelligence modal states
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyIntel, setCompanyIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [targetCompany, setTargetCompany] = useState('');

  // Resume Tailoring modal states
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorResult, setTailorResult] = useState(null);
  const [tailorError, setTailorError] = useState('');
  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null);

  const targetRole = profile?.targetRole || 'Software Engineer';
  const debounceTimer = useRef(null);

  // Trigger fetch ONLY on first visit or when search criteria genuinely change
  useEffect(() => {
    const isFirstVisit = jobsList.length === 0;
    const currentRole = profile?.targetRole || 'Software Engineer';
    const cachedRole = jobsMeta?.targetRole || '';
    const cachedQ = jobsMeta?.searchQuery || '';
    const cachedLoc = jobsMeta?.locationQuery || '';
    const cachedMode = jobsMeta?.workMode || 'All';

    const roleChanged = currentRole.toLowerCase() !== cachedRole.toLowerCase();
    const qChanged = searchQuery.trim().toLowerCase() !== cachedQ.trim().toLowerCase();
    const locChanged = locationQuery.trim().toLowerCase() !== cachedLoc.trim().toLowerCase();
    const modeChanged = workMode.toLowerCase() !== cachedMode.toLowerCase();

    if (isFirstVisit || roleChanged || qChanged || locChanged || modeChanged) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        fetchJobsData({ q: searchQuery, location: locationQuery, workMode, forceRefresh: false });
      }, isFirstVisit ? 0 : 450);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, locationQuery, workMode, profile?.targetRole]);

  const handleRefreshJobs = () => {
    fetchJobsData({ q: searchQuery, location: locationQuery, workMode, forceRefresh: true });
  };

  const handleFetchCompanyIntel = async (companyName, forceRefresh = false) => {
    if (!companyName) return;
    setTargetCompany(companyName);
    setShowCompanyModal(true);
    setLoadingIntel(true);
    if (!companyIntel || forceRefresh) setCompanyIntel(null);
    try {
      const params = new URLSearchParams({
        company: companyName,
        role: targetRole || 'Software Engineer'
      });
      if (forceRefresh) params.append('refresh', 'true');

      const res = await API.get(`/jobs/company-intelligence?${params.toString()}`);
      if (res.data && res.data.data) {
        setCompanyIntel(res.data.data);
      }
    } catch (e) {
      console.error('Company intel error:', e);
    } finally {
      setLoadingIntel(false);
    }
  };

  const handleTailorResume = async (job) => {
    if (!job) return;
    setShowTailorModal(true);
    setTailorLoading(true);
    setTailorResult(null);
    setTailorError('');
    try {
      const res = await API.post('/resume/tailor', {
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        jobSkills: job.skills || [],
        targetRole: targetRole
      });
      if (res.data && res.data.success) {
        setTailorResult(res.data.data);
      } else {
        setTailorError('Unable to generate tailored resume suggestions. Please try again.');
      }
    } catch (err) {
      console.error('Resume tailoring error:', err);
      setTailorError('Unable to tailor resume. Please make sure your resume is uploaded.');
    } finally {
      setTailorLoading(false);
    }
  };

  const handleApplyNow = (job) => {
    if (!job || !job.applyUrl || job.applyUrl === 'Not available') {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(`${job.company} ${job.title} jobs`), '_blank');
      return;
    }
    window.open(job.applyUrl, '_blank');
    
    // Save to Application Tracker if not already present
    const exists = applications.some(a => a.company === job.company && a.role === job.title);
    if (!exists) {
      API.post('/applications', {
        company: job.company,
        role: job.title,
        location: job.location,
        salary: job.salary,
        applyUrl: job.applyUrl,
        status: 'Applied'
      }).then(() => {
        setApplications(prev => [...prev, { company: job.company, role: job.title, status: 'Applied', location: job.location }]);
      }).catch(() => {});
    }
  };

  const activeJob = selectedJob || jobsList[0];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* Title & Target Role Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Career Opportunities & Intelligence</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real live job openings prioritized for your target role: <span className="font-bold text-indigo-600">{targetRole}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="refresh-jobs-button"
            type="button"
            onClick={handleRefreshJobs}
            disabled={loading}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Jobs'}</span>
          </button>
        </div>
      </div>

      {/* TARGET ROLE COMPANY RECOMMENDATIONS SECTION */}
      {jobsList.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Company Recommendations for {targetRole}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Companies with actual live openings aligned with your resume skills and academic profile.
                </p>
              </div>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
              {jobsList.length} Live Openings
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {jobsList.slice(0, 3).map((job, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-indigo-200 transition space-y-3 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-700">{job.company}</span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{job.title}</h4>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{job.location} • {job.workMode}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
                    Profile Match: {job.matchScore}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="line-clamp-1 text-[11px] text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700">Why it matches:</span> {job.explanation}
                  </p>
                  {job.missingSkills && job.missingSkills.length > 0 && (
                    <p className="text-[10px] text-amber-700">
                      <span className="font-semibold">Missing skills:</span> {job.missingSkills.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <button 
                    onClick={() => handleFetchCompanyIntel(job.company)}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3" /> Intel
                  </button>
                  <button 
                    onClick={() => handleApplyNow(job)}
                    className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-xl shadow-xs"
                  >
                    Apply ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="job-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, skills, companies (e.g. React developer, Google, Java)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* FILTER 2: DYNAMIC LOCATION SEARCH */}
          <div className="md:col-span-6 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="job-location-input"
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Filter by city/location (e.g. Bhubaneswar, Bangalore, Delhi)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>

        {/* FILTER 1: WORK MODE BUTTONS & POPULAR LOCATION CHIPS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          {/* Work Mode Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Work Mode:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['All', 'Remote', 'Hybrid', 'Onsite'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    workMode === mode 
                      ? 'bg-white text-indigo-600 shadow-xs font-bold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Suggested Locations */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Locations:</span>
            {['Bhubaneswar', 'Bangalore', 'Delhi', 'Hyderabad', 'Pune', 'Mumbai', 'Remote'].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setLocationQuery(locationQuery.toLowerCase() === city.toLowerCase() ? '' : city)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  locationQuery.toLowerCase() === city.toLowerCase()
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                📍 {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Sparkles className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-sm font-bold text-slate-800">Querying live jobs for {targetRole}{locationQuery ? ` in ${locationQuery}` : ''}...</p>
          <p className="text-xs text-slate-400">Aggregating real openings from verified sources without fake data.</p>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && apiError && (
        <div className="p-8 text-center bg-red-50 rounded-3xl border border-red-200 text-red-700 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
          <h4 className="font-bold text-sm">{apiError}</h4>
          <button
            onClick={() => fetchRealJobs(searchQuery, locationQuery, workMode)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            Retry Live Search
          </button>
        </div>
      )}

      {/* NO RESULTS STATE - COMPLIES STRICTLY WITH PROMPT SPEC */}
      {!loading && !apiError && jobsList.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="font-bold text-slate-800 text-base">
            No matching jobs found for {targetRole} in {locationQuery || 'the selected location'}.
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try another location or Remote.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => { setLocationQuery('Remote'); }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl border border-indigo-200 transition"
            >
              Try Remote Jobs
            </button>
            <button
              onClick={() => { setSearchQuery(''); setLocationQuery(''); setWorkMode('All'); }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* MAIN SPLIT GRID: LEFT JOBS LIST, RIGHT SELECTED JOB MATCH ANALYTICS */}
      {!loading && !apiError && jobsList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Job Cards List */}
          <div className="lg:col-span-5 space-y-3">
            {jobsList.map((job, idx) => {
              const isSelected = activeJob && (activeJob.id === job.id || (activeJob.title === job.title && activeJob.company === job.company));
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 rounded-3xl border transition cursor-pointer relative ${
                    isSelected 
                      ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white font-bold flex items-center justify-center text-sm shadow">
                        {job.company?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                        <p className="text-[11px] text-slate-600 font-medium">{job.company}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          <span className="truncate">{job.location} • {job.workMode}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Profile Match: {job.matchScore}%
                      </span>
                      {job.salary !== 'Not available' && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">{job.salary}</p>
                      )}
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(job.skills || []).slice(0, 4).map((s, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-medium">
                        {s}
                      </span>
                    ))}
                    {(job.skills || []).length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center">
                        +{job.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">Source: <strong className="text-slate-600 font-medium">{job.source}</strong></span>
                    <span>Posted: {job.postedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Job & Real Match Breakdown */}
          {activeJob && (
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {activeJob.company}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{activeJob.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeJob.location} • Work Mode: <span className="font-semibold text-slate-700">{activeJob.workMode}</span>
                  </p>
                  {activeJob.salary !== 'Not available' && (
                    <p className="text-xs font-bold text-slate-700 mt-1">Salary: {activeJob.salary}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    id="open-company-intel-btn"
                    onClick={() => handleFetchCompanyIntel(activeJob.company)}
                    className="px-3.5 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Company Intel</span>
                  </button>
                </div>
              </div>

              {/* Profile Match Banner */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center">
                  <ScoreGauge value={activeJob.matchScore || 75} size={120} strokeWidth={10} color="#10B981" />
                  <span className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full inline-block">
                    Profile Match: {activeJob.matchScore}%
                  </span>
                </div>

                <div className="flex-1 w-full space-y-2.5 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Profile Match Analysis</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Based on the overlap between your resume and this job's listed requirements.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">Skills Match</span>
                      <span className="text-slate-800 font-bold">{activeJob.skillsMatch || 'Not available'}</span>
                    </div>

                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">Experience Match</span>
                      <span className="text-slate-800 font-bold">{activeJob.experienceMatch || 'Not available'}</span>
                    </div>

                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-600">Education Match</span>
                      <span className="text-slate-800 font-bold">{activeJob.educationMatch || 'Not available'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Skill Comparison: You Have vs Missing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* You Have */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/70 space-y-2">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>You Have ({activeJob.matchedSkills?.length || 0})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeJob.matchedSkills && activeJob.matchedSkills.length > 0 ? (
                      activeJob.matchedSkills.map((s, i) => (
                        <span key={i} className="bg-white text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-200 font-semibold text-[11px] shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{s}</span>
                        </span>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No listed skills matched yet.</p>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/70 space-y-2">
                  <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Missing Skills ({activeJob.missingSkills?.length || 0})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeJob.missingSkills && activeJob.missingSkills.length > 0 ? (
                      activeJob.missingSkills.map((s, i) => (
                        <span key={i} className="bg-white text-rose-700 px-2.5 py-1 rounded-xl border border-rose-200 font-semibold text-[11px] shadow-xs flex items-center gap-1">
                          <span>⚠</span>
                          <span>{s}</span>
                        </span>
                      ))
                    ) : (
                      <p className="text-[11px] text-emerald-700 font-semibold">All required skills detected!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800">Job Description</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-line">
                  {activeJob.description || 'Detailed job description not provided by the posting source.'}
                </div>
              </div>

              {/* Source & Provenance */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Verified Source: <strong className="text-slate-600">{activeJob.source}</strong></span>
                <span>Posted: <strong className="text-slate-600">{activeJob.postedAt}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  id="tailor-resume-btn"
                  onClick={() => handleTailorResume(activeJob)}
                  className="flex-1 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Tailor My Resume</span>
                </button>
                <button 
                  onClick={() => handleApplyNow(activeJob)}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  Apply Now ↗
                </button>
                <button 
                  id="practice-interview-btn"
                  onClick={() => navigate('/interview')}
                  className="flex-1 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Practice Interview</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESUME TAILORING MODAL */}
      {showTailorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Resume Tailoring for {activeJob?.title}</h3>
                  <p className="text-[11px] text-slate-300">at {activeJob?.company} • Strict truthfulness policy (no invented experience)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTailorModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {tailorLoading ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <Sparkles className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                  <p className="font-bold text-slate-800 text-sm">Tailoring your resume for {activeJob?.title}...</p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Analyzing ATS keywords, matching your authentic projects and experience, and generating impactful bullet point rewordings.
                  </p>
                </div>
              ) : tailorError ? (
                <div className="p-6 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 space-y-3">
                  <AlertCircle className="w-7 h-7 mx-auto text-rose-500" />
                  <p className="font-bold">{tailorError}</p>
                  <button
                    onClick={() => handleTailorResume(activeJob)}
                    className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold"
                  >
                    Retry Tailoring
                  </button>
                </div>
              ) : tailorResult ? (
                <>
                  {/* ATS & Keyword Analysis */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>ATS / Keyword Analysis</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Matched Keywords */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Matched Keywords ({tailorResult.atsKeywordAnalysis?.matchedKeywords?.length || 0})</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {tailorResult.atsKeywordAnalysis?.matchedKeywords?.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Missing Keywords */}
                      <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-1.5">
                        <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Missing Keywords ({tailorResult.atsKeywordAnalysis?.missingKeywords?.length || 0})</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {tailorResult.atsKeywordAnalysis?.missingKeywords?.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Keywords */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-200 space-y-1.5">
                        <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Recommended Keywords ({tailorResult.atsKeywordAnalysis?.recommendedKeywords?.length || 0})</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {tailorResult.atsKeywordAnalysis?.recommendedKeywords?.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tailored Professional Summary */}
                  {tailorResult.tailoredSummary && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Tailored Professional Summary
                      </h4>
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80 text-slate-700 leading-relaxed">
                        {tailorResult.tailoredSummary}
                      </div>
                    </div>
                  )}

                  {/* Suggested Bullet Improvements (Original vs Suggested with Rationale) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Suggested Bullet Improvements
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                        Only improves existing resume items
                      </span>
                    </div>

                    <div className="space-y-3">
                      {tailorResult.suggestedBulletImprovements?.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Original:</span>
                            <p className="text-slate-600 line-through decoration-rose-300 mt-0.5 bg-rose-50/40 p-2 rounded-lg border border-rose-100">
                              {item.originalBullet}
                            </p>
                          </div>

                          <div className="text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                <span>Suggested High-Impact Version:</span>
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.suggestedBullet);
                                  setCopiedBulletIdx(idx);
                                  setTimeout(() => setCopiedBulletIdx(null), 2000);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                              >
                                {copiedBulletIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedBulletIdx === idx ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                            <p className="text-slate-900 font-medium mt-0.5 bg-indigo-50/60 p-2 rounded-lg border border-indigo-200 text-xs">
                              {item.suggestedBullet}
                            </p>
                          </div>

                          {item.rationale && (
                            <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
                              <Info className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.rationale}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Tailoring Tips */}
                  {tailorResult.tailoredTips && tailorResult.tailoredTips.length > 0 && (
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-amber-900 space-y-1.5">
                      <h4 className="font-bold text-xs">Application Strategy Tips</h4>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                        {tailorResult.tailoredTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowTailorModal(false);
                  navigate('/resume');
                }}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Go to Full ATS Page →
              </button>
              <button
                onClick={() => setShowTailorModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOURCE-BACKED COMPANY INTELLIGENCE MODAL */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 id="company-intel-modal-title" className="font-bold text-sm tracking-tight">{targetCompany} Intelligence</h3>
                  <p className="text-[10px] text-slate-400">Target Role: {targetRole || 'Software Engineer'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCompanyModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[75vh]">
              <CompanyIntelContent
                companyIntel={companyIntel}
                loading={loadingIntel}
                targetCompany={targetCompany}
                targetRole={targetRole}
                onRefresh={() => handleFetchCompanyIntel(targetCompany, true)}
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  navigate(`/company-intel?company=${encodeURIComponent(targetCompany)}&role=${encodeURIComponent(targetRole)}`);
                }}
                className="px-3.5 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Open in Full Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
