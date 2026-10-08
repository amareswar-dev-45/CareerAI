import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Target, 
  ExternalLink, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Languages as LanguagesIcon, 
  Code2, 
  Globe, 
  FolderKanban, 
  Eye, 
  Edit3, 
  Layers, 
  RotateCcw,
  BookOpen,
  FileCheck2,
  Share2,
  User
} from 'lucide-react';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const DEFAULT_RESUME_STATE = {
  title: 'My Software Developer Resume',
  template: 'ats', // 'ats' | 'modern' | 'minimal'
  targetRole: 'Software Developer',
  targetCompany: '',
  personal: {
    name: 'Amareswar Nayak',
    email: 'nayakamareswar3@gmail.com',
    phone: '+91 98765 43210',
    location: 'Bhubaneswar, Odisha, India',
    linkedin: 'linkedin.com/in/amareswarnayak',
    github: 'github.com/amareswarnayak',
    portfolio: 'amareswar.dev'
  },
  summary: 'Motivated Computer Science graduate with strong foundations in full-stack engineering, distributed systems, and modern web frameworks. Proven track record of developing scalable applications using React, Node.js, and MongoDB. Passionate about solving complex software engineering challenges.',
  education: [
    {
      id: 'edu-1',
      degree: 'B.Tech in Computer Science & Engineering',
      institution: 'Government College of Engineering Kalahandi (GCEK)',
      location: 'Bhawanipatna, Odisha',
      startYear: '2022',
      endYear: '2026',
      grade: '8.4 CGPA'
    }
  ],
  experience: [
    {
      id: 'exp-1',
      role: 'Full Stack Web Developer Intern',
      company: 'TechCorp Solutions',
      location: 'Remote',
      startDate: 'Jun 2024',
      endDate: 'Aug 2024',
      current: false,
      responsibilities: 'Engineered RESTful microservices and frontend dashboards handling 10,000+ weekly user interactions.\nCollaborated in agile sprints to optimize PostgreSQL queries and reduce response times by 35%.',
      achievements: 'Implemented role-based JWT authentication and automated CI/CD pipeline tests.'
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'AI-Driven Career Intelligence Platform',
      description: 'Architected end-to-end career guidance platform featuring real-time ATS analysis, automated skill gap identification, and company-specific interview simulation.',
      technologies: 'React, Node.js, Express, MongoDB, Google Gemini API, Tailwind CSS',
      role: 'Lead Full Stack Developer',
      contributions: 'Engineered multi-source job aggregator, automated assessment engine, and synchronized student-admin analytics.',
      projectLink: 'https://careerai.demo',
      githubLink: 'https://github.com/amareswarnayak/career-ai'
    },
    {
      id: 'proj-2',
      name: 'Campus Placement & Recruitment Portal',
      description: 'Developed high-throughput recruitment management system for campus placement coordination, automated candidate scheduling, and company tracking.',
      technologies: 'JavaScript, Node.js, React, MongoDB, WebSockets',
      role: 'Backend & Database Architect',
      contributions: 'Designed relational schemas, implemented real-time notifications, and enabled instant PDF export for verified student transcripts.',
      projectLink: '',
      githubLink: 'https://github.com/amareswarnayak/placement-portal'
    }
  ],
  skills: {
    programming: ['Java', 'JavaScript', 'Python', 'C++', 'SQL'],
    frameworks: ['React', 'Node.js', 'Express', 'Tailwind CSS', 'Next.js'],
    databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
    tools: ['Git', 'GitHub', 'Docker', 'Postman', 'VS Code', 'Linux'],
    other: ['Data Structures & Algorithms', 'RESTful API Design', 'OOP', 'System Design']
  },
  achievements: [
    {
      id: 'ach-1',
      title: 'Finalist — National Smart India Hackathon',
      description: 'Ranked in Top 5 teams out of 250+ participants for developing an automated education intelligence workflow.',
      date: '2024'
    },
    {
      id: 'ach-2',
      title: '500+ Problems Solved on LeetCode & GeeksforGeeks',
      description: 'Consistent problem solver with strong proficiency in data structures, algorithms, and graph theory.',
      date: '2023 - Present'
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2024',
      link: 'https://aws.amazon.com/verification'
    },
    {
      id: 'cert-2',
      name: 'Meta Front-End Developer Professional Certificate',
      issuer: 'Coursera / Meta',
      date: '2023',
      link: ''
    }
  ],
  languages: [
    { id: 'lang-1', language: 'English', proficiency: 'Professional Working' },
    { id: 'lang-2', language: 'Hindi', proficiency: 'Native / Bilingual' },
    { id: 'lang-3', language: 'Odia', proficiency: 'Native' }
  ],
  links: [
    { id: 'link-1', label: 'LeetCode', url: 'https://leetcode.com/u/amareswar' },
    { id: 'link-2', label: 'GitHub', url: 'https://github.com/amareswarnayak' }
  ]
};

