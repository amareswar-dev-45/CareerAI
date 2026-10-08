import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Building2, 
  Sparkles, 
  Search, 
  Briefcase, 
  MapPin, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import CompanyIntelContent from '../components/intel/CompanyIntelContent';

export default function CompanyIntelPage() {
  const location = useLocation();
  const { profile } = useCareer();
  const { user } = useAuth();

  // Parse query params if navigated from Jobs page e.g. /company-intel?company=Google&role=Software%20Engineer
  const queryParams = new URLSearchParams(location.search);
  const initialCompany = queryParams.get('company') || profile?.dreamCompany || user?.dreamCompany || 'Google';
  const initialRole = queryParams.get('role') || profile?.targetRole || user?.targetRole || 'Software Engineer';

  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [searchInput, setSearchInput] = useState(initialCompany);
  const [intelData, setIntelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const popularCompanies = ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Accenture'];

  const fetchIntel = async (targetCompany, targetRole, forceRefresh = false) => {
    if (!targetCompany) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        company: targetCompany.trim(),
        role: (targetRole || 'Software Engineer').trim()
      });
      if (forceRefresh) params.append('refresh', 'true');

      const res = await API.get(`/jobs/company-intelligence?${params.toString()}`);
      if (res.data && res.data.data) {
        setIntelData(res.data.data);
      } else {
        setError('Unable to load company intelligence right now.');
      }
    } catch (err) {
      console.error('Company Intel fetch error:', err);
      setError('Unable to load company intelligence right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel(company, role, false);
  }, [company, role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCompany(searchInput.trim());
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Company Intel</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real public-source employee reports, workplace culture, role expectations, and verified interview rounds.
          </p>
        </div>

        {/* Company Quick Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search company (e.g. TCS, Google)..."
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Research
          </button>
        </form>
      </div>

      {/* Target Role & Quick Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Role:</span>
          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
            {role}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-medium mr-1">Popular Companies:</span>
          {popularCompanies.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCompany(c);
                setSearchInput(c);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                company.toLowerCase() === c.toLowerCase()
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs">
        {error ? (
          <div className="p-6 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
            <p className="font-bold text-xs">{error}</p>
            <button
              onClick={() => fetchIntel(company, role, true)}
              className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <CompanyIntelContent
            companyIntel={intelData}
            loading={loading}
            targetCompany={company}
            targetRole={role}
            onRefresh={() => fetchIntel(company, role, true)}
          />
        )}
      </div>
    </div>
  );
}
