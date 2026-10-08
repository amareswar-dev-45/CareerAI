import React from 'react';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Users, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  HelpCircle, 
  HeartHandshake, 
  Scale, 
  Gauge, 
  Smile, 
  Code, 
  Compass, 
  Layers, 
  FileText,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function CompanyIntelContent({ 
  companyIntel, 
  loading, 
  targetCompany, 
  targetRole, 
  onRefresh 
}) {
  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400 space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-bold text-slate-800 text-sm">
            Analyzing public company and candidate data...
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Aggregating employee reviews, verified interview experiences, and role expectations for{' '}
            <span className="font-semibold text-indigo-600">{targetCompany}</span> &bull;{' '}
            <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!companyIntel) {
    return (
      <div className="text-center py-12 text-slate-500 space-y-3">
        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-xs">Select a company to view intelligence.</p>
      </div>
    );
  }

  const culture = companyIntel.companyCulture || {};
  const roleExp = companyIntel.roleExpectations || {};
  const interview = companyIntel.interviewExperience || {};

  return (
    <div className="space-y-8 font-sans text-xs text-slate-700">
      {/* Top Banner / Disclaimer & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px]">
        <div className="flex items-center gap-2 text-indigo-900">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Intelligence synthesized for <strong>{companyIntel.companyName}</strong> &bull; Role:{' '}
            <strong>{targetRole || companyIntel.role || 'Software Engineer'}</strong>
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition shadow-xs text-[11px] self-end sm:self-auto"
            title="Refresh research with live search"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Update Intel</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          SECTION 1: JOB / COMPANY DESCRIPTION (EXISTING)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>Job & Company Description</span>
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Core Overview</span>
        </div>

        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="font-bold text-slate-900 text-sm">{companyIntel.companyName}</h5>
            {companyIntel.website && companyIntel.website !== 'Not available' ? (
              <a 
                href={companyIntel.website.startsWith('http') ? companyIntel.website : `https://${companyIntel.website}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Official Website</span>
              </a>
            ) : (
              <span className="text-slate-400 text-[11px]">Website: Not available</span>
            )}
          </div>

          <p className="text-slate-600 leading-relaxed text-xs">
            {companyIntel.description !== 'Not available' 
              ? companyIntel.description 
              : companyIntel.about || 'Official company overview not available from public sources.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-slate-400 block font-medium">Industry:</span>
              <span className="font-semibold text-slate-800">{companyIntel.industry}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Headquarters:</span>
              <span className="font-semibold text-slate-800">{companyIntel.headquarters}</span>
            </div>
            {companyIntel.companySize && companyIntel.companySize !== 'Not available' && (
              <div>
                <span className="text-slate-400 block font-medium">Company Size:</span>
                <span className="font-semibold text-slate-800">{companyIntel.companySize}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: HIRING PROCESS (EXISTING)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Hiring Process</span>
            </h4>
          </div>
          {companyIntel.interviewProcessVerified ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Source Verified
            </span>
          ) : (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              Public Reports
            </span>
          )}
        </div>

        {companyIntel.rounds && companyIntel.rounds.length > 0 ? (
          <div className="space-y-2">
            {companyIntel.rounds.map((round, idx) => {
              const roundName = typeof round === 'string' ? round : round.name;
              const roundDesc = typeof round === 'object' ? round.description : 'Reported candidate interview stage';
              const evidence = typeof round === 'object' ? round.evidenceType : 'Reported candidate experience';
              
              let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
              if (evidence === 'Officially documented') badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (evidence === 'AI Insight') badgeBg = 'bg-purple-50 text-purple-700 border-purple-200';

              return (
                <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-3 shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 text-xs">{roundName}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {evidence}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{roundDesc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
            <p className="font-medium text-xs">
              {companyIntel.interviewProcessMessage || 'Hiring process rounds are synthesized based on candidate interview submissions.'}
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 3: COMPANY CULTURE (NEW)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
              3
            </span>
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span>Company Culture</span>
            </h4>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
            Public Employee Reports
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Main Culture Narrative */}
          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Overall Workplace Culture</span>
            </h5>
            <p className="text-slate-600 leading-relaxed text-xs">
              {culture.summary || 'Based on publicly available employee reports, company culture details are being gathered.'}
            </p>
          </div>

          {/* Key Culture Dimensions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Work Pressure */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                <span>Work Pressure</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {culture.workPressure || 'Not enough public data available for this section.'}
              </p>
            </div>

            {/* Work-Life Balance */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <Scale className="w-3.5 h-3.5 text-emerald-500" />
                <span>Work-Life Balance</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {culture.workLifeBalance || 'Not enough public data available for this section.'}
              </p>
            </div>

            {/* Supportiveness vs High Pressure */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                <span>Supportive vs High-Pressure</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {culture.supportiveness || 'Not enough public data available for this section.'}
              </p>
            </div>

            {/* Employee Sentiment */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <Smile className="w-3.5 h-3.5 text-indigo-500" />
                <span>Employee Sentiment</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {culture.employeeSentiment || 'Not enough public data available for this section.'}
              </p>
            </div>
          </div>

          {/* Culture Sources Citation */}
          {culture.sources && culture.sources.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span className="italic">
                Synthesized from {culture.sources.length} public employee review and discussion sources.
              </span>
              <div className="flex flex-wrap gap-2">
                {culture.sources.slice(0, 3).map((s, idx) => (
                  s.url && (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <span className="max-w-[120px] truncate">{s.title || 'Review source'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ROLE EXPECTATIONS (NEW - Specific to Company + Role)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
              4
            </span>
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600" />
              <span>Role Expectations ({targetRole || companyIntel.role || 'Software Engineer'})</span>
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Company-Specific Expectations
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Role Summary */}
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900 text-xs">Day-to-Day Expectation Overview</h5>
            <p className="text-slate-600 leading-relaxed text-xs">
              {roleExp.summary || 'Not enough public data available for this section.'}
            </p>
          </div>

          {/* Responsibilities List */}
          {roleExp.responsibilities && roleExp.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                Core Responsibilities
              </h5>
              <div className="space-y-1.5">
                {roleExp.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 text-[11px] text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Expectations & Skills */}
          {roleExp.technicalSkills && roleExp.technicalSkills.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                Technical Expectations & Skills
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {roleExp.technicalSkills.map((skill, idx) => (
                  <span key={idx} className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-xl font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Soft Skills & Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Soft Skills */}
            {roleExp.softSkills && roleExp.softSkills.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 text-[11px] block">Expected Soft Skills</span>
                <div className="flex flex-wrap gap-1">
                  {roleExp.softSkills.map((s, idx) => (
                    <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technologies & Tools */}
            {roleExp.technologies && roleExp.technologies.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 text-[11px] block">Common Technologies & Tools</span>
                <div className="flex flex-wrap gap-1">
                  {roleExp.technologies.map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expected Ownership */}
          {roleExp.expectedOwnership && (
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] space-y-1">
              <span className="font-bold text-indigo-900 block">Expected Ownership & Scope:</span>
              <p className="text-slate-600">{roleExp.expectedOwnership}</p>
            </div>
          )}

          {/* Role Sources Citation */}
          {roleExp.sources && roleExp.sources.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span className="italic">
                Role expectations derived from public postings and verified employee profiles.
              </span>
              <div className="flex flex-wrap gap-2">
                {roleExp.sources.slice(0, 3).map((s, idx) => (
                  s.url && (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <span className="max-w-[120px] truncate">{s.title || 'Role source'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: PREVIOUS CANDIDATE INTERVIEW EXPERIENCE (NEW)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
              5
            </span>
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Previous Candidate Interview Experience</span>
            </h4>
          </div>
          {interview.difficulty && (
            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
              Difficulty: {interview.difficulty}
            </span>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Summary */}
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900 text-xs">Reported Experience Summary</h5>
            <p className="text-slate-600 leading-relaxed text-xs">
              {interview.summary || 'Not enough public interview experience data available.'}
            </p>
          </div>

          {/* Reported Rounds If Available */}
          {interview.reportedRounds && interview.reportedRounds.length > 0 ? (
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                Reported Interview Rounds ({interview.reportedRounds.length})
              </h5>
              <div className="space-y-2">
                {interview.reportedRounds.map((rd, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {rd.roundNumber || idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">{rd.name}</span>
                        <span className="text-[9px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                          {rd.evidenceType || 'Candidate report'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{rd.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Not enough public interview experience data available for specific round sequences.</span>
            </div>
          )}

          {/* Coding / DSA & Behavioral Topics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Coding & Technical Topics */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">Common Technical & Coding Topics</span>
              {interview.codingTopics && interview.codingTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {interview.codingTopics.map((c, idx) => (
                    <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Not enough public coding data reported.</p>
              )}
            </div>

            {/* HR / Behavioral Questions */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">HR & Behavioral Areas</span>
              {interview.behavioralTopics && interview.behavioralTopics.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {interview.behavioralTopics.map((b, idx) => (
                    <span key={idx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-medium">
                      {b}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Not enough behavioral question data reported.</p>
              )}
            </div>
          </div>

          {/* Candidate Experience Sentiment */}
          {interview.candidateExperience && (
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-[11px] space-y-0.5">
              <span className="font-bold text-purple-900 block">Overall Candidate-Reported Experience:</span>
              <p className="text-slate-600">{interview.candidateExperience}</p>
            </div>
          )}

          {/* Interview Sources Citation */}
          {interview.sources && interview.sources.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span className="italic">
                Based on public candidate reviews and interview debriefs.
              </span>
              <div className="flex flex-wrap gap-2">
                {interview.sources.slice(0, 3).map((s, idx) => (
                  s.url && (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <span className="max-w-[120px] truncate">{s.title || 'Interview source'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          GLOBAL SOURCES TRANSPARENCY SECTION
          ========================================================================= */}
      {companyIntel.sources && companyIntel.sources.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h5 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Retrieved Public Sources & References</span>
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {companyIntel.sources.map((s, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] flex items-center justify-between gap-2">
                <div className="truncate">
                  <p className="font-semibold text-slate-700 truncate">{s.title || 'Public source'}</p>
                  <p className="text-slate-400 truncate">{s.snippet}</p>
                </div>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 flex items-center gap-0.5"
                  >
                    <span>Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