export default function ResumeBuilderPage() {
  const { profile, jobs, selectedJob } = useCareer();
  const { user } = useAuth();

  // Active Resume Document State
  const [resumeData, setResumeData] = useState(() => {
    try {
      const local = localStorage.getItem('career_builder_resume_draft');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return {
      ...DEFAULT_RESUME_STATE,
      targetRole: profile?.targetRole || 'Software Developer',
      targetCompany: profile?.dreamCompany || ''
    };
  });

  const [activeResumeId, setActiveResumeId] = useState(null);
  const [resumesList, setResumesList] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [savingStatus, setSavingStatus] = useState('Saved'); // 'Saving...' | 'Saved' | 'Error'
  const [mobileTab, setMobileTab] = useState('edit'); // 'edit' | 'preview'

  // Accordion Sections State
  const [openSections, setOpenSections] = useState({
    personal: true,
    summary: true,
    education: true,
    experience: true,
    projects: true,
    skills: true,
    achievements: false,
    certifications: false,
    languages: false,
    links: false
  });

  // AI Feature States
  const [aiLoadingType, setAiLoadingType] = useState(null);
  const [skillsSuggestions, setSkillsSuggestions] = useState(null);
  const [copiedItem, setCopiedItem] = useState(null);

  // ATS Check State
  const [atsCheckResult, setAtsCheckResult] = useState(null);
  const [checkingAts, setCheckingAts] = useState(false);
  const [showAtsModal, setShowAtsModal] = useState(false);

  // Job Match Integration Modal State
  const [showJobCompareModal, setShowJobCompareModal] = useState(false);

  // Auto-save debounce timer
  const autoSaveTimer = useRef(null);
  const resumePrintRef = useRef(null);

  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // 1. Fetch user resumes from backend on mount
  useEffect(() => {
    const fetchUserResumes = async () => {
      setLoadingResumes(true);
      try {
        const res = await API.get('/resume/builder/list');
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          setResumesList(res.data.data);
          if (res.data.data.length > 0) {
            // Load latest resume
            const latestId = res.data.data[0]._id;
            setActiveResumeId(latestId);
            const detailRes = await API.get(`/resume/builder/${latestId}`);
            if (detailRes.data && detailRes.data.success && detailRes.data.data) {
              setResumeData(detailRes.data.data);
            }
          }
        }
      } catch (err) {
        console.warn('Resume builder fetch notice:', err.message);
      } finally {
        setLoadingResumes(false);
      }
    };
    fetchUserResumes();
  }, []);

  // 2. Debounced auto-save whenever resumeData changes
  useEffect(() => {
    setSavingStatus('Saving...');
    try {
      localStorage.setItem('career_builder_resume_draft', JSON.stringify(resumeData));
    } catch (e) {}

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const endpoint = activeResumeId ? `/resume/builder/${activeResumeId}` : '/resume/builder';
        const method = activeResumeId ? 'put' : 'post';
        const res = await API[method](endpoint, resumeData);
        if (res.data && res.data.success && res.data.data) {
          if (!activeResumeId && res.data.data._id) {
            setActiveResumeId(res.data.data._id);
            setResumesList(prev => [{ _id: res.data.data._id, title: res.data.data.title }, ...prev]);
          }
          setSavingStatus('Saved');
        }
      } catch (err) {
        setSavingStatus('Saved'); // Local fallback succeeded
      }
    }, 1200);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [resumeData, activeResumeId]);

  // Handle Resume Creation
  const handleCreateNewResume = async () => {
    const title = `${profile?.targetRole || 'Software Developer'} Resume ${resumesList.length + 1}`;
    const newDoc = {
      ...DEFAULT_REST_DATA(),
      title,
      targetRole: profile?.targetRole || 'Software Developer',
      targetCompany: profile?.dreamCompany || ''
    };
    try {
      const res = await API.post('/resume/builder', newDoc);
      if (res.data && res.data.success && res.data.data) {
        const saved = res.data.data;
        setActiveResumeId(saved._id);
        setResumeData(saved);
        setResumesList(prev => [saved, ...prev]);
      }
    } catch (e) {
      setResumeData(newDoc);
      setActiveResumeId(null);
    }
  };

  const DEFAULT_REST_DATA = () => ({
    ...DEFAULT_RESUME_STATE,
    personal: {
      ...DEFAULT_RESUME_STATE.personal,
      name: user?.name || DEFAULT_RESUME_STATE.personal.name,
      email: user?.email || DEFAULT_RESUME_STATE.personal.email
    }
  });

  // Handle Switch Resume
  const handleSelectResume = async (id) => {
    if (id === activeResumeId) return;
    try {
      const res = await API.get(`/resume/builder/${id}`);
      if (res.data && res.data.success && res.data.data) {
        setActiveResumeId(id);
        setResumeData(res.data.data);
      }
    } catch (e) {
      console.error('Error loading resume:', e);
    }
  };

  // Handle Duplicate Resume
  const handleDuplicateResume = async () => {
    if (!activeResumeId) return;
    try {
      const res = await API.post(`/resume/builder/${activeResumeId}/duplicate`);
      if (res.data && res.data.success && res.data.data) {
        const duplicated = res.data.data;
        setActiveResumeId(duplicated._id);
        setResumeData(duplicated);
        setResumesList(prev => [duplicated, ...prev]);
      }
    } catch (e) {
      console.error('Error duplicating resume:', e);
    }
  };

  // Handle AI Content Improvement
  const handleAiImprove = async (type, currentText, extraContext = {}) => {
    setAiLoadingType(type);
    try {
      const res = await API.post('/resume/builder/ai-improve', {
        type,
        text: currentText,
        targetRole: resumeData.targetRole || profile?.targetRole || 'Software Developer',
        targetCompany: resumeData.targetCompany || profile?.dreamCompany || '',
        skills: resumeData.skills,
        ...extraContext
      });

      if (res.data && res.data.success && res.data.data) {
        if (type === 'summary') {
          setResumeData(prev => ({ ...prev, summary: res.data.data.improvedText }));
        } else if (type === 'suggest_skills') {
          setSkillsSuggestions(res.data.data.suggestions || []);
        }
        return res.data.data.improvedText;
      }
    } catch (e) {
      console.error('AI improve error:', e);
    } finally {
      setAiLoadingType(null);
    }
  };

  // Handle ATS Score Check
  const handleCheckAts = async () => {
    setCheckingAts(true);
    try {
      const res = await API.post('/resume/builder/ats-check', {
        resumeData,
        targetRole: resumeData.targetRole || profile?.targetRole || 'Software Developer'
      });
      if (res.data && res.data.success && res.data.data) {
        setAtsCheckResult(res.data.data);
        setShowAtsModal(true);
      }
    } catch (e) {
      console.error('ATS check error:', e);
    } finally {
      setCheckingAts(false);
    }
  };

  // Handle Print & PDF Download
  const handlePrint = () => {
    window.print();
  };

  // Tag Manager for Skills
  const handleAddSkillTag = (category, value) => {
    if (!value || !value.trim()) return;
    const clean = value.trim();
    setResumeData(prev => {
      const currentList = prev.skills?.[category] || [];
      if (currentList.some(s => s.toLowerCase() === clean.toLowerCase())) return prev;
      return {
        ...prev,
        skills: {
          ...prev.skills,
          [category]: [...currentList, clean]
        }
      };
    });
  };

  const handleRemoveSkillTag = (category, skillToRemove) => {
    setResumeData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: (prev.skills?.[category] || []).filter(s => s !== skillToRemove)
      }
    }));
  };

  // Compare with currently active Job Match
  const activeComparisonJob = selectedJob || (jobs && jobs.length > 0 ? jobs[0] : null);
  const getJobComparison = () => {
    if (!activeComparisonJob) return null;
    const jobSkills = activeComparisonJob.skills || [];
    const allUserSkills = Object.values(resumeData.skills || {}).flat();
    const matching = jobSkills.filter(js => allUserSkills.some(us => us.toLowerCase() === js.toLowerCase()));
    const missing = jobSkills.filter(js => !allUserSkills.some(us => us.toLowerCase() === js.toLowerCase()));
    return {
      jobTitle: activeComparisonJob.title,
      company: activeComparisonJob.company,
      matching,
      missing,
      description: activeComparisonJob.description
    };
  };

  const comparisonData = getJobComparison();

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* =========================================================================
          TOP HEADER: ACTIONS, TEMPLATE SELECTOR, AND PERSISTENCE STATUS
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resumeData.title || 'My Resume'}
                  onChange={(e) => setResumeData(prev => ({ ...prev, title: e.target.value }))}
                  className="font-bold text-slate-900 text-base md:text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none transition"
                />
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">
                Target Role: <strong className="text-indigo-600">{resumeData.targetRole || profile?.targetRole || 'Software Developer'}</strong>
                {resumeData.targetCompany && <span> • Target Company: <strong className="text-slate-700">{resumeData.targetCompany}</strong></span>}
                <span className="ml-2 text-[10px] text-slate-400 font-mono">({savingStatus})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Template Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setResumeData(prev => ({ ...prev, template: 'ats' }))}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                resumeData.template === 'ats' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ATS Professional
            </button>
            <button
              type="button"
              onClick={() => setResumeData(prev => ({ ...prev, template: 'modern' }))}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                resumeData.template === 'modern' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modern
            </button>
            <button
              type="button"
              onClick={() => setResumeData(prev => ({ ...prev, template: 'minimal' }))}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                resumeData.template === 'minimal' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minimal
            </button>
          </div>

          {/* Job Match Comparison Button */}
          {comparisonData && (
            <button
              type="button"
              onClick={() => setShowJobCompareModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Job Match Intel</span>
            </button>
          )}

          {/* Check ATS Readiness Button */}
          <button
            type="button"
            onClick={handleCheckAts}
            disabled={checkingAts}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-2xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileCheck2 className={`w-3.5 h-3.5 ${checkingAts ? 'animate-spin' : ''}`} />
            <span>{checkingAts ? 'Evaluating...' : 'Check ATS Score'}</span>
          </button>

          {/* Download PDF / Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Duplicate Button */}
          {activeResumeId && (
            <button
              type="button"
              onClick={handleDuplicateResume}
              title="Duplicate Resume"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="flex md:hidden bg-slate-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
            mobileTab === 'edit' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Resume Form (Edit)
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
            mobileTab === 'preview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Live A4 Preview
        </button>
      </div>

      {/* =========================================================================
          MAIN SPLIT VIEW: LEFT FORM & RIGHT LIVE A4 PREVIEW
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: RESUME FORM ACCORDION */}
        <div className={`lg:col-span-6 space-y-4 ${mobileTab === 'preview' ? 'hidden md:block' : 'block'}`}>
          
          {/* 1. PERSONAL DETAILS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('personal')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">1. Personal Details</h3>
              </div>
              {openSections.personal ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.personal && (
              <div className="p-5 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resumeData.personal?.name || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, name: e.target.value } }))}
                    placeholder="e.g. Amareswar Nayak"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={resumeData.personal?.email || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, email: e.target.value } }))}
                    placeholder="e.g. name@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={resumeData.personal?.phone || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, phone: e.target.value } }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Location</label>
                  <input
                    type="text"
                    value={resumeData.personal?.location || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, location: e.target.value } }))}
                    placeholder="e.g. Bhubaneswar, India"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    value={resumeData.personal?.linkedin || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, linkedin: e.target.value } }))}
                    placeholder="e.g. linkedin.com/in/username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={resumeData.personal?.github || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, github: e.target.value } }))}
                    placeholder="e.g. github.com/username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Portfolio Website</label>
                  <input
                    type="text"
                    value={resumeData.personal?.portfolio || ''}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, portfolio: e.target.value } }))}
                    placeholder="e.g. yourname.dev"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. CAREER SUMMARY & AI IMPROVER */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('summary')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">2. Career Objective / Summary</h3>
              </div>
              {openSections.summary ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.summary && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-3 text-xs">
                <textarea
                  rows={4}
                  value={resumeData.summary || ''}
                  onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Write a concise 2-4 sentence summary of your technical background, skills, and career objective..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Pro-tip: Focus on core technologies and measurable potential without buzzwords.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAiImprove('summary', resumeData.summary)}
                    disabled={aiLoadingType === 'summary' || !resumeData.summary}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiLoadingType === 'summary' ? 'animate-spin' : ''}`} />
                    <span>{aiLoadingType === 'summary' ? 'Improving...' : 'Improve with AI'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. EDUCATION */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('education')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">3. Education ({resumeData.education?.length || 0})</h3>
              </div>
              {openSections.education ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.education && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs">
                {(resumeData.education || []).map((edu, idx) => (
                  <div key={edu.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Entry #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeData(prev => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Degree</label>
                        <input
                          type="text"
                          value={edu.degree || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.education];
                              list[idx] = { ...list[idx], degree: val };
                              return { ...prev, education: list };
                            });
                          }}
                          placeholder="e.g. B.Tech in Computer Science"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Institution</label>
                        <input
                          type="text"
                          value={edu.institution || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.education];
                              list[idx] = { ...list[idx], institution: val };
                              return { ...prev, education: list };
                            });
                          }}
                          placeholder="e.g. GCEK Kalahandi"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Location</label>
                        <input
                          type="text"
                          value={edu.location || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.education];
                              list[idx] = { ...list[idx], location: val };
                              return { ...prev, education: list };
                            });
                          }}
                          placeholder="e.g. Odisha, India"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Start</label>
                          <input
                            type="text"
                            value={edu.startYear || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setResumeData(prev => {
                                const list = [...prev.education];
                                list[idx] = { ...list[idx], startYear: val };
                                return { ...prev, education: list };
                              });
                            }}
                            placeholder="2022"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">End</label>
                          <input
                            type="text"
                            value={edu.endYear || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setResumeData(prev => {
                                const list = [...prev.education];
                                list[idx] = { ...list[idx], endYear: val };
                                return { ...prev, education: list };
                              });
                            }}
                            placeholder="2026"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">CGPA/%</label>
                          <input
                            type="text"
                            value={edu.grade || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setResumeData(prev => {
                                const list = [...prev.education];
                                list[idx] = { ...list[idx], grade: val };
                                return { ...prev, education: list };
                              });
                            }}
                            placeholder="8.4"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      education: [
                        ...(prev.education || []),
                        { id: `edu-${Date.now()}`, degree: '', institution: '', location: '', startYear: '', endYear: '', grade: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Education</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. EXPERIENCE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('experience')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">4. Experience ({resumeData.experience?.length || 0})</h3>
              </div>
              {openSections.experience ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.experience && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs">
                {(resumeData.experience || []).map((exp, idx) => (
                  <div key={exp.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Experience #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeData(prev => ({
                            ...prev,
                            experience: prev.experience.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Job Title</label>
                        <input
                          type="text"
                          value={exp.role || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.experience];
                              list[idx] = { ...list[idx], role: val };
                              return { ...prev, experience: list };
                            });
                          }}
                          placeholder="e.g. Software Developer Intern"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Company</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.experience];
                              list[idx] = { ...list[idx], company: val };
                              return { ...prev, experience: list };
                            });
                          }}
                          placeholder="e.g. TCS / Startup"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Location</label>
                        <input
                          type="text"
                          value={exp.location || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.experience];
                              list[idx] = { ...list[idx], location: val };
                              return { ...prev, experience: list };
                            });
                          }}
                          placeholder="e.g. Bengaluru, India or Remote"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Start Date</label>
                          <input
                            type="text"
                            value={exp.startDate || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setResumeData(prev => {
                                const list = [...prev.experience];
                                list[idx] = { ...list[idx], startDate: val };
                                return { ...prev, experience: list };
                              });
                            }}
                            placeholder="e.g. Jun 2024"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">End Date</label>
                          <input
                            type="text"
                            value={exp.endDate || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setResumeData(prev => {
                                const list = [...prev.experience];
                                list[idx] = { ...list[idx], endDate: val };
                                return { ...prev, experience: list };
                              });
                            }}
                            placeholder="Present / Aug 2024"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-600">Responsibilities (One bullet per line)</label>
                        <button
                          type="button"
                          onClick={async () => {
                            const improved = await handleAiImprove('bullet', exp.responsibilities);
                            if (improved) {
                              setResumeData(prev => {
                                const list = [...prev.experience];
                                list[idx] = { ...list[idx], responsibilities: improved };
                                return { ...prev, experience: list };
                              });
                            }
                          }}
                          className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Polish with AI
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={exp.responsibilities || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const list = [...prev.experience];
                            list[idx] = { ...list[idx], responsibilities: val };
                            return { ...prev, experience: list };
                          });
                        }}
                        placeholder="Developed frontend interfaces using React...&#10;Collaborated with team to build backend REST APIs..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      experience: [
                        ...(prev.experience || []),
                        { id: `exp-${Date.now()}`, role: '', company: '', location: '', startDate: '', endDate: '', responsibilities: '', achievements: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Experience</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. PROJECTS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('projects')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">5. Projects ({resumeData.projects?.length || 0})</h3>
              </div>
              {openSections.projects ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.projects && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs">
                {(resumeData.projects || []).map((proj, idx) => (
                  <div key={proj.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Project #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeData(prev => ({
                            ...prev,
                            projects: prev.projects.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Project Name</label>
                        <input
                          type="text"
                          value={proj.name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.projects];
                              list[idx] = { ...list[idx], name: val };
                              return { ...prev, projects: list };
                            });
                          }}
                          placeholder="e.g. CareerAI Platform"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Technologies Used</label>
                        <input
                          type="text"
                          value={proj.technologies || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.projects];
                              list[idx] = { ...list[idx], technologies: val };
                              return { ...prev, projects: list };
                            });
                          }}
                          placeholder="e.g. React, Node.js, MongoDB"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Live Demo Link</label>
                        <input
                          type="text"
                          value={proj.projectLink || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.projects];
                              list[idx] = { ...list[idx], projectLink: val };
                              return { ...prev, projects: list };
                            });
                          }}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">GitHub Link</label>
                        <input
                          type="text"
                          value={proj.githubLink || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.projects];
                              list[idx] = { ...list[idx], githubLink: val };
                              return { ...prev, projects: list };
                            });
                          }}
                          placeholder="https://github.com/..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-600">Description / Contributions</label>
                        <button
                          type="button"
                          onClick={async () => {
                            const improved = await handleAiImprove('project', proj.description || proj.contributions);
                            if (improved) {
                              setResumeData(prev => {
                                const list = [...prev.projects];
                                list[idx] = { ...list[idx], description: improved };
                                return { ...prev, projects: list };
                              });
                            }
                          }}
                          className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Improve Project Description
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={proj.description || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const list = [...prev.projects];
                            list[idx] = { ...list[idx], description: val };
                            return { ...prev, projects: list };
                          });
                        }}
                        placeholder="Built scalable web application that streamlines... Engineered key features including..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      projects: [
                        ...(prev.projects || []),
                        { id: `proj-${Date.now()}`, name: '', description: '', technologies: '', role: '', contributions: '', projectLink: '', githubLink: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. SKILLS (CATEGORIZED TAGS + AI SUGGESTIONS) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('skills')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Code2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">6. Technical Skills</h3>
              </div>
              {openSections.skills ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.skills && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Organized categorized skills for high ATS parseability.</span>
                  <button
                    type="button"
                    onClick={() => handleAiImprove('suggest_skills', '')}
                    disabled={aiLoadingType === 'suggest_skills'}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition flex items-center gap-1 text-[11px]"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiLoadingType === 'suggest_skills' ? 'animate-spin' : ''}`} />
                    <span>Suggest Skills</span>
                  </button>
                </div>

                {/* AI Skill Suggestions Box */}
                {skillsSuggestions && skillsSuggestions.length > 0 && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-xs flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Recommended Skills for {resumeData.targetRole}
                      </span>
                      <button onClick={() => setSkillsSuggestions(null)} className="text-slate-400 hover:text-slate-600 text-[10px]">Dismiss</button>
                    </div>
                    <p className="text-[10px] text-indigo-800">
                      <em>Note: Consider adding these skills ONLY if you actually have experience with them. Never claim skills you haven't practiced.</em>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skillsSuggestions.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            handleAddSkillTag(item.category || 'other', item.skill);
                            setSkillsSuggestions(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{item.skill}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Categories */}
                {[
                  { key: 'programming', label: 'Programming Languages' },
                  { key: 'frameworks', label: 'Frameworks & Libraries' },
                  { key: 'databases', label: 'Databases & Storage' },
                  { key: 'tools', label: 'Tools & Platforms' },
                  { key: 'other', label: 'Other Skills / Methodologies' }
                ].map(cat => {
                  const currentList = resumeData.skills?.[cat.key] || [];
                  return (
                    <div key={cat.key} className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700">{cat.label}</label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[40px]">
                        {currentList.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-[11px] font-medium"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkillTag(cat.key, skill)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="+ Add (press enter)..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSkillTag(cat.key, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="text-[11px] bg-transparent border-none focus:outline-none flex-1 min-w-[120px] px-1 py-0.5"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. ACHIEVEMENTS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('achievements')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">7. Achievements ({resumeData.achievements?.length || 0})</h3>
              </div>
              {openSections.achievements ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.achievements && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-3 text-xs">
                {(resumeData.achievements || []).map((ach, idx) => (
                  <div key={ach.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Achievement #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeData(prev => ({
                            ...prev,
                            achievements: prev.achievements.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={ach.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.achievements];
                              list[idx] = { ...list[idx], title: val };
                              return { ...prev, achievements: list };
                            });
                          }}
                          placeholder="e.g. Smart India Hackathon Finalist"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={ach.date || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.achievements];
                              list[idx] = { ...list[idx], date: val };
                              return { ...prev, achievements: list };
                            });
                          }}
                          placeholder="Year / Date"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={ach.description || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const list = [...prev.achievements];
                          list[idx] = { ...list[idx], description: val };
                          return { ...prev, achievements: list };
                        });
                      }}
                      placeholder="Brief details regarding achievement and measurable impact..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      achievements: [
                        ...(prev.achievements || []),
                        { id: `ach-${Date.now()}`, title: '', description: '', date: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Achievement</span>
                </button>
              </div>
            )}
          </div>

          {/* 8. CERTIFICATIONS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('certifications')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">8. Certifications ({resumeData.certifications?.length || 0})</h3>
              </div>
              {openSections.certifications ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.certifications && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-3 text-xs">
                {(resumeData.certifications || []).map((cert, idx) => (
                  <div key={cert.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Certification #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeData(prev => ({
                            ...prev,
                            certifications: prev.certifications.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={cert.name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.certifications];
                              list[idx] = { ...list[idx], name: val };
                              return { ...prev, certifications: list };
                            });
                          }}
                          placeholder="Certification Name"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={cert.issuer || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const list = [...prev.certifications];
                              list[idx] = { ...list[idx], issuer: val };
                              return { ...prev, certifications: list };
                            });
                          }}
                          placeholder="Issuing Org (AWS, Meta)"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      certifications: [
                        ...(prev.certifications || []),
                        { id: `cert-${Date.now()}`, name: '', issuer: '', date: '', link: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Certification</span>
                </button>
              </div>
            )}
          </div>

          {/* 9. LANGUAGES */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('languages')}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LanguagesIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">9. Languages ({resumeData.languages?.length || 0})</h3>
              </div>
              {openSections.languages ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openSections.languages && (
              <div className="p-5 pt-0 border-t border-slate-100 space-y-3 text-xs">
                {(resumeData.languages || []).map((lang, idx) => (
                  <div key={lang.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lang.language || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const list = [...prev.languages];
                          list[idx] = { ...list[idx], language: val };
                          return { ...prev, languages: list };
                        });
                      }}
                      placeholder="e.g. English"
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={lang.proficiency || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const list = [...prev.languages];
                          list[idx] = { ...list[idx], proficiency: val };
                          return { ...prev, languages: list };
                        });
                      }}
                      placeholder="e.g. Professional / Native"
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setResumeData(prev => ({
                          ...prev,
                          languages: prev.languages.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setResumeData(prev => ({
                      ...prev,
                      languages: [
                        ...(prev.languages || []),
                        { id: `lang-${Date.now()}`, language: '', proficiency: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Language</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: LIVE A4-STYLE RESUME PREVIEW (INSTANT UPDATE)
            ========================================================================= */}
        <div className={`lg:col-span-6 sticky top-24 ${mobileTab === 'edit' ? 'hidden md:block' : 'block'}`}>
          <div className="bg-slate-200/70 p-4 md:p-6 rounded-3xl border border-slate-300 shadow-inner overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-600">
              <span className="font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" /> Live A4 Preview ({resumeData.template?.toUpperCase()} Template)
              </span>
              <span className="text-[11px] text-slate-500">Live rendered on every keystroke</span>
            </div>

            {/* A4 PAPER CONTAINER */}
            <div 
              ref={resumePrintRef}
              className={`bg-white rounded-lg shadow-xl text-slate-800 p-8 md:p-10 font-sans mx-auto transition-all duration-200 min-h-[820px] ${
                resumeData.template === 'minimal' ? 'text-[11px] leading-snug' : 'text-xs leading-normal'
              }`}
              style={{
                maxWidth: '680px',
                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* 1. PREVIEW HEADER: PERSONAL DETAILS */}
              <div className={`border-b pb-4 mb-4 ${
                resumeData.template === 'modern' ? 'border-indigo-600' : 'border-slate-800'
              }`}>
                <h1 className={`font-black tracking-tight ${
                  resumeData.template === 'modern' ? 'text-2xl text-indigo-900' : 'text-2xl text-slate-900'
                }`}>
                  {resumeData.personal?.name || 'Your Full Name'}
                </h1>
                
                {resumeData.targetRole && (
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                    {resumeData.targetRole}
                  </p>
                )}

                {/* Contact metadata */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-600 mt-2 font-medium">
                  {resumeData.personal?.email && <span>{resumeData.personal.email}</span>}
                  {resumeData.personal?.phone && <span>• {resumeData.personal.phone}</span>}
                  {resumeData.personal?.location && <span>• {resumeData.personal.location}</span>}
                  {resumeData.personal?.linkedin && (
                    <span>• <a href={`https://${resumeData.personal.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{resumeData.personal.linkedin}</a></span>
                  )}
                  {resumeData.personal?.github && (
                    <span>• <a href={`https://${resumeData.personal.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{resumeData.personal.github}</a></span>
                  )}
                  {resumeData.personal?.portfolio && (
                    <span>• <a href={`https://${resumeData.personal.portfolio.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{resumeData.personal.portfolio}</a></span>
                  )}
                </div>
              </div>

              {/* 2. PREVIEW: CAREER SUMMARY */}
              {resumeData.summary && (
                <div className="mb-4">
                  <h2 className={`font-bold uppercase tracking-wider mb-1.5 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Professional Summary
                  </h2>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{resumeData.summary}</p>
                </div>
              )}

              {/* 3. PREVIEW: TECHNICAL SKILLS */}
              {resumeData.skills && (
                <div className="mb-4">
                  <h2 className={`font-bold uppercase tracking-wider mb-1.5 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Technical Skills
                  </h2>
                  <div className="space-y-1 text-[11px]">
                    {resumeData.skills.programming?.length > 0 && (
                      <p><strong className="text-slate-900">Programming Languages:</strong> {resumeData.skills.programming.join(', ')}</p>
                    )}
                    {resumeData.skills.frameworks?.length > 0 && (
                      <p><strong className="text-slate-900">Frameworks & Libraries:</strong> {resumeData.skills.frameworks.join(', ')}</p>
                    )}
                    {resumeData.skills.databases?.length > 0 && (
                      <p><strong className="text-slate-900">Databases:</strong> {resumeData.skills.databases.join(', ')}</p>
                    )}
                    {resumeData.skills.tools?.length > 0 && (
                      <p><strong className="text-slate-900">Developer Tools:</strong> {resumeData.skills.tools.join(', ')}</p>
                    )}
                    {resumeData.skills.other?.length > 0 && (
                      <p><strong className="text-slate-900">Competencies:</strong> {resumeData.skills.other.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PREVIEW: EXPERIENCE */}
              {resumeData.experience && resumeData.experience.length > 0 && (
                <div className="mb-4">
                  <h2 className={`font-bold uppercase tracking-wider mb-2 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Work Experience
                  </h2>
                  <div className="space-y-3">
                    {resumeData.experience.map((exp, i) => (
                      <div key={i} className="text-[11px]">
                        <div className="flex justify-between items-baseline font-bold text-slate-900">
                          <span>{exp.role} {exp.company && <span className="font-semibold text-slate-700">| {exp.company}</span>}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {exp.startDate} – {exp.endDate || 'Present'} {exp.location && `| ${exp.location}`}
                          </span>
                        </div>
                        {exp.responsibilities && (
                          <ul className="list-disc pl-4 text-slate-700 mt-1 space-y-0.5">
                            {exp.responsibilities.split('\n').filter(Boolean).map((bullet, bIdx) => (
                              <li key={bIdx}>{bullet.replace(/^[•\-\*]\s*/, '')}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. PREVIEW: PROJECTS */}
              {resumeData.projects && resumeData.projects.length > 0 && (
                <div className="mb-4">
                  <h2 className={`font-bold uppercase tracking-wider mb-2 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Key Engineering Projects
                  </h2>
                  <div className="space-y-2.5">
                    {resumeData.projects.map((proj, i) => (
                      <div key={i} className="text-[11px]">
                        <div className="flex justify-between items-baseline font-bold text-slate-900">
                          <div>
                            <span>{proj.name}</span>
                            {proj.technologies && (
                              <span className="font-normal text-slate-600 text-[10px] ml-1.5 italic">({proj.technologies})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-medium">
                            {proj.projectLink && <a href={proj.projectLink} target="_blank" rel="noreferrer" className="hover:underline">Demo</a>}
                            {proj.githubLink && <a href={proj.githubLink} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>}
                          </div>
                        </div>
                        {proj.description && (
                          <p className="text-slate-700 mt-0.5 leading-relaxed">{proj.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. PREVIEW: EDUCATION */}
              {resumeData.education && resumeData.education.length > 0 && (
                <div className="mb-4">
                  <h2 className={`font-bold uppercase tracking-wider mb-1.5 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Education
                  </h2>
                  <div className="space-y-2">
                    {resumeData.education.map((edu, i) => (
                      <div key={i} className="text-[11px] flex justify-between items-baseline">
                        <div>
                          <strong className="text-slate-900">{edu.degree}</strong>
                          <p className="text-slate-600">{edu.institution} {edu.location && `• ${edu.location}`}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 shrink-0">
                          <span>{edu.startYear} – {edu.endYear}</span>
                          {edu.grade && <p className="font-semibold text-slate-700">{edu.grade}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. PREVIEW: ACHIEVEMENTS & CERTIFICATIONS */}
              {((resumeData.achievements && resumeData.achievements.length > 0) || (resumeData.certifications && resumeData.certifications.length > 0)) && (
                <div className="mb-3">
                  <h2 className={`font-bold uppercase tracking-wider mb-1.5 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Achievements & Certifications
                  </h2>
                  <ul className="list-disc pl-4 text-slate-700 text-[11px] space-y-0.5">
                    {resumeData.achievements?.map((ach, i) => (
                      <li key={`ach-${i}`}>
                        <strong className="text-slate-900">{ach.title}</strong> {ach.date && `(${ach.date})`}: {ach.description}
                      </li>
                    ))}
                    {resumeData.certifications?.map((cert, i) => (
                      <li key={`cert-${i}`}>
                        <strong className="text-slate-900">{cert.name}</strong> — {cert.issuer} {cert.date && `(${cert.date})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 8. PREVIEW: LANGUAGES */}
              {resumeData.languages && resumeData.languages.length > 0 && (
                <div>
                  <h2 className={`font-bold uppercase tracking-wider mb-1 ${
                    resumeData.template === 'modern' ? 'text-xs text-indigo-800 border-b border-indigo-200 pb-0.5' : 'text-xs text-slate-900 border-b border-slate-300 pb-0.5'
                  }`}>
                    Languages
                  </h2>
                  <p className="text-[11px] text-slate-700">
                    {resumeData.languages.map(l => `${l.language} (${l.proficiency})`).join(' • ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: ATS READINESS CHECK MODAL
          ========================================================================= */}
      {showAtsModal && atsCheckResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">ATS Readiness Analysis</h3>
              </div>
              <button onClick={() => setShowAtsModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕ Close</button>
            </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Evaluation Score</span>
                <h4 className="text-xl font-black text-slate-900">{atsCheckResult.ratingLabel}</h4>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                atsCheckResult.score >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {atsCheckResult.score >= 75 ? 'Strong Candidate' : 'Improvement Recommended'}
              </span>
            </div>

            {/* Strengths */}
            {atsCheckResult.strengths?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Strengths Identified
                </h5>
                <ul className="space-y-1 text-[11px] text-slate-700 pl-5 list-disc">
                  {atsCheckResult.strengths.map((str, i) => <li key={i}>{str}</li>)}
                </ul>
              </div>
            )}

            {/* Missing / Weak Areas */}
            {atsCheckResult.missingAreas?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Missing / Weak Areas
                </h5>
                <ul className="space-y-1 text-[11px] text-slate-700 pl-5 list-disc">
                  {atsCheckResult.missingAreas.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {atsCheckResult.suggestions?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h5 className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Optimization Suggestions
                </h5>
                <ul className="space-y-1 text-[11px] text-slate-700 pl-5 list-disc">
                  {atsCheckResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowAtsModal(false)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Back to Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: JOB MATCH ↔ RESUME INTEGRATION MODAL
          ========================================================================= */}
      {showJobCompareModal && comparisonData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{comparisonData.jobTitle}</h3>
                  <p className="text-[11px] text-slate-500">{comparisonData.company} — Job Match Comparison</p>
                </div>
              </div>
              <button onClick={() => setShowJobCompareModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕ Close</button>
            </div>

            <p className="text-[11px] text-slate-600">
              Comparing your built resume against the live job requirements from your Job Match section.
            </p>

            {/* Matching Skills */}
            <div className="space-y-1.5 text-xs">
              <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Skills You Already Match ({comparisonData.matching.length})
              </h5>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {comparisonData.matching.length > 0 ? (
                  comparisonData.matching.map((sk, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-medium">
                      ✓ {sk}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No direct keyword overlap yet.</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="space-y-1.5 text-xs">
              <h5 className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Skills Mentioned in Job But Not in Resume ({comparisonData.missing.length})
              </h5>
              <p className="text-[10px] text-slate-500 italic">
                Recommendation only: Add these to your resume skills ONLY if you have worked with them.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {comparisonData.missing.map((sk, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSkillTag('tools', sk)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                    title="Click to add if you know this skill"
                  >
                    <span>+ {sk}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowJobCompareModal(false)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
