import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Video, 
  VideoOff, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Code2, 
  Award, 
  Check, 
  RotateCcw,
  BookOpen,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  Building2,
  ExternalLink,
  ShieldCheck,
  Send,
  User,
  Compass,
  FileCheck2,
  Layers,
  ChevronRight,
  Eye,
  Edit3
} from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function InterviewCenterPage() {
  const navigate = useNavigate();
  const { profile } = useCareer();
  const { user } = useAuth();

  // Company and Target Role Configuration
  const defaultCompany = profile?.dreamCompany || user?.dreamCompany || 'TCS';
  const defaultRole = profile?.targetRole || user?.targetRole || 'Software Developer';

  const [targetCompany, setTargetCompany] = useState(defaultCompany);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [tempCompany, setTempCompany] = useState(defaultCompany);
  const [tempRole, setTempRole] = useState(defaultRole);

  // Researched Company Interview Plan
  const [interviewPlan, setInterviewPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Active Tab / Flow: 'overview' | 'aptitude' | 'technical' | 'hr' | 'report'
  const [activeTab, setActiveTab] = useState('overview');

  // ==================== 1. APTITUDE STATE ====================
  const [aptitudeSession, setAptitudeSession] = useState(null);
  const [aptitudeAnswers, setAptitudeAnswers] = useState({});
  const [currentAptIndex, setCurrentAptIndex] = useState(0);
  const [aptitudeTimer, setAptitudeTimer] = useState(900); // 15 mins
  const [aptitudeResult, setAptitudeResult] = useState(null);
  const [aptStarting, setAptStarting] = useState(false);
  const [submittingApt, setSubmittingApt] = useState(false);

  // ==================== 2. TECHNICAL STATE ====================
  const [techSession, setTechSession] = useState(null);
  const [techQuestions, setTechQuestions] = useState([]);
  const [currentTechIdx, setCurrentTechIdx] = useState(0);
  const [techAnswer, setTechAnswer] = useState('');
  const [evaluatingTech, setEvaluatingTech] = useState(false);
  const [currentTechEval, setCurrentTechEval] = useState(null);
  const [techStarting, setTechStarting] = useState(false);
  const [techFinalResult, setTechFinalResult] = useState(null);
  const [completingTech, setCompletingTech] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // ==================== 3. HR (GEMINI LIVE) STATE ====================
  const [hrSession, setHrSession] = useState(null);
  const [hrDialogue, setHrDialogue] = useState([]);
  const [hrInput, setHrInput] = useState('');
  const [hrStarting, setHrStarting] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [liveToken, setLiveToken] = useState(null);
  const [sendingHrMessage, setSendingHrMessage] = useState(false);
  const [completingHr, setCompletingHr] = useState(false);

  // ==================== 4. FINAL COMPREHENSIVE REPORT ====================
  const [finalReport, setFinalReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Refs for media
  const videoRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Popular quick-selection companies
  const popularCompanies = ['TCS', 'Google', 'Microsoft', 'Amazon', 'Infosys', 'Wipro', 'Accenture', 'Cognizant'];
  const popularRoles = ['Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Analyst', 'Java Developer'];

  // Fetch or research company interview process
  const fetchInterviewPlan = async (company, role, forceRefresh = false) => {
    setLoadingPlan(true);
    try {
      const params = new URLSearchParams({
        company: company.trim(),
        role: role.trim()
      });
      if (forceRefresh) params.append('refresh', 'true');
      const res = await API.get(`/interview/plan?${params.toString()}`);
      if (res.data && res.data.data) {
        setInterviewPlan(res.data.data);
      }
    } catch (err) {
      console.warn('Interview plan fetch notice:', err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchInterviewPlan(targetCompany, targetRole, false);
  }, [targetCompany, targetRole]);

  // Load existing history on company change
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await API.get(`/interview/history?company=${encodeURIComponent(targetCompany)}`);
        if (res.data && res.data.data) {
          const { aptitude, technical, hr, finalReport: report } = res.data.data;
          if (aptitude && aptitude.performanceSummary) {
            setAptitudeResult({
              score: aptitude.score,
              totalQuestions: aptitude.questions?.length || 10,
              correctAnswers: Math.round(((aptitude.score || 60) / 100) * (aptitude.questions?.length || 10)),
              accuracy: `${aptitude.score}%`,
              passed: aptitude.passed !== undefined ? aptitude.passed : aptitude.score >= 60,
              strengths: aptitude.performanceSummary.strongAreas || [],
              needsImprovement: aptitude.performanceSummary.needsImprovement || []
            });
          }
          if (technical && technical.performanceSummary) {
            setTechFinalResult({
              averageScore: technical.score,
              technicalAccuracy: technical.performanceSummary.technicalAccuracy || technical.score,
              completeness: technical.performanceSummary.completeness || technical.score,
              communication: technical.performanceSummary.communication || technical.score,
              passed: technical.passed !== undefined ? technical.passed : technical.score >= 60,
              recommendation: technical.score >= 60 ? 'Ready' : 'Needs Improvement',
              strongAreas: technical.performanceSummary.strongAreas || [],
              needsImprovement: technical.performanceSummary.needsImprovement || []
            });
          }
          if (hr && hr.finalReport) {
            setFinalReport(hr.finalReport);
          } else if (report) {
            setFinalReport(report);
          }
        }
      } catch (err) {
        console.warn('Interview history notice:', err.message);
      }
    };
    loadHistory();
  }, [targetCompany]);

  // Aptitude timer countdown
  useEffect(() => {
    let interval = null;
    if (aptitudeSession && !aptitudeResult && aptitudeTimer > 0) {
      interval = setInterval(() => {
        setAptitudeTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [aptitudeSession, aptitudeResult, aptitudeTimer]);

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Play AI Spoken Audio
  const playAiVoice = (audioUrl) => {
    if (!audioUrl || audioMuted) return;
    try {
      audioPlayerRef.current.src = audioUrl;
      setIsAiSpeaking(true);
      audioPlayerRef.current.onended = () => setIsAiSpeaking(false);
      audioPlayerRef.current.onerror = () => setIsAiSpeaking(false);
      audioPlayerRef.current.play().catch(() => setIsAiSpeaking(false));
    } catch (e) {
      setIsAiSpeaking(false);
    }
  };

  // ==================== COMPANY MODAL HANDLERS ====================
  const handleSaveCompanyRole = (e) => {
    e.preventDefault();
    if (tempCompany.trim()) setTargetCompany(tempCompany.trim());
    if (tempRole.trim()) setTargetRole(tempRole.trim());
    setShowCompanyModal(false);
    setAptitudeSession(null);
    setAptitudeResult(null);
    setTechSession(null);
    setTechFinalResult(null);
    setHrSession(null);
    setFinalReport(null);
    setActiveTab('overview');
  };

  // ==================== 1. APTITUDE ACTIONS ====================
  const handleStartAptitude = async () => {
    setAptStarting(true);
    try {
      const res = await API.post('/interview/aptitude/start', {
        company: targetCompany,
        role: targetRole
      });
      if (res.data && res.data.data) {
        setAptitudeSession(res.data.data);
        setAptitudeResult(null);
        setCurrentAptIndex(0);
        setAptitudeAnswers({});
        setAptitudeTimer((res.data.data.durationMinutes || 15) * 60);
      }
    } catch (e) {
      console.error('Start aptitude error:', e);
    } finally {
      setAptStarting(false);
    }
  };

  const handleSelectAptOption = (option) => {
    const currentQ = aptitudeSession?.questions?.[currentAptIndex];
    if (!currentQ) return;
    setAptitudeAnswers(prev => ({
      ...prev,
      [currentQ.questionId || currentQ._id]: option
    }));
  };

  const handleSubmitAptitudeTest = async () => {
    const sId = aptitudeSession?.sessionId || aptitudeSession?._id;
    if (!sId) return;
    setSubmittingApt(true);
    try {
      const res = await API.post('/interview/aptitude/complete', {
        sessionId: sId,
        answers: aptitudeAnswers
      });
      if (res.data && res.data.data) {
        setAptitudeResult(res.data.data);
        setAptitudeSession(null);
      }
    } catch (e) {
      console.error('Submit aptitude error:', e);
    } finally {
      setSubmittingApt(false);
    }
  };

  // ==================== 2. TECHNICAL ACTIONS ====================
  const handleStartTechnical = async () => {
    setTechStarting(true);
    setCurrentTechEval(null);
    setTechFinalResult(null);
    setShowModelAnswer(false);
    try {
      const res = await API.post('/interview/technical/start', {
        company: targetCompany,
        role: targetRole
      });
      if (res.data && res.data.data) {
        setTechSession(res.data.data);
        setTechQuestions(res.data.data.questions || []);
        setCurrentTechIdx(0);
        setTechAnswer('');
      }
    } catch (e) {
      console.error('Start technical error:', e);
    } finally {
      setTechStarting(false);
    }
  };

  const handleEvaluateTechAnswer = async () => {
    const activeQ = techQuestions[currentTechIdx];
    if (!activeQ || !techAnswer.trim()) return;

    setEvaluatingTech(true);
    try {
      const res = await API.post('/interview/technical/evaluate-answer', {
        sessionId: techSession?.sessionId || techSession?._id,
        questionId: activeQ.questionId,
        question: activeQ.questionText,
        answer: techAnswer,
        targetRole,
        company: targetCompany
      });
      if (res.data && res.data.data) {
        setCurrentTechEval(res.data.data);
      }
    } catch (e) {
      console.error('Evaluate technical error:', e);
    } finally {
      setEvaluatingTech(false);
    }
  };

  const handleNextTechQuestion = () => {
    if (currentTechIdx < techQuestions.length - 1) {
      setCurrentTechIdx(prev => prev + 1);
      setTechAnswer('');
      setCurrentTechEval(null);
      setShowModelAnswer(false);
    }
  };

  const handleCompleteTechnicalSession = async () => {
    const sId = techSession?.sessionId || techSession?._id;
    if (!sId) return;
    setCompletingTech(true);
    try {
      const res = await API.post('/interview/technical/complete', {
        sessionId: sId
      });
      if (res.data && res.data.data) {
        setTechFinalResult(res.data.data);
        setTechQuestions([]);
      }
    } catch (e) {
      console.error('Complete technical error:', e);
    } finally {
      setCompletingTech(false);
    }
  };

  // ==================== 3. HR (GEMINI LIVE) ACTIONS ====================
  const handleStartHR = async () => {
    setHrStarting(true);
    try {
      const res = await API.post('/interview/hr/start', {
        company: targetCompany,
        role: targetRole
      });
      if (res.data && res.data.data) {
        setHrSession(res.data.data);
        setLiveToken(res.data.data.liveToken);
        setHrDialogue(res.data.data.transcript || []);
        if (res.data.data.audioUrl) {
          playAiVoice(res.data.data.audioUrl);
        }
      }
    } catch (e) {
      console.error('Start HR error:', e);
    } finally {
      setHrStarting(false);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera access unavailable:', err.message);
      }
    }
  };

  // Audio Recording with MediaRecorder
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(t => t.stop());
        handleSendHrExchange(null, audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access notice:', err);
      // Fallback to browser SpeechRecognition if MediaRecorder has issue
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (e) => {
          const t = Array.from(e.results).map(r => r[0].transcript).join('');
          setHrInput(t);
        };
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      }
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send message to Gemini Live HR Interviewer
  const handleSendHrExchange = async (textOverride = null, audioBlob = null) => {
    const textToSend = textOverride !== null ? textOverride : hrInput;
    if (!textToSend && !audioBlob) return;

    setSendingHrMessage(true);
    setHrInput('');

    try {
      const formData = new FormData();
      formData.append('sessionId', hrSession?.sessionId || hrSession?._id);
      formData.append('company', targetCompany);
      formData.append('role', targetRole);
      formData.append('userMessage', textToSend || '');
      formData.append('history', JSON.stringify(hrDialogue.slice(-6)));
      if (audioBlob) {
        formData.append('audio', audioBlob, 'candidate_voice.wav');
      }

      const res = await API.post('/interview/hr/live-exchange', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.data) {
        const { userText, replyText, audioUrl, isComplete } = res.data.data;
        const newExchange = [
          ...hrDialogue,
          { role: 'user', content: userText || textToSend },
          { role: 'ai', content: replyText, audioUrl }
        ];
        setHrDialogue(newExchange);
        if (audioUrl) {
          playAiVoice(audioUrl);
        }
        if (isComplete) {
          // Auto-trigger complete option
        }
      }
    } catch (e) {
      console.error('HR exchange error:', e);
    } finally {
      setSendingHrMessage(false);
    }
  };

  // Conclude HR Round & Generate Final Comprehensive Report
  const handleCompleteHRAndReport = async () => {
    const sId = hrSession?.sessionId || hrSession?._id;
    if (!sId) return;
    setCompletingHr(true);
    try {
      const res = await API.post('/interview/hr/complete', {
        sessionId: sId,
        company: targetCompany,
        role: targetRole
      });
      if (res.data && res.data.data) {
        setFinalReport(res.data.data.finalReport);
        setActiveTab('report');
      }
    } catch (e) {
      console.error('Complete HR error:', e);
    } finally {
      setCompletingHr(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* =========================================================================
          HERO & TARGET COMPANY / ROLE STATUS
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Interview Simulator</span>
              </span>
              <span className="text-slate-400 text-xs">• Real Company Patterns</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Continue with your target: <span className="text-indigo-400">{targetCompany}</span> — <span className="text-slate-200">{targetRole}</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Simulate the exact researched interview process for {targetCompany}. Every round, aptitude pattern, technical question, and Gemini Live HR dialogue is tailored to this company and role.
            </p>
          </div>

          <button
            onClick={() => {
              setTempCompany(targetCompany);
              setTempRole(targetRole);
              setShowCompanyModal(true);
            }}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0 self-start md:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
            <span>Change Company & Role</span>
          </button>
        </div>

        {/* Researched Flow Visual Bar */}
        {interviewPlan && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">
                {interviewPlan.sourceAttribution || 'Researched from public candidate interview reports'} &bull; Difficulty:{' '}
                <strong className="text-white">{interviewPlan.difficulty || 'Medium'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Flow:</span>
              {(interviewPlan.rounds || []).map((r, i) => (
                <React.Fragment key={i}>
                  <span className="px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 font-semibold">
                    {r.name || r.roundKey}
                  </span>
                  {i < (interviewPlan.rounds?.length || 0) - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          DYNAMIC INTERVIEW ROUND NAVIGATION TABS
          ========================================================================= */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl text-xs font-semibold overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Process Overview</span>
        </button>

        {interviewPlan?.rounds?.some(r => r.roundKey === 'aptitude') && (
          <button
            onClick={() => setActiveTab('aptitude')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'aptitude' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Aptitude Round</span>
            {aptitudeResult && (
              <span className={`w-2 h-2 rounded-full ${aptitudeResult.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('technical')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'technical' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>2. Technical Round</span>
          {techFinalResult && (
            <span className={`w-2 h-2 rounded-full ${techFinalResult.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('hr')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'hr' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-purple-600" />
          <span>3. HR Round (Gemini Live)</span>
          {hrDialogue.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </button>

        {finalReport && (
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'report' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Final Performance Report</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 0: PROCESS OVERVIEW & INTEL BRIEFING
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {targetCompany} Interview Architecture ({targetRole})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Publicly verified hiring rounds, topic distributions, and candidate experiences.
              </p>
            </div>
            <button
              onClick={() => fetchInterviewPlan(targetCompany, targetRole, true)}
              className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Re-scan public sources
            </button>
          </div>

          {loadingPlan ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Sparkles className="w-7 h-7 animate-spin mx-auto text-indigo-500" />
              <p className="font-semibold text-slate-700 text-xs">Researching public interview records for {targetCompany}...</p>
            </div>
          ) : interviewPlan ? (
            <div className="space-y-6">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {interviewPlan.summary}
              </p>

              {/* Rounds Cards */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Reported Interview Stages ({interviewPlan.rounds?.length || 0})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(interviewPlan.rounds || []).map((round, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-xs space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {round.evidenceType || 'Reported by candidates'}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs">{round.name}</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{round.description}</p>
                      </div>

                      {round.reportedTopics && round.reportedTopics.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Topics:</span>
                          <div className="flex flex-wrap gap-1">
                            {round.reportedTopics.map((top, tIdx) => (
                              <span key={tIdx} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
                                {top}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Simulation Banner */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-bold text-slate-900 text-sm">Ready to begin your tailored simulation?</h4>
                  <p className="text-xs text-slate-500">
                    Step through the actual reported stages, receive feedback after each round, and finish with a full performance audit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const hasApt = interviewPlan.rounds?.some(r => r.roundKey === 'aptitude');
                    setActiveTab(hasApt ? 'aptitude' : 'technical');
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 shrink-0 flex items-center gap-2"
                >
                  <span>Start Stage 1 Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Source Transparency */}
              {interviewPlan.sources && interviewPlan.sources.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Public Evidence Sources ({interviewPlan.sources.length})</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    {interviewPlan.sources.slice(0, 4).map((s, sIdx) => (
                      <div key={sIdx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                        <span className="truncate text-slate-600 font-medium">{s.title || 'Public review report'}</span>
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline shrink-0 font-bold">
                            View ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Unable to load interview architecture. Please try refreshing.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 1: APTITUDE ASSESSMENT ROUND
          ========================================================================= */}
      {activeTab === 'aptitude' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {!aptitudeSession && !aptitudeResult ? (
            <div className="text-center py-12 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {targetCompany} Aptitude Round (10 Questions • 15 Minutes)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tailored to {targetCompany}'s reported assessment style. Evaluates Quantitative Aptitude, Logical Reasoning, and Verbal Ability under timed conditions.
              </p>
              <button 
                id="start-aptitude-btn"
                disabled={aptStarting}
                onClick={handleStartAptitude} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {aptStarting ? <Sparkles className="w-4 h-4 animate-spin" /> : null}
                <span>{aptStarting ? 'Preparing Assessment...' : `Start ${targetCompany} Aptitude Test →`}</span>
              </button>
            </div>
          ) : aptitudeResult ? (
            <div className="space-y-6 max-w-2xl mx-auto py-4 text-center">
              <div className="flex justify-center">
                <ScoreGauge value={aptitudeResult.score} size={130} color={aptitudeResult.passed ? "#10B981" : "#F43F5E"} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {aptitudeResult.passed ? `🎉 Aptitude Cleared for ${targetCompany}!` : 'Aptitude Assessment Completed'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Correct: <strong className="text-slate-800">{aptitudeResult.correctAnswers} / {aptitudeResult.totalQuestions}</strong> • Accuracy: <strong className="text-slate-800">{aptitudeResult.accuracy}</strong>
                </p>
              </div>

              {/* Strengths & Improvement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-emerald-900 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Strengths:</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-emerald-800">
                    {aptitudeResult.strengths?.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Needs Improvement:</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-amber-800">
                    {aptitudeResult.needsImprovement?.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={handleStartAptitude} 
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Aptitude</span>
                </button>
                <button 
                  onClick={() => setActiveTab('technical')} 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  <span>Proceed to Technical Round</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE APTITUDE TEST */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                    Question {currentAptIndex + 1} of {aptitudeSession?.questions?.length || 10}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {aptitudeSession?.questions?.[currentAptIndex]?.category}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTimer(aptitudeTimer)}</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 leading-relaxed">
                {aptitudeSession?.questions?.[currentAptIndex]?.questionText}
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {(aptitudeSession?.questions?.[currentAptIndex]?.options || []).map((opt, oIdx) => {
                  const currentQ = aptitudeSession?.questions?.[currentAptIndex];
                  const qKey = currentQ?.questionId || currentQ?._id;
                  const isSelected = aptitudeAnswers[qKey] === opt;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAptOption(opt)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs font-medium transition flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Next / Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Answered {Object.keys(aptitudeAnswers).length} / {aptitudeSession?.questions?.length || 10}
                </span>

                {currentAptIndex < (aptitudeSession?.questions?.length || 10) - 1 ? (
                  <button
                    onClick={() => setCurrentAptIndex(prev => prev + 1)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    disabled={submittingApt}
                    onClick={handleSubmitAptitudeTest}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    {submittingApt ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Submit & Evaluate Assessment</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: TECHNICAL ROUND (COMPANY + ROLE SPECIFIC)
          ========================================================================= */}
      {activeTab === 'technical' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {!techSession && !techFinalResult ? (
            <div className="text-center py-12 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Code2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {targetCompany} Technical Interview (5 Questions)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Specific to {targetCompany}'s reported technical expectations for {targetRole}. Evaluates programming fundamentals, architecture, databases, and problem solving.
              </p>
              <button 
                id="start-technical-btn"
                disabled={techStarting}
                onClick={handleStartTechnical} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {techStarting ? <Sparkles className="w-4 h-4 animate-spin" /> : null}
                <span>{techStarting ? 'Generating Questions...' : `Start ${targetCompany} Technical Interview →`}</span>
              </button>
            </div>
          ) : techFinalResult ? (
            <div className="space-y-6 max-w-2xl mx-auto py-4 text-center">
              <div className="flex justify-center">
                <ScoreGauge value={techFinalResult.averageScore} size={130} color={techFinalResult.passed ? "#10B981" : "#F43F5E"} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {techFinalResult.passed ? `🎉 Technical Round Cleared for ${targetCompany}!` : 'Technical Round Completed'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Accuracy: <strong className="text-slate-800">{techFinalResult.technicalAccuracy}%</strong> &bull; Completeness: <strong className="text-slate-800">{techFinalResult.completeness}%</strong> &bull; Recommendation:{' '}
                  <span className={`font-bold ${techFinalResult.passed ? 'text-emerald-700' : 'text-amber-700'}`}>{techFinalResult.recommendation}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-emerald-900 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Strong Technical Areas:</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-emerald-800">
                    {techFinalResult.strongAreas?.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Topics to Revise:</span>
                  </h4>
                  <ul className="space-y-1 text-[11px] text-amber-800">
                    {techFinalResult.needsImprovement?.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={handleStartTechnical} 
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Practice Technical Again</span>
                </button>
                <button 
                  onClick={() => setActiveTab('hr')} 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  <span>Proceed to HR Round (Gemini Live)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE TECHNICAL QUESTION */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                  Question {currentTechIdx + 1} of {techQuestions.length}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Topic: {techQuestions[currentTechIdx]?.topic}
                </span>
              </div>

              {/* Question card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 leading-relaxed">
                {techQuestions[currentTechIdx]?.questionText}
              </div>

              {/* Candidate Answer Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Your Technical Response:</label>
                  <span className="text-[11px] text-slate-400">Explain your reasoning clearly with examples</span>
                </div>
                <textarea
                  rows={5}
                  value={techAnswer}
                  onChange={(e) => setTechAnswer(e.target.value)}
                  placeholder="Type your technical explanation or solution here..."
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Submit answer */}
              {!currentTechEval ? (
                <button
                  disabled={evaluatingTech || !techAnswer.trim()}
                  onClick={handleEvaluateTechAnswer}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {evaluatingTech ? <Sparkles className="w-4 h-4 animate-spin" /> : null}
                  <span>{evaluatingTech ? 'Analyzing Answer with AI...' : 'Submit Answer for Objective Feedback'}</span>
                </button>
              ) : (
                /* Real Evaluation Feedback */
                <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Answer Score: <strong>{currentTechEval.score}/100</strong></span>
                    </span>
                    <button
                      onClick={() => setShowModelAnswer(!showModelAnswer)}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{showModelAnswer ? 'Hide Ideal Solution' : 'View Ideal Solution'}</span>
                    </button>
                  </div>

                  <p className="text-slate-600 leading-relaxed">{currentTechEval.feedback}</p>

                  {showModelAnswer && currentTechEval.betterAnswer && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1">
                      <span className="font-bold text-indigo-900 text-[11px] block">Recommended Technical Solution:</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{currentTechEval.betterAnswer}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-end">
                    {currentTechIdx < techQuestions.length - 1 ? (
                      <button
                        onClick={handleNextTechQuestion}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>Next Technical Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        disabled={completingTech}
                        onClick={handleCompleteTechnicalSession}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        {completingTech ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>Finalize Technical Round</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: HR ROUND USING GEMINI LIVE (REAL-TIME AI INTERVIEWER)
          ========================================================================= */}
      {activeTab === 'hr' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {!hrSession ? (
            <div className="text-center py-12 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {targetCompany} HR & Behavioral Round (Gemini Live)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect with our real-time AI interviewer powered by Gemini Live. Turn on your microphone, speak naturally, hear spoken responses, and answer tailored HR questions for {targetCompany}.
              </p>
              <button 
                id="start-hr-btn"
                disabled={hrStarting}
                onClick={handleStartHR} 
                className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {hrStarting ? <Sparkles className="w-4 h-4 animate-spin" /> : null}
                <span>{hrStarting ? 'Establishing Gemini Live...' : `Enter ${targetCompany} HR Interview Room →`}</span>
              </button>
            </div>
          ) : (
            /* ACTIVE REAL-TIME GEMINI LIVE SESSION */
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Studio Header & Media Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs tracking-tight">{targetCompany} HR Interviewer</h4>
                    <span className="text-[10px] text-purple-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Gemini Live Session Active &bull; Role: {targetRole}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Camera Toggle */}
                  <button
                    onClick={toggleCamera}
                    className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      cameraActive ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-300'
                    }`}
                    title={cameraActive ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {cameraActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{cameraActive ? 'Camera On' : 'Camera Off'}</span>
                  </button>

                  {/* Audio Mute Toggle */}
                  <button
                    onClick={() => setAudioMuted(!audioMuted)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 transition"
                    title={audioMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                  >
                    {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {/* End & Complete */}
                  <button
                    disabled={completingHr}
                    onClick={handleCompleteHRAndReport}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    {completingHr ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Finish Interview</span>
                  </button>
                </div>
              </div>

              {/* Video PIP if camera active */}
              {cameraActive && (
                <div className="relative w-48 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-lg bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <span className="absolute bottom-1 left-2 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded font-medium">
                    You (Live)
                  </span>
                </div>
              )}

              {/* Real-time AI Status Indicator */}
              <div className="text-center">
                {isAiSpeaking ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold animate-pulse">
                    <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Interviewer is speaking...</span>
                  </div>
                ) : isRecording ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-rose-600" />
                    <span>Listening to your answer... Click microphone to finish</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                    <span>Press microphone to speak or type your answer below</span>
                  </div>
                )}
              </div>

              {/* Dialogue Transcript Bubble Stream */}
              <div className="space-y-3.5 max-h-96 overflow-y-auto p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
                {hrDialogue.map((msg, mIdx) => {
                  const isAi = msg.role === 'ai';
                  return (
                    <div
                      key={mIdx}
                      className={`flex gap-3 text-xs ${isAi ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAi && (
                        <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`p-3.5 rounded-2xl max-w-lg leading-relaxed shadow-xs ${
                          isAi 
                            ? 'bg-white text-slate-800 border border-slate-200' 
                            : 'bg-indigo-600 text-white rounded-br-xs'
                        }`}
                      >
                        <p>{msg.content}</p>
                        {isAi && msg.audioUrl && (
                          <button
                            onClick={() => playAiVoice(msg.audioUrl)}
                            className="mt-2 text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Replay Voice</span>
                          </button>
                        )}
                      </div>
                      {!isAi && (
                        <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Input Controls (Voice & Text) */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={isRecording ? stopRecordingAudio : startRecordingAudio}
                  className={`p-3.5 rounded-2xl transition flex items-center justify-center shrink-0 shadow-xs ${
                    isRecording 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                  title={isRecording ? 'Stop speaking and send' : 'Speak via microphone'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={hrInput}
                  onChange={(e) => setHrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !sendingHrMessage) {
                      handleSendHrExchange();
                    }
                  }}
                  placeholder="Speak or type your answer..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs"
                />

                <button
                  disabled={sendingHrMessage || !hrInput.trim()}
                  onClick={() => handleSendHrExchange()}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingHrMessage ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: FINAL INTERVIEW REPORT & COMPANY RECOMMENDATIONS
          ========================================================================= */}
      {activeTab === 'report' && finalReport && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 font-sans">
          {/* Header */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
              {targetCompany} Simulation Completed
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Interview Performance Report</h3>
            <p className="text-xs text-slate-500">
              Evaluated specifically for <strong className="text-slate-800">{targetRole}</strong> at <strong className="text-indigo-600">{targetCompany}</strong>.
            </p>
          </div>

          {/* Scores Overview Grid */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white p-6 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row items-center gap-8">
            <div className="text-center shrink-0">
              <ScoreGauge value={finalReport.overallScore || 78} size={140} strokeWidth={11} color="#4F46E5" />
              <p className="font-black text-slate-900 text-sm mt-2">Overall Score: {finalReport.overallScore}/100</p>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-1 ${
                finalReport.readinessRating === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {finalReport.readinessRating || 'Ready'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full text-xs">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] block font-semibold">Communication</span>
                <span className="text-lg font-black text-slate-800">{finalReport.communicationScore || 80}/100</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] block font-semibold">Confidence & Delivery</span>
                <span className="text-lg font-black text-slate-800">{finalReport.confidenceScore || 75}/100</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] block font-semibold">Answer Quality</span>
                <span className="text-lg font-black text-slate-800">{finalReport.answerQualityScore || 78}/100</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] block font-semibold">Role Understanding</span>
                <span className="text-lg font-black text-slate-800">{finalReport.roleUnderstandingScore || 82}/100</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] block font-semibold">HR Readiness</span>
                <span className="text-lg font-black text-slate-800">{finalReport.hrReadinessScore || 76}/100</span>
              </div>
            </div>
          </div>

          {/* What You Did Well & What You Should Improve */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Strengths */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 space-y-3">
              <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>What You Did Well</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-emerald-900">
                {(finalReport.whatYouDidWell || []).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-3">
              <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>What You Should Improve</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-amber-900">
                {(finalReport.whatYouShouldImprove || []).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Better Answer Approach (STAR Method Breakdown) */}
          {finalReport.betterAnswerApproach && finalReport.betterAnswerApproach.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Better Answer Approach (Constructive Breakdown)</span>
              </h4>
              <div className="space-y-3">
                {finalReport.betterAnswerApproach.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
                    <div className="font-bold text-slate-900 text-xs">
                      Question: "{item.question}"
                    </div>
                    {item.candidateSpoken && (
                      <p className="text-[11px] text-slate-500 italic">
                        Your answer: "{item.candidateSpoken}"
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div className="p-3 bg-white rounded-xl border border-rose-200">
                        <span className="font-bold text-rose-800 block">What was missing:</span>
                        <p className="text-slate-600 mt-0.5">{item.whatWasMissing}</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-indigo-200">
                        <span className="font-bold text-indigo-800 block">How to structure:</span>
                        <p className="text-slate-600 mt-0.5">{item.howToStructure}</p>
                      </div>
                    </div>
                    {item.strongerExample && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] space-y-1">
                        <span className="font-bold text-emerald-900 block">Example of a Stronger Answer:</span>
                        <p className="text-emerald-950 leading-relaxed italic">"{item.strongerExample}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company-Specific Preparation Recommendations */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2 text-xs">
            <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>{targetCompany} Preparation Recommendations</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-indigo-950">
              {(finalReport.companyRecommendations || []).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                setTempCompany(targetCompany);
                setTempRole(targetRole);
                setShowCompanyModal(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Switch Company or Role</span>
            </button>
            <button
              onClick={() => {
                const hasApt = interviewPlan?.rounds?.some(r => r.roundKey === 'aptitude');
                setActiveTab(hasApt ? 'aptitude' : 'technical');
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <span>Practice Again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHANGE COMPANY & ROLE MODAL
          ========================================================================= */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Change Target Company & Role</h3>
              </div>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompanyRole} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Target Company:</label>
                <input
                  type="text"
                  value={tempCompany}
                  onChange={(e) => setTempCompany(e.target.value)}
                  placeholder="e.g. TCS, Google, Infosys, Microsoft..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {popularCompanies.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setTempCompany(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        tempCompany.toLowerCase() === c.toLowerCase()
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Target Job Role:</label>
                <input
                  type="text"
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value)}
                  placeholder="e.g. Software Developer, Frontend Developer, Java Developer..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {popularRoles.map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setTempRole(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        tempRole.toLowerCase() === r.toLowerCase()
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Update & Resimulate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
