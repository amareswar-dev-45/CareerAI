import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  Target,
  Award,
  AlertTriangle,
  Search,
  Filter,
  LogOut,
  ChevronRight,
  TrendingUp,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  GraduationCap,
  Briefcase,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import API from '../../services/api';

export default function CollegeAdminDashboardPage() {
  const navigate = useNavigate();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'students' | 'target-roles' | 'skill-gaps' | 'readiness' | 'reports'

  // Data states
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collegeName, setCollegeName] = useState(localStorage.getItem('college_admin_name') || 'GCEK');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDegree, setFilterDegree] = useState('ALL');
  const [filterGradYear, setFilterGradYear] = useState('ALL');
  const [filterTargetRole, setFilterTargetRole] = useState('ALL');
  const [filterReadinessBand, setFilterReadinessBand] = useState('ALL');
  const [filterResumeStatus, setFilterResumeStatus] = useState('ALL');

  // Selected student modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  // Check auth token
  useEffect(() => {
    const token = localStorage.getItem('college_admin_token');
    if (!token) {
      navigate('/college', { replace: true });
    }
  }, [navigate]);

  // Fetch real data from backend
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, stdRes] = await Promise.all([
        API.get('/college/dashboard'),
        API.get('/college/students')
      ]);

      if (dashRes.data && dashRes.data.success) {
        setStats(dashRes.data.data);
        if (dashRes.data.data?.collegeName) {
          setCollegeName(dashRes.data.data.collegeName);
        }
      }

      if (stdRes.data && stdRes.data.success) {
        setStudents(stdRes.data.data || []);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('college_admin_token');
        navigate('/college', { replace: true });
        return;
      }
      setError('Failed to fetch institutional data. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch student detailed profile
  const handleOpenStudentDetail = async (student) => {
    setSelectedStudent(student);
    setStudentDetailLoading(true);
    try {
      const res = await API.get(`/college/students/${student._id}`);
      if (res.data && res.data.success) {
        setSelectedStudent(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching student detail:', err);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await API.post('/college/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('college_admin_token');
      localStorage.removeItem('college_admin_name');
      localStorage.removeItem('college_admin_email');
      navigate('/college', { replace: true });
    }
  };

  // Unique filter options computed from real students
  const degreeOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.degree) set.add(s.degree);
    });
    return Array.from(set);
  }, [students]);

  const gradYearOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.graduationYear) set.add(s.graduationYear);
    });
    return Array.from(set).sort();
  }, [students]);

  const targetRoleOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.targetRole) set.add(s.targetRole);
    });
    return Array.from(set);
  }, [students]);

  // Filtered students computation
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesRole = s.targetRole?.toLowerCase().includes(q);
        const matchesDegree = s.degree?.toLowerCase().includes(q);
        const matchesSkill = s.topSkillGaps?.some((gap) => gap.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesDegree && !matchesSkill) {
          return false;
        }
      }

      // Degree filter
      if (filterDegree !== 'ALL' && s.degree !== filterDegree) {
        return false;
      }

      // Graduation year filter
      if (filterGradYear !== 'ALL' && String(s.graduationYear) !== String(filterGradYear)) {
        return false;
      }

      // Target role filter
      if (filterTargetRole !== 'ALL' && s.targetRole !== filterTargetRole) {
        return false;
      }

      // Resume status filter
      if (filterResumeStatus === 'UPLOADED' && !s.resumeUploaded) {
        return false;
      }
      if (filterResumeStatus === 'NOT_UPLOADED' && s.resumeUploaded) {
        return false;
      }

      // Readiness band filter
      if (filterReadinessBand !== 'ALL') {
        const score = s.careerReadiness || 0;
        if (filterReadinessBand === 'HIGH' && (score < 80 || score > 100)) return false;
        if (filterReadinessBand === 'MODERATE' && (score < 60 || score > 79)) return false;
        if (filterReadinessBand === 'NEEDS_IMPROVEMENT' && (score < 40 || score > 59)) return false;
        if (filterReadinessBand === 'EARLY_STAGE' && score > 39) return false;
      }

      return true;
    });
  }, [students, searchQuery, filterDegree, filterGradYear, filterTargetRole, filterResumeStatus, filterReadinessBand]);

  // Readiness categorization helper
  const getReadinessBadge = (score) => {
    const validScore = Math.min(100, Math.max(0, Math.round(score || 0)));
    if (validScore >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          {validScore}/100 • High Readiness
        </span>
      );
    }
    if (validScore >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          {validScore}/100 • Moderate Readiness
        </span>
      );
    }
    if (validScore >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          {validScore}/100 • Needs Improvement
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        {validScore}/100 • Early Stage
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* Institutional Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">{collegeName}</h2>
              <p className="text-[11px] font-medium text-indigo-400">Career Intelligence Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Students</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('target-roles')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'target-roles'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Target Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('skill-gaps')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'skill-gaps'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Skill Gaps</span>
          </button>

          <button
            onClick={() => setActiveTab('readiness')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'readiness'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Readiness Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Cohorts & Degrees</span>
          </button>
        </nav>

        {/* Admin Footer & Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <p className="text-[10px] text-slate-400 font-medium">Logged in Institution</p>
            <p className="text-xs font-bold text-white truncate">{collegeName} Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Institutional Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {collegeName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Placement & Career Intelligence</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              College Career Intelligence Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Refresh Real Database Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Database Connected</span>
            </div>
          </div>
        </header>

        {/* Sub-Header Tabs & Main View */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6 pb-20">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchData}
                className="underline font-semibold hover:text-rose-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Section 8: Dashboard Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Students</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">
                  {stats ? stats.totalStudents : 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Enrolled in {collegeName}</p>
              </div>
            </div>

            {/* Card 2: Resumes Uploaded */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Resumes Uploaded</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">
                  {stats ? stats.resumesUploaded : 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {stats && stats.totalStudents > 0
                    ? `${Math.round((stats.resumesUploaded / stats.totalStudents) * 100)}% of cohort`
                    : '0% uploaded'}
                </p>
              </div>
            </div>

            {/* Card 3: Students With Target Role */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">With Target Role</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">
                  {stats ? stats.studentsWithTargetRole : 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Defined career goal</p>
              </div>
            </div>

            {/* Card 4: Average Career Readiness */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Avg Career Readiness</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">
                  {stats ? Math.min(100, Math.round(stats.avgCareerReadiness || 0)) : 0}
                  <span className="text-sm font-semibold text-slate-400">/100</span>
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Valid normalized score</p>
              </div>
            </div>

            {/* Card 5: Students Needing Skill Development */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Need Skill Dev</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">
                  {stats ? stats.studentsNeedingSkillDev : 0}
                </p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Active skill gaps identified</p>
              </div>
            </div>
          </div>

          {/* MAIN TABS VIEWS */}

          {/* TAB 1: OVERVIEW & COMBINED VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Target Roles & Top Skill Gaps Quick Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Target Role Analytics Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Student Target Roles</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('target-roles')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {stats && stats.targetRoles && stats.targetRoles.length > 0 ? (
                    <div className="space-y-3">
                      {stats.targetRoles.slice(0, 5).map((roleItem, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 capitalize">{roleItem.role}</span>
                            <span className="text-slate-500 font-medium">
                              {roleItem.count} {roleItem.count === 1 ? 'student' : 'students'} ({roleItem.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, roleItem.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No target-role data available.
                    </div>
                  )}
                </div>

                {/* Skill Gap Analytics Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">Most Common Skill Gaps</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('skill-gaps')}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {stats && stats.skillGaps && stats.skillGaps.length > 0 ? (
                    <div className="space-y-3">
                      {stats.skillGaps.slice(0, 5).map((gapItem, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">{gapItem.skill}</span>
                            <span className="text-rose-600 font-medium">
                              {gapItem.count} {gapItem.count === 1 ? 'student' : 'students'} ({gapItem.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-rose-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, gapItem.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No skill gap data available yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Students Section Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Recently Enrolled Students</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('students')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Full Student Directory</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Degree</th>
                          <th className="px-6 py-3">Grad Year</th>
                          <th className="px-6 py-3">Target Role</th>
                          <th className="px-6 py-3">Career Readiness</th>
                          <th className="px-6 py-3">Top Skill Gaps</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.slice(0, 5).map((s) => (
                          <tr
                            key={s._id}
                            onClick={() => handleOpenStudentDetail(s)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                              {s.name}
                            </td>
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{s.degree || '—'}</td>
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{s.graduationYear || '—'}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium capitalize whitespace-nowrap">
                              {s.targetRole || 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getReadinessBadge(s.careerReadiness)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {s.topSkillGaps && s.topSkillGaps.length > 0 ? (
                                  s.topSkillGaps.slice(0, 3).map((gap, gIdx) => (
                                    <span
                                      key={gIdx}
                                      className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium"
                                    >
                                      {gap}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStudentDetail(s);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition cursor-pointer"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No student data available yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS DIRECTORY (MAIN TABLE + COMPREHENSIVE FILTERS) */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Student Directory ({filteredStudents.length})</h2>
                  <p className="text-xs text-slate-500">
                    Real student profiles enrolled under {collegeName}.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, role, skill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                {/* Degree Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Degree
                  </label>
                  <select
                    value={filterDegree}
                    onChange={(e) => setFilterDegree(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Degrees</option>
                    {degreeOptions.map((deg) => (
                      <option key={deg} value={deg}>
                        {deg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grad Year Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Graduation Year
                  </label>
                  <select
                    value={filterGradYear}
                    onChange={(e) => setFilterGradYear(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Cohorts</option>
                    {gradYearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Role Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Target Role
                  </label>
                  <select
                    value={filterTargetRole}
                    onChange={(e) => setFilterTargetRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Target Roles</option>
                    {targetRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Readiness Band Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Readiness Score
                  </label>
                  <select
                    value={filterReadinessBand}
                    onChange={(e) => setFilterReadinessBand(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Scores</option>
                    <option value="HIGH">High (80–100)</option>
                    <option value="MODERATE">Moderate (60–79)</option>
                    <option value="NEEDS_IMPROVEMENT">Needs Improvement (40–59)</option>
                    <option value="EARLY_STAGE">Early Stage (0–39)</option>
                  </select>
                </div>

                {/* Resume Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Resume Status
                  </label>
                  <select
                    value={filterResumeStatus}
                    onChange={(e) => setFilterResumeStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="UPLOADED">Resume Uploaded</option>
                    <option value="NOT_UPLOADED">Pending Upload</option>
                  </select>
                </div>
              </div>

              {/* Main Students Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Degree</th>
                      <th className="px-6 py-3.5">Graduation Year</th>
                      <th className="px-6 py-3.5">Target Role</th>
                      <th className="px-6 py-3.5">Career Readiness</th>
                      <th className="px-6 py-3.5">Top Skill Gaps</th>
                      <th className="px-6 py-3.5 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr
                          key={student._id}
                          onClick={() => handleOpenStudentDetail(student)}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {student.resumeUploaded && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Resume uploaded" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {student.degree || '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {student.graduationYear || '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-800 font-medium capitalize whitespace-nowrap">
                            {student.targetRole || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getReadinessBadge(student.careerReadiness)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {student.topSkillGaps && student.topSkillGaps.length > 0 ? (
                                student.topSkillGaps.map((gap, gIdx) => (
                                  <span
                                    key={gIdx}
                                    className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium"
                                  >
                                    {gap}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenStudentDetail(student);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                            >
                              Inspect Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500">
                          <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">No student data available yet.</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {students.length > 0
                              ? 'Try adjusting your search criteria or active filters.'
                              : 'Real student profiles will automatically appear here once students complete onboarding.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TARGET ROLES ANALYTICS */}
          {activeTab === 'target-roles' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Student Target Roles</h2>
                <p className="text-xs text-slate-500">
                  Aggregated career trajectory targets declared by {collegeName} students.
                </p>
              </div>

              {stats && stats.targetRoles && stats.targetRoles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.targetRoles.map((roleItem, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 capitalize truncate">
                          {roleItem.role}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                          {roleItem.count} {roleItem.count === 1 ? 'student' : 'students'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, roleItem.percentage)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Represents {roleItem.percentage}% of the student cohort
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No target-role data available.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SKILL GAPS ANALYTICS */}
          {activeTab === 'skill-gaps' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Most Common Skill Gaps</h2>
                <p className="text-xs text-slate-500">
                  Deficiencies identified through ATS resume analysis compared against target role expectations.
                </p>
              </div>

              {stats && stats.skillGaps && stats.skillGaps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.skillGaps.map((gapItem, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-slate-200 bg-rose-50/30 hover:border-rose-300 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{gapItem.skill}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          {gapItem.count} {gapItem.count === 1 ? 'student' : 'students'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, gapItem.percentage)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Missing in {gapItem.percentage}% of analyzed student profiles
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No skill gap data available yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: READINESS ANALYTICS */}
          {activeTab === 'readiness' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Career Readiness Distribution</h2>
                <p className="text-xs text-slate-500">
                  Categorized based on real calculated employability scores (strictly 0–100).
                </p>
              </div>

              {stats && stats.readinessDistribution ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* High Readiness */}
                  <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        High Readiness
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">80–100</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-900">
                      {stats.readinessDistribution.highReadiness?.count || 0}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      {stats.readinessDistribution.highReadiness?.percentage || 0}% of cohort
                    </p>
                  </div>

                  {/* Moderate Readiness */}
                  <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                        Moderate Readiness
                      </span>
                      <span className="text-xs font-semibold text-indigo-600">60–79</span>
                    </div>
                    <p className="text-3xl font-black text-indigo-900">
                      {stats.readinessDistribution.moderateReadiness?.count || 0}
                    </p>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      {stats.readinessDistribution.moderateReadiness?.percentage || 0}% of cohort
                    </p>
                  </div>

                  {/* Needs Improvement */}
                  <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                        Needs Improvement
                      </span>
                      <span className="text-xs font-semibold text-amber-600">40–59</span>
                    </div>
                    <p className="text-3xl font-black text-amber-900">
                      {stats.readinessDistribution.needsImprovement?.count || 0}
                    </p>
                    <p className="text-[11px] text-amber-700 font-medium">
                      {stats.readinessDistribution.needsImprovement?.percentage || 0}% of cohort
                    </p>
                  </div>

                  {/* Early Stage */}
                  <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                        Early Stage
                      </span>
                      <span className="text-xs font-semibold text-rose-600">0–39</span>
                    </div>
                    <p className="text-3xl font-black text-rose-900">
                      {stats.readinessDistribution.earlyStage?.count || 0}
                    </p>
                    <p className="text-[11px] text-rose-700 font-medium">
                      {stats.readinessDistribution.earlyStage?.percentage || 0}% of cohort
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No readiness distribution data available yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REPORTS & COHORT DISTRIBUTION */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Degree & Graduation Year Distribution</h2>
                <p className="text-xs text-slate-500">
                  Student distribution across departments and expected year of graduation.
                </p>
              </div>

              {stats && stats.cohortDistribution && stats.cohortDistribution.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.cohortDistribution.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-slate-300 transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">{item.degree}</p>
                        <p className="text-[11px] text-slate-500">Class of {item.graduationYear}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-indigo-600">{item.count}</span>
                        <p className="text-[10px] text-slate-400">students</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No cohort distribution data available yet.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* DETAILED STUDENT MODAL (SECTION 7 REQUIREMENT) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                  {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.degree} • Class of {selectedStudent.graduationYear} • {collegeName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {selectedStudent.email || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">College</span>
                  <p className="text-xs font-semibold text-slate-800">{collegeName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Role</span>
                  <p className="text-xs font-semibold text-indigo-700 capitalize">
                    {selectedStudent.targetRole || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree</span>
                  <p className="text-xs font-semibold text-slate-800">{selectedStudent.degree || '—'}</p>
                </div>
              </div>

              {/* Career Readiness Score Breakdown */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-5 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Calculated Career Readiness Score
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-900">
                      {Math.min(100, Math.max(0, Math.round(selectedStudent.careerReadiness || 0)))}
                    </span>
                    <span className="text-xs font-bold text-indigo-600">/100</span>
                  </div>
                </div>

                {/* Score Categories */}
                {selectedStudent.readinessBreakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium">Technical Skills</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {selectedStudent.readinessBreakdown.technicalScore || 0}/100
                      </p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium">Resume ATS Match</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {selectedStudent.readinessBreakdown.resumeAtsScore || 0}/100
                      </p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium">Experience</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {selectedStudent.readinessBreakdown.experienceScore || 0}/100
                      </p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] text-slate-500 font-medium">Projects Quality</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {selectedStudent.readinessBreakdown.projectsScore || 0}/100
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resume Information Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Resume & ATS Information
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStudent.resumeUploaded
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedStudent.resumeUploaded ? 'Resume Uploaded' : 'No Resume Uploaded'}
                  </span>
                </div>

                {selectedStudent.resumeDetails ? (
                  <div className="space-y-3 pt-2">
                    {selectedStudent.resumeDetails.skills && selectedStudent.resumeDetails.skills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Extracted Skills from Resume
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStudent.resumeDetails.skills.map((sk, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedStudent.resumeDetails.projects && selectedStudent.resumeDetails.projects.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Detected Projects
                        </span>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                          {selectedStudent.resumeDetails.projects.map((proj, pIdx) => (
                            <li key={pIdx}>
                              <span className="font-semibold text-slate-800">
                                {typeof proj === 'string' ? proj : proj.title || proj.name}
                              </span>
                              {proj.description && ` — ${proj.description}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No structured resume details available.</p>
                )}
              </div>

              {/* Skill Gap Analysis Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verified Skill Gaps ({selectedStudent.targetRole || 'Target Role'})
                  </h4>
                </div>

                {selectedStudent.topSkillGaps && selectedStudent.topSkillGaps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.topSkillGaps.map((gap, gIdx) => (
                      <span
                        key={gIdx}
                        className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>{gap}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No active skill gaps identified for this student profile.
                  </p>
                )}
              </div>

              {/* Career Roadmap Information */}
              {selectedStudent.roadmap && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Generated Career Roadmap
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      {selectedStudent.roadmap.role || selectedStudent.targetRole} Roadmap
                    </p>
                    {selectedStudent.roadmap.modules && selectedStudent.roadmap.modules.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {selectedStudent.roadmap.modules.slice(0, 4).map((mod, mIdx) => (
                          <div key={mIdx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-800">{mod.title || mod.name}</span>
                            {mod.duration && <p className="text-[10px] text-slate-400 mt-0.5">{mod.duration}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
