import React, { useState, useEffect } from 'react';
import { Building2, Users, Award, TrendingUp, Sparkles, Search, Filter, BookOpen, ChevronRight } from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import API from '../services/api';

export default function CollegeAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    API.get('/college/dashboard', { headers: { 'x-admin-demo': 'true' } }).then(res => {
      if (res.data && res.data.data) setStats(res.data.data);
    }).catch(()=>{});

    API.get('/college/students', { headers: { 'x-admin-demo': 'true' } }).then(res => {
      if (res.data && res.data.data) setStudents(res.data.data);
    }).catch(()=>{});
  }, []);

  const defaultStats = stats || {
    institutionName: 'Government College of Engineering Kalahandi (GCEK)',
    totalStudents: 180,
    activeStudents: 142,
    avgProfileCompletion: 88,
    avgReadinessScore: 76,
    interviewsCompleted: 340,
    applicationsSubmitted: 890,
    verifiedOffers: 28,
    commonSkillGaps: [
      { skill: 'SQL & Database Indexing', percentage: 32, suggestedIntervention: 'SQL Workshop + Database Project Practice' },
      { skill: 'System Design & REST API Security', percentage: 28, suggestedIntervention: 'Microservices & API Security Bootcamp' },
      { skill: 'Docker Containerization', percentage: 24, suggestedIntervention: 'Hands-on DevOps & Docker Masterclass' }
    ]
  };

  const defaultStudents = students.length > 0 ? students : [
    { _id: 'std-101', name: 'Amareswar Nayak', email: 'amareswar@gcek.ac.in', degree: 'B.Tech CSE', year: '4th Year', targetRole: 'MERN Stack Developer', readinessScore: 78, resumeStatus: '86/100 ATS', topSkillGaps: ['Docker', 'System Design'], roadmapProgress: '91/220 Applied', interviewScore: 80, applicationsCount: 24 },
    { _id: 'std-102', name: 'Priya Sharma', email: 'priya.s@gcek.ac.in', degree: 'B.Tech IT', year: '4th Year', targetRole: 'Full Stack Java Developer', readinessScore: 82, resumeStatus: '90/100 ATS', topSkillGaps: ['Spring Security', 'AWS'], roadmapProgress: '120/200 Applied', interviewScore: 85, applicationsCount: 30 },
    { _id: 'std-103', name: 'Rahul Verma', email: 'rahul.v@gcek.ac.in', degree: 'B.Tech ECE', year: '3rd Year', targetRole: 'Frontend Developer', readinessScore: 68, resumeStatus: '65/100 ATS', topSkillGaps: ['TypeScript', 'Redux'], roadmapProgress: '45/180 Applied', interviewScore: 70, applicationsCount: 12 },
    { _id: 'std-104', name: 'Sneha Patel', email: 'sneha.p@gcek.ac.in', degree: 'B.Tech CSE', year: '4th Year', targetRole: 'Data Engineer', readinessScore: 75, resumeStatus: '82/100 ATS', topSkillGaps: ['PySpark', 'Kafka'], roadmapProgress: '80/200 Applied', interviewScore: 78, applicationsCount: 18 }
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Institution Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Institution Placement Portal</span>
          <h2 className="text-xl font-bold text-white mt-1">{defaultStats.institutionName}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Cohort Employability & Skill Readiness Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-center">
            <p className="text-[10px] text-slate-400">Total Enrolled</p>
            <p className="text-lg font-bold text-white">{defaultStats.totalStudents}</p>
          </div>
          <div className="px-4 py-2 bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-center">
            <p className="text-[10px] text-indigo-300">Avg Readiness</p>
            <p className="text-lg font-bold text-white">{defaultStats.avgReadinessScore}/100</p>
          </div>
        </div>
      </div>

      {/* Employability Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Active Students</p>
          <p className="text-xl font-bold text-slate-800">{defaultStats.activeStudents}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Interviews Completed</p>
          <p className="text-xl font-bold text-slate-800">{defaultStats.interviewsCompleted}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Applications Sent</p>
          <p className="text-xl font-bold text-slate-800">{defaultStats.applicationsSubmitted}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Verified Job Offers</p>
          <p className="text-xl font-bold text-emerald-600">{defaultStats.verifiedOffers}</p>
        </div>
      </div>

      {/* AI Cohort Interventions */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>AI Cohort Skill Gap & Suggested Interventions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {defaultStats.commonSkillGaps.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-800">{item.skill}</span>
                <span className="text-rose-600">{item.percentage}% Gap</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Suggested Intervention: <span className="font-semibold text-indigo-700">{item.suggestedIntervention}</span>
              </p>
              <span className="inline-block text-[9px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-medium">
                AI-generated recommendation
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Student Cohort Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800">Student Readiness Roster</h3>
          <div className="flex items-center gap-2 text-xs">
            {['All', 'CSE', 'IT', 'ECE'].map((d, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedDept(d)}
                className={`px-3 py-1.5 rounded-lg border font-semibold ${selectedDept === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Degree & Year</th>
                <th className="p-3">Target Role</th>
                <th className="p-3">Readiness</th>
                <th className="p-3">Resume ATS</th>
                <th className="p-3">Top Skill Gaps</th>
                <th className="p-3">Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaultStudents.map((std) => (
                <tr 
                  key={std._id} 
                  onClick={() => setSelectedStudent(std)}
                  className="hover:bg-slate-50 transition cursor-pointer"
                >
                  <td className="p-3 font-bold text-slate-800">{std.name}</td>
                  <td className="p-3 text-slate-600">{std.degree} ({std.year})</td>
                  <td className="p-3 font-medium text-indigo-700">{std.targetRole}</td>
                  <td className="p-3 font-bold text-emerald-600">{std.readinessScore}/100</td>
                  <td className="p-3 text-slate-700">{std.resumeStatus}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {std.topSkillGaps.map((sg, i) => (
                        <span key={i} className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-rose-100">
                          {sg}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">{std.applicationsCount} sent</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
