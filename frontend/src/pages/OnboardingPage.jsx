import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Target,
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCareer } from '../context/CareerContext';

export default function OnboardingPage() {
  const { user, submitOnboarding } = useAuth();
  const { refreshAll } = useCareer();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [collegeName, setCollegeName] = useState(user?.collegeName || 'Government College of Engineering Kalahandi');
  const [degree, setDegree] = useState('B.Tech');
  const [customDegree, setCustomDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('2028');
  const [dreamCompany, setDreamCompany] = useState('');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'MERN Stack Developer');
  const [customTargetRole, setCustomTargetRole] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic user name for welcome message
  const displayName = user?.name ? user.name.trim().split(' ')[0] : 'there';

  const degreeOptions = [
    'B.Tech',
    'B.E.',
    'BCA',
    'MCA',
    'B.Sc',
    'M.Sc',
    'MBA',
    'Other'
  ];

  const popularCompanies = [
    'Google', 'Microsoft', 'Amazon', 'Tata Consultancy Services', 'Infosys', 'Accenture', 'Wipro', 'Adobe'
  ];

  const targetRoleOptions = [
    'MERN Stack Developer',
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Data Analyst',
    'Java Developer',
    'AI/ML Engineer',
    'Other'
  ];

  // Step 1 -> Step 2
  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!collegeName.trim()) {
      setError('Please enter your college name to continue.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Step 2 -> Step 3
  const handleStep2Next = (e) => {
    e.preventDefault();
    const finalDegree = degree === 'Other' ? customDegree.trim() : degree.trim();
    if (!finalDegree) {
      setError('Please select or specify your degree to continue.');
      return;
    }
    setError('');
    setStep(3);
  };

  // Step 3 -> Step 4
  const handleStep3Continue = (e) => {
    e.preventDefault();
    if (!dreamCompany.trim()) {
      setError('Please enter your dream company to continue.');
      return;
    }
    setError('');
    setStep(4);
  };

  // Step 4 -> Step 5
  const handleStep4Continue = (e) => {
    e.preventDefault();
    const finalRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole.trim();
    if (!finalRole) {
      setError('Please enter or select your target role to continue.');
      return;
    }
    setError('');
    setStep(5);
  };

  // Step 5 File Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileNameLower = file.name.toLowerCase();
    const isExtensionValid = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !isExtensionValid) {
      setError('Supported file formats are PDF, DOC, and DOCX only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    setError('');
    setResumeFile(file);
  };

  // Step 5 -> Submit with Uploaded Resume
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      // If user clicks submit without file, proceed with skip flow
      return handleSkipForNow();
    }

    const finalDegree = degree === 'Other' ? customDegree.trim() : degree.trim();
    const finalRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole.trim();

    setError('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('collegeName', collegeName.trim());
      formData.append('degree', finalDegree);
      formData.append('graduationYear', graduationYear);
      formData.append('dreamCompany', dreamCompany.trim());
      formData.append('targetRole', finalRole);
      formData.append('resume', resumeFile);
      formData.append('resumeStatus', 'uploaded');

      const res = await submitOnboarding(formData);
      if (res.success) {
        if (refreshAll) refreshAll();
        // Redirect directly to the existing Student Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.error || 'Failed to complete onboarding. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5 -> Skip for Now (Enters app without resume)
  const handleSkipForNow = async () => {
    const finalDegree = degree === 'Other' ? customDegree.trim() : degree.trim();
    const finalRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole.trim();

    setError('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('collegeName', collegeName.trim());
      formData.append('degree', finalDegree);
      formData.append('graduationYear', graduationYear);
      formData.append('dreamCompany', dreamCompany.trim());
      formData.append('targetRole', finalRole);
      formData.append('resumeStatus', 'skipped');

      const res = await submitOnboarding(formData);
      if (res.success) {
        if (refreshAll) refreshAll();
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.error || 'Failed to complete onboarding. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5 -> Create Resume (Redirects directly to Resume Builder with onboarding prefilled)
  const handleCreateResume = async () => {
    const finalDegree = degree === 'Other' ? customDegree.trim() : degree.trim();
    const finalRole = targetRole === 'Other' ? customTargetRole.trim() : targetRole.trim();

    setError('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('collegeName', collegeName.trim());
      formData.append('degree', finalDegree);
      formData.append('graduationYear', graduationYear);
      formData.append('dreamCompany', dreamCompany.trim());
      formData.append('targetRole', finalRole);
      formData.append('resumeStatus', 'created');

      const res = await submitOnboarding(formData);
      if (res.success) {
        if (refreshAll) refreshAll();
        navigate('/resume-builder', { 
          replace: true,
          state: {
            fromOnboarding: true,
            collegeName: collegeName.trim(),
            degree: finalDegree,
            graduationYear,
            dreamCompany: dreamCompany.trim(),
            targetRole: finalRole
          }
        });
      } else {
        setError(res.error || 'Failed to initialize profile. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while saving your profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'College' },
    { num: 2, label: 'Degree' },
    { num: 3, label: 'Dream Company' },
    { num: 4, label: 'Target Role' },
    { num: 5, label: 'Resume' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 py-12 relative font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Onboarding Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 md:p-10 space-y-8 relative z-10 border border-slate-100">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">CareerAI</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-full">
            Student Onboarding
          </span>
        </div>

        {/* Progress Stepper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            {stepsList.map((s) => (
              <div 
                key={s.num} 
                className={`flex items-center gap-1.5 ${
                  step === s.num ? 'text-indigo-600 font-bold' : step > s.num ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num 
                    ? 'bg-indigo-600 text-white' 
                    : step > s.num 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Friendly Error Display */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* STEP 1: WELCOME & COLLEGE */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome <span className="text-indigo-600">{displayName}</span>, let's build your career here
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tell us where you study so we can personalize your campus placement insights and opportunities.
              </p>
            </div>

            <form noValidate onSubmit={handleStep1Next} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  What is your college name?
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="college-name-input"
                    type="text"
                    value={collegeName}
                    onChange={(e) => { setCollegeName(e.target.value); setError(''); }}
                    placeholder="e.g. Government College of Engineering Kalahandi"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="onboarding-step1-next"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: DEGREE */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                What is your degree?
              </h2>
              <p className="text-xs text-slate-500">
                Select your academic degree program to align relevant skills and job openings.
              </p>
            </div>

            <form noValidate onSubmit={handleStep2Next} className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {degreeOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => { setDegree(opt); setError(''); }}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                      degree === opt
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-500/10'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {degree === 'Other' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Specify your degree
                  </label>
                  <input
                    id="custom-degree-input"
                    type="text"
                    value={customDegree}
                    onChange={(e) => { setCustomDegree(e.target.value); setError(''); }}
                    placeholder="e.g. B.Com, Integrated M.Tech"
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Expected Graduation Year */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Expected Graduation Year
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['2024', '2025', '2026', '2027', '2028', '2029'].map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => setGraduationYear(yr)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                        graduationYear === yr
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(1); }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  id="onboarding-step2-next"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: DREAM COMPANY */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                What is your dream company?
              </h2>
              <p className="text-xs text-slate-500">
                CareerAI will tailor company intelligence, interview questions, and placement roadmaps to your goal.
              </p>
            </div>

            <form noValidate onSubmit={handleStep3Continue} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="dream-company-input"
                    type="text"
                    value={dreamCompany}
                    onChange={(e) => { setDreamCompany(e.target.value); setError(''); }}
                    placeholder="e.g. Google, Microsoft, TCS, Amazon"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Suggestions chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Popular Targets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularCompanies.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => { setDreamCompany(c); setError(''); }}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                        dreamCompany === c 
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(2); }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  id="onboarding-step3-continue"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: TARGET ROLE */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                What is your target role?
              </h2>
              <p className="text-xs text-slate-500">
                CareerAI will optimize your ATS resume evaluation, job recommendations, and placement preparation for this role.
              </p>
            </div>

            <form noValidate onSubmit={handleStep4Continue} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Target Role
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="target-role-input"
                    type="text"
                    value={targetRole === 'Other' ? customTargetRole : targetRole}
                    onChange={(e) => { setTargetRole(e.target.value); setError(''); }}
                    placeholder="e.g. MERN Stack Developer, Software Engineer"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Suggestions chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Popular Roles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {targetRoleOptions.filter(r => r !== 'Other').map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => { setTargetRole(r); setError(''); }}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                        targetRole === r 
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setError(''); setStep(3); }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  id="onboarding-step4-continue"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 5: RESUME STEP (Upload, Create, or Skip) */}
        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Resume Setup
              </h2>
              <p className="text-xs text-slate-500">
                Upload your resume, build a new one tailored for <span className="font-bold text-indigo-600">{targetRole}</span>, or skip for now to start exploring CareerAI.
              </p>
            </div>

            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              {/* Option 1: Upload Existing Resume (Original dropzone preserved) */}
              {!resumeFile ? (
                <label 
                  htmlFor="resume-file-input"
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 flex items-center justify-center transition shadow-sm mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Upload Existing Resume
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Supported formats: PDF, DOC, DOCX (Max 10MB)
                  </span>
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="border border-indigo-200 bg-indigo-50/50 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{resumeFile.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(resumeFile.size / 1024).toFixed(1)} KB • Ready for AI analysis
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Clean separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">OR</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Option 2: Create Resume (Direct to Resume Builder) */}
              <div 
                onClick={!isSubmitting ? handleCreateResume : undefined}
                className="border border-slate-200 hover:border-indigo-300 bg-slate-50/60 hover:bg-indigo-50/40 rounded-2xl p-4 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                      Create Resume with Resume Builder
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pre-fills your college & target role. No file upload required.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="onboarding-create-resume-button"
                  className="px-3.5 py-1.5 bg-white border border-slate-200 group-hover:border-indigo-300 group-hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0"
                >
                  <span>Create Resume</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setError(''); setStep(4); }}
                  className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold text-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {/* Option 3: Skip for Now */}
                <button
                  type="button"
                  id="onboarding-skip-resume-button"
                  disabled={isSubmitting}
                  onClick={handleSkipForNow}
                  className="px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs transition disabled:opacity-50"
                >
                  Skip for Now
                </button>

                {resumeFile ? (
                  <button
                    type="submit"
                    id="onboarding-submit-button"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Analyzing resume with Groq AI...</span>
                      </span>
                    ) : (
                      <>
                        <span>Upload & Continue</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSkipForNow}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Continuing...</span>
                      </span>
                    ) : (
                      <>
                        <span>Continue to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
