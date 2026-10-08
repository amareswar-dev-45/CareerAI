import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const CareerContext = createContext();

import { useAuth } from './AuthContext';

export const CareerProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, jobs, resume, match, applications, interview, skills, roadmap, college, profile
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [profile, setProfile] = useState({
    collegeName: 'Government College of Engineering Kalahandi',
    degree: 'B.Tech Computer Science',
    currentYear: '4th Year',
    targetRole: 'MERN Stack Developer',
    readinessScore: 78,
    profileCompletion: 91,
    skillsScore: 72,
    resumeScore: 86,
    interviewScore: 68
  });

  const [jobs, setJobs] = useState(() => {
    try {
      const saved = sessionStorage.getItem('career_cached_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [jobsMeta, setJobsMeta] = useState(() => {
    try {
      const saved = sessionStorage.getItem('career_cached_jobs_meta');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [applications, setApplications] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [skillGap, setSkillGap] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await API.get('/profile');
      if (res.data && res.data.data) setProfile(res.data.data);
    } catch (e) {}
  };

  // Smart cached job fetcher - prevents duplicate/unnecessary API calls on navigation
  const fetchJobsData = async ({ q = '', location = '', workMode = 'All', forceRefresh = false } = {}) => {
    const currentTargetRole = profile?.targetRole || 'Software Engineer';

    // 1. Check if we already have matching cached jobs and no forceRefresh requested
    if (!forceRefresh && jobs.length > 0 && jobsMeta) {
      const isRoleSame = (jobsMeta.targetRole || '').toLowerCase() === currentTargetRole.toLowerCase();
      const isQSame = (jobsMeta.searchQuery || '').trim().toLowerCase() === (q || '').trim().toLowerCase();
      const isLocSame = (jobsMeta.locationQuery || '').trim().toLowerCase() === (location || '').trim().toLowerCase();
      const isModeSame = (jobsMeta.workMode || 'All').toLowerCase() === (workMode || 'All').toLowerCase();

      if (isRoleSame && isQSame && isLocSame && isModeSame) {
        return { success: true, data: jobs, cached: true };
      }
    }

    // 2. Otherwise perform live fetch
    setJobsLoading(true);
    setJobsError('');
    try {
      const params = new URLSearchParams();
      if (q && q.trim()) params.append('q', q.trim());
      if (location && location.trim()) params.append('location', location.trim());
      if (workMode && workMode !== 'All') params.append('workMode', workMode);

      const res = await API.get(`/jobs?${params.toString()}`);
      if (res.data && res.data.success) {
        const fetched = res.data.data || [];
        setJobs(fetched);
        const meta = {
          targetRole: currentTargetRole,
          searchQuery: q,
          locationQuery: location,
          workMode,
          timestamp: Date.now()
        };
        setJobsMeta(meta);

        try {
          sessionStorage.setItem('career_cached_jobs', JSON.stringify(fetched));
          sessionStorage.setItem('career_cached_jobs_meta', JSON.stringify(meta));
        } catch (e) {}

        if (fetched.length > 0 && (!selectedJob || !fetched.some(j => j.id === selectedJob.id))) {
          setSelectedJob(fetched[0]);
        }
        return { success: true, data: fetched, cached: false };
      } else {
        const errMsg = 'Unable to load live jobs right now. Please try again.';
        setJobsError(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (err) {
      console.error('Job fetching error:', err.message);
      const errMsg = 'Unable to load live jobs right now. Please try again.';
      setJobsError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await API.get('/applications');
      if (res.data && res.data.data) setApplications(res.data.data);
    } catch (e) {}
  };

  const fetchResume = async () => {
    try {
      const res = await API.get('/resume/current');
      if (res.data && res.data.data) setResumeData(res.data.data);
    } catch (e) {}
  };

  const fetchATS = async () => {
    try {
      const res = await API.get('/ats/latest');
      if (res.data && res.data.data) setAtsAnalysis(res.data.data);
    } catch (e) {}
  };

  const fetchSkillGap = async () => {
    try {
      const res = await API.get('/skills/latest');
      if (res.data && res.data.data) setSkillGap(res.data.data);
    } catch (e) {}
  };

  const fetchRoadmap = async () => {
    try {
      const res = await API.get('/roadmap/current');
      if (res.data && res.data.data) setRoadmap(res.data.data);
    } catch (e) {}
  };

  const fetchInitialUserData = async () => {
    try {
      await Promise.allSettled([
        fetchProfile(),
        fetchApplications(),
        fetchResume(),
        fetchATS(),
        fetchSkillGap(),
        fetchRoadmap()
      ]);
    } catch (e) {}
  };

  useEffect(() => {
    if (user) {
      fetchInitialUserData();
    } else {
      // Clear or reset sensitive user states
      setApplications([]);
      setResumeData(null);
      setAtsAnalysis(null);
      setSkillGap(null);
      setRoadmap(null);
      setJobs([]);
      setJobsMeta(null);
      try {
        sessionStorage.removeItem('career_cached_jobs');
        sessionStorage.removeItem('career_cached_jobs_meta');
      } catch (e) {}
    }
  }, [user]);

  return (
    <CareerContext.Provider value={{
      activeTab,
      setActiveTab,
      isAiDrawerOpen,
      setIsAiDrawerOpen,
      profile,
      setProfile,
      jobs,
      setJobs,
      jobsMeta,
      selectedJob,
      setSelectedJob,
      jobsLoading,
      jobsError,
      fetchJobsData,
      refreshJobs: () => fetchJobsData({ forceRefresh: true }),
      applications,
      setApplications,
      resumeData,
      setResumeData,
      atsAnalysis,
      setAtsAnalysis,
      skillGap,
      setSkillGap,
      fetchSkillGap,
      roadmap,
      setRoadmap,
      fetchRoadmap,
      loading,
      refreshAll: () => {
        fetchInitialUserData();
        fetchJobsData({ forceRefresh: true });
      }
    }}>
      {children}
    </CareerContext.Provider>
  );
};

export const useCareer = () => useContext(CareerContext);
