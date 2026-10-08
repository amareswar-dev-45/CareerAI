import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TrendingUp, 
  Building2, 
  ExternalLink, 
  ShieldCheck, 
  Send, 
  User, 
  Compass, 
  History, 
  ChevronRight, 
  Eye, 
  Edit3, 
  Play, 
  Target, 
  Flame, 
  Zap, 
  HelpCircle,
  Lightbulb,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import ScoreGauge from '../components/common/ScoreGauge';
import AIInterviewVideoStage from '../components/interview/AIInterviewVideoStage';
import { useCareer } from '../context/CareerContext';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

export default function InterviewCenterPage() {
  const navigate = useNavigate();
  const { profile } = useCareer();
  const { user } = useAuth();

  // Company and Target Role Configuration
  const defaultCompany = profile?.dreamCompany || user?.dreamCompany || 'TCS';
  const defaultRole = profile?.targetRole || user?.targetRole || 'Data Analyst';

  const [targetCompany, setTargetCompany] = useState(defaultCompany);
  const [targetRole, setTargetRole] = useState(defaultRole);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [tempCompany, setTempCompany] = useState(defaultCompany);
  const [tempRole, setTempRole] = useState(defaultRole);

  // Researched Company Interview Plan
  const [interviewPlan, setInterviewPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Active View / Tab: 'live' | 'overview' | 'history' | 'report' | 'practice'
  const [activeTab, setActiveTab] = useState('live');

  // =========================================================================
  // 1. UNIFIED PRODUCTION LIVE INTERVIEW STATE MACHINE
  // States: 'INITIALIZING' | 'READY' | 'AI_SPEAKING' | 'LISTENING' |
  //         'USER_SPEAKING' | 'PROCESSING_ANSWER' | 'GENERATING_FEEDBACK' |
  //         'ROUND_COMPLETED' | 'INTERVIEW_COMPLETED' | 'ERROR'
  // =========================================================================
  const [interviewState, setInterviewState] = useState('READY');
  const [liveSession, setLiveSession] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestionsInRound, setTotalQuestionsInRound] = useState(5);
  const [userSpokenAnswer, setUserSpokenAnswer] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [roundCompletedData, setRoundCompletedData] = useState(null);
  const [interviewTimer, setInterviewTimer] = useState(0);

  // Audio / Media settings
  const [audioMuted, setAudioMuted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // =========================================================================
  // 2. INTERVIEW HISTORY & ANALYTICS STATE
  // =========================================================================
  const [historyList, setHistoryList] = useState([]);
  const [historyAnalytics, setHistoryAnalytics] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState(null);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);

  // =========================================================================
  // 3. AI COACH REMEDIATION ("Practice Weak Areas")
  // =========================================================================
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [currentPracticeIdx, setCurrentPracticeIdx] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceEvaluation, setPracticeEvaluation] = useState(null);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [evaluatingPractice, setEvaluatingPractice] = useState(false);

  // =========================================================================
  // 4. PERSISTENT REFS (Stable Camera Lifecycle & Hands-Free Speech Engine)
  // =========================================================================
  const cameraStreamRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isAiSpeakingRef = useRef(false);
  const currentAnswerRef = useRef('');
  const interviewTimerRef = useRef(null);

  // Popular quick-selection companies & roles
  const popularCompanies = ['TCS', 'Infosys', 'Wipro', 'Google', 'Microsoft', 'Amazon', 'Accenture', 'Cognizant'];
  const popularRoles = ['Data Analyst', 'MERN Stack Developer', 'Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer'];

  // Keep ref synchronized with state
  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  useEffect(() => {
    currentAnswerRef.current = userSpokenAnswer;
  }, [userSpokenAnswer]);

  // Session elapsed timer
  useEffect(() => {
    if (liveSession && interviewState !== 'INTERVIEW_COMPLETED') {
      interviewTimerRef.current = setInterval(() => {
        setInterviewTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    }
    return () => {
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    };
  }, [liveSession, interviewState]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // =========================================================================
  // CAMERA LIFECYCLE MANAGEMENT (Permanent White Screen Bug Fix)
  // MediaStream is decoupled from state renders and never destroyed on question/round change.
  // =========================================================================
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      // Reuse existing active stream if already active
      if (cameraStreamRef.current && cameraStreamRef.current.active) {
        setCameraActive(true);
        setCameraStream(cameraStreamRef.current);
        return cameraStreamRef.current;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraActive(true);
      return stream;
    } catch (err) {
      console.warn('[Camera] getUserMedia notice:', err.message);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission was denied in your browser settings.'
        : 'Webcam device unavailable or disconnected.');
      setCameraActive(false);
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
  }, []);

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Only stop tracks when unmounting the whole interview page
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

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

  // Fetch completed interview history & analytics
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get('/interview/history');
      if (res.data && res.data.data) {
        setHistoryList(res.data.data.sessions || []);
        setHistoryAnalytics(res.data.data.analytics || null);
      }
    } catch (err) {
      console.warn('History fetch notice:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviewPlan(targetCompany, targetRole, false);
    fetchHistory();
  }, [targetCompany, targetRole, fetchHistory]);

  // =========================================================================
  // HANDS-FREE TWO-WAY VOICE ENGINE & SILENCE DETECTION
  // =========================================================================
  // Play spoken AI audio (TTS) or Browser SpeechSynthesis
  const speakAiMessage = useCallback((text, audioUrl, onComplete) => {
    if (!text && !audioUrl) {
      if (onComplete) onComplete();
      return;
    }

    // Stop listening while AI speaks to prevent echo
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    setInterviewState('AI_SPEAKING');

    const handleFinishedSpeaking = () => {
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      if (onComplete) onComplete();
    };

    // If pre-synthesized audio URL provided
    if (audioUrl && !audioMuted) {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.onended = handleFinishedSpeaking;
      audioPlayerRef.current.onerror = () => {
        // Fallback to browser SpeechSynthesis
        fallbackBrowserTTS(text, handleFinishedSpeaking);
      };
      audioPlayerRef.current.play().catch(() => {
        fallbackBrowserTTS(text, handleFinishedSpeaking);
      });
    } else {
      fallbackBrowserTTS(text, handleFinishedSpeaking);
    }
  }, [audioMuted]);

  // Browser SpeechSynthesis fallback
  const fallbackBrowserTTS = (text, onFinish) => {
    if (!('speechSynthesis' in window) || audioMuted) {
      setTimeout(onFinish, 1200);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = (text || '').replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = onFinish;
    utterance.onerror = onFinish;
    window.speechSynthesis.speak(utterance);
  };

  // Start listening through microphone with automatic silence detection
  const startListeningAutomatically = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInterviewState('LISTENING');
      setIsListening(true);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setInterviewState('LISTENING');
    };

    recognition.onresult = (event) => {
      // Do not accept input if AI is still speaking
      if (isAiSpeakingRef.current) return;

      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setUserSpokenAnswer(transcript);
      currentAnswerRef.current = transcript;
      setInterviewState('USER_SPEAKING');

      // VAD / SILENCE DETECTION:
      // If user pauses for 2.4 seconds after speaking at least 8 chars, submit automatically!
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (transcript.trim().length >= 8) {
        silenceTimerRef.current = setTimeout(() => {
          console.log('[Voice Engine] Silence detected after answer. Auto-submitting...');
          try { recognition.stop(); } catch (e) {}
          setIsListening(false);
          handleAutoSubmitAnswer(transcript.trim());
        }, 2400);
      }
    };

    recognition.onerror = (err) => {
      console.warn('[Voice Engine] Speech recognition notice:', err.error);
    };

    recognition.onend = () => {
      // If still in LISTENING/USER_SPEAKING state and not AI_SPEAKING, restart recognition
      if (!isAiSpeakingRef.current && (interviewState === 'LISTENING' || interviewState === 'USER_SPEAKING')) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[Voice Engine] Start notice:', e.message);
    }
  }, [interviewState]);

  // =========================================================================
  // MASTER INTERVIEW CONTROLLER: START, EVALUATE, NEXT QUESTION, NEXT ROUND
  // =========================================================================

  // 1. START OR RETAKE LIVE INTERVIEW
  const handleStartLiveInterview = async (isRetake = false, previousSessionId = null) => {
    setInterviewState('INITIALIZING');
    setLastEvaluation(null);
    setRoundCompletedData(null);
    setUserSpokenAnswer('');
    setInterviewTimer(0);

    // Keep camera stream active or turn on
    await startCamera();

    try {
      const res = await API.post('/interview/session/start', {
        company: targetCompany,
        role: targetRole,
        isRetake,
        previousSessionId
      });

      if (res.data && res.data.data) {
        const { sessionId, rounds, currentRound: firstRound, currentQuestion: q1 } = res.data.data;
        setLiveSession({ sessionId, rounds });
        setCurrentRound(firstRound);
        setCurrentQuestion(q1);
        setQuestionNumber(1);
        setTotalQuestionsInRound(firstRound?.questionCount || 5);
        setActiveTab('live');

        // AI Speaks the first question aloud, then automatically starts listening!
        speakAiMessage(q1.questionText, q1.audioUrl, () => {
          startListeningAutomatically();
        });
      }
    } catch (err) {
      console.error('Start interview error:', err);
      setInterviewState('ERROR');
    }
  };

  // 2. AUTO-SUBMIT ANSWER & EVALUATE WITH COACHING
  const handleAutoSubmitAnswer = async (overrideAnswer = null) => {
    const answerToEvaluate = (overrideAnswer !== null ? overrideAnswer : currentAnswerRef.current).trim();
    if (!answerToEvaluate || !currentQuestion || !liveSession) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setInterviewState('PROCESSING_ANSWER');

    try {
      const res = await API.post('/interview/session/evaluate-answer', {
        sessionId: liveSession.sessionId,
        questionId: currentQuestion.questionId,
        roundKey: currentRound?.roundKey || 'technical',
        question: currentQuestion.questionText,
        answer: answerToEvaluate
      });

      if (res.data && res.data.data) {
        const evaluation = res.data.data;
        setLastEvaluation(evaluation);
        setInterviewState('GENERATING_FEEDBACK');

        // Spoken coaching feedback + follow-up
        const spokenCoachText = `${evaluation.spokenFeedback || ''} ${evaluation.followUpQuestion ? evaluation.followUpQuestion : ''}`.trim();

        speakAiMessage(spokenCoachText, evaluation.audioUrl, () => {
          // Check if this was a follow-up or if we should fetch next question
          handleAdvanceToNextQuestion();
        });
      }
    } catch (err) {
      console.error('Evaluate answer error:', err);
      handleAdvanceToNextQuestion();
    }
  };

  // Manual fallback button to finish answer immediately
  const handleManualFinishAnswer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    handleAutoSubmitAnswer();
  };

  // 3. ADVANCE TO NEXT QUESTION OR COMPLETE ROUND
  const handleAdvanceToNextQuestion = async () => {
    if (!liveSession || !currentRound) return;

    setUserSpokenAnswer('');
    currentAnswerRef.current = '';

    // Check if round finished
    if (questionNumber >= totalQuestionsInRound) {
      handleCompleteCurrentRound();
      return;
    }

    setInterviewState('PROCESSING_ANSWER');

    try {
      const res = await API.post('/interview/session/next-question', {
        sessionId: liveSession.sessionId,
        roundKey: currentRound.roundKey,
        previousAnswer: userSpokenAnswer
      });

      if (res.data && res.data.data) {
        const { isRoundFinished, question: nextQ, questionIndex } = res.data.data;

        if (isRoundFinished) {
          handleCompleteCurrentRound();
        } else {
          setCurrentQuestion(nextQ);
          setQuestionNumber(questionIndex || (questionNumber + 1));
          setLastEvaluation(null);

          // AI speaks next question and then starts listening
          speakAiMessage(nextQ.questionText, nextQ.audioUrl, () => {
            startListeningAutomatically();
          });
        }
      }
    } catch (err) {
      console.error('Next question error:', err);
      handleCompleteCurrentRound();
    }
  };

  // 4. COMPLETE CURRENT ROUND
  const handleCompleteCurrentRound = async () => {
    if (!liveSession || !currentRound) return;
    setInterviewState('PROCESSING_ANSWER');

    try {
      const res = await API.post('/interview/session/complete-round', {
        sessionId: liveSession.sessionId,
        roundKey: currentRound.roundKey
      });

      if (res.data && res.data.data) {
        const data = res.data.data;
        setRoundCompletedData(data);
        setInterviewState('ROUND_COMPLETED');

        // Announce completion naturally via TTS
        const announcement = `${currentRound.name} completed with a score of ${data.roundScore} percent. ${data.roundFeedback}`;
        speakAiMessage(announcement, null, () => {});
      }
    } catch (err) {
      console.error('Complete round error:', err);
      handleFinishEntireInterview();
    }
  };

  // 5. PROCEED TO NEXT ROUND WITHOUT PAGE RELOAD OR CAMERA DESTRUCTION
  const handleProceedToNextRound = async () => {
    if (!roundCompletedData?.nextRound) {
      handleFinishEntireInterview();
      return;
    }

    const nextRound = roundCompletedData.nextRound;
    setCurrentRound(nextRound);
    setRoundCompletedData(null);
    setLastEvaluation(null);
    setUserSpokenAnswer('');
    setQuestionNumber(1);
    setTotalQuestionsInRound(nextRound.questionCount || 5);
    setInterviewState('INITIALIZING');

    // Camera stream remains active! No reset.
    try {
      const res = await API.post('/interview/session/next-question', {
        sessionId: liveSession.sessionId,
        roundKey: nextRound.roundKey,
        previousAnswer: ''
      });

      if (res.data && res.data.data) {
        const nextQ = res.data.data.question;
        setCurrentQuestion(nextQ);
        setQuestionNumber(1);

        // AI speaks first question of new round
        speakAiMessage(nextQ.questionText, nextQ.audioUrl, () => {
          startListeningAutomatically();
        });
      }
    } catch (e) {
      console.error('Start next round error:', e);
    }
  };

  // 6. FINISH ENTIRE INTERVIEW & GENERATE FINAL REPORT
  const handleFinishEntireInterview = async () => {
    if (!liveSession) return;
    setInterviewState('PROCESSING_ANSWER');

    try {
      const res = await API.post('/interview/session/complete-interview', {
        sessionId: liveSession.sessionId
      });

      if (res.data && res.data.data) {
        const { finalReport, session } = res.data.data;
        setSelectedReportSession(session);
        setInterviewState('INTERVIEW_COMPLETED');
        setActiveTab('report');
        fetchHistory(); // Refresh history cards
      }
    } catch (err) {
      console.error('Complete interview error:', err);
    }
  };

  // 7. VIEW SPECIFIC HISTORICAL REPORT
  const handleOpenReportModal = async (sessionId) => {
    setLoadingReportDetails(true);
    setActiveTab('report');
    try {
      const res = await API.get(`/interview/history/${sessionId}`);
      if (res.data && res.data.data) {
        setSelectedReportSession(res.data.data.session);
      }
    } catch (err) {
      console.error('Fetch report details error:', err);
    } finally {
      setLoadingReportDetails(false);
    }
  };

  // 8. PRACTICE WEAK AREAS (AI Coach Mode)
  const handleOpenPracticeMode = async (sessionId = null) => {
    setLoadingPractice(true);
    setActiveTab('practice');
    setPracticeEvaluation(null);
    setPracticeAnswer('');
    setCurrentPracticeIdx(0);

    try {
      const res = await API.post('/interview/practice-weak-areas', {
        sessionId: sessionId || liveSession?.sessionId || selectedReportSession?._id,
        role: targetRole,
        company: targetCompany
      });

      if (res.data && res.data.data) {
        setPracticeQuestions(res.data.data.questions || []);
      }
    } catch (err) {
      console.error('Practice weak areas error:', err);
    } finally {
      setLoadingPractice(false);
    }
  };

  // Evaluate Practice Answer
  const handleEvaluatePracticeAnswer = async () => {
    const q = practiceQuestions[currentPracticeIdx];
    if (!q || !practiceAnswer.trim()) return;

    setEvaluatingPractice(true);
    try {
      const res = await API.post('/interview/evaluate-practice-answer', {
        question: q.questionText,
        answer: practiceAnswer,
        topic: q.topic,
        targetRole,
        company: targetCompany
      });

      if (res.data && res.data.data) {
        setPracticeEvaluation(res.data.data);
      }
    } catch (err) {
      console.error('Evaluate practice answer error:', err);
    } finally {
      setEvaluatingPractice(false);
    }
  };

  // Save new target company and role
  const handleSaveCompanyRole = (e) => {
    e.preventDefault();
    if (tempCompany.trim()) setTargetCompany(tempCompany.trim());
    if (tempRole.trim()) setTargetRole(tempRole.trim());
    setShowCompanyModal(false);
    setLiveSession(null);
    setCurrentRound(null);
    setCurrentQuestion(null);
    setRoundCompletedData(null);
    setInterviewState('READY');
    setActiveTab('live');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* =========================================================================
          HERO STATUS BAR & TARGET COMPANY / ROLE SELECTOR
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>Production AI Mock Interview Engine</span>
              </span>
              <span className="text-slate-400 text-xs">• Company & Role Tailored</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Target Interview: <span className="text-indigo-400">{targetCompany}</span> — <span className="text-slate-200">{targetRole}</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Experience authentic, company-specific hiring rounds. Hands-free conversational voice, real-time coaching feedback, and performance learning.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => {
                setTempCompany(targetCompany);
                setTempRole(targetRole);
                setShowCompanyModal(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
              <span>Change Target</span>
            </button>
            <button
              onClick={() => handleStartLiveInterview(false)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Live Interview</span>
            </button>
          </div>
        </div>

        {/* Researched Flow Visual Bar */}
        {interviewPlan && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">
                {interviewPlan.sourceAttribution || 'Researched from verified candidate interview reports'} &bull; Difficulty:{' '}
                <strong className="text-white">{interviewPlan.difficulty || 'Medium'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Rounds:</span>
              {(interviewPlan.rounds || []).map((r, i) => (
                <React.Fragment key={i}>
                  <span className={`px-2.5 py-0.5 rounded-lg font-semibold ${
                    currentRound?.roundKey === r.roundKey 
                      ? 'bg-indigo-500 text-white shadow-xs' 
                      : 'bg-white/10 text-slate-200'
                  }`}>
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
          TOP NAVIGATION TABS
          ========================================================================= */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl text-xs font-semibold overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'live' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-600" />
          <span>Live Interview Room</span>
          {interviewState !== 'READY' && interviewState !== 'INTERVIEW_COMPLETED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Process Architecture</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            fetchHistory();
          }}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-indigo-600" />
          <span>Interview History ({historyList.length})</span>
        </button>

        {(selectedReportSession || liveSession) && (
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'report' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interview Report</span>
          </button>
        )}

        <button
          onClick={() => handleOpenPracticeMode()}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'practice' ? 'bg-white text-purple-800 shadow-sm font-bold' : 'text-purple-700 hover:text-purple-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-purple-600" />
          <span>AI Coach Practice</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LIVE INTERVIEW ROOM (HANDS-FREE REAL-TIME ENGINE)
          ========================================================================= */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Main Dual-Screen Video Stage */}
          <AIInterviewVideoStage
            company={targetCompany}
            role={targetRole}
            roundTitle={currentRound ? currentRound.name : `${targetCompany} Simulation`}
            interviewerRole={currentRound?.roundKey === 'hr' ? `${targetCompany} HR & People Operations` : `${targetCompany} Senior Technical Lead`}
            roundKey={currentRound?.roundKey || 'technical'}
            isAiSpeaking={isAiSpeaking}
            cameraActive={cameraActive}
            cameraError={cameraError}
            stream={cameraStream}
            onToggleCamera={toggleCamera}
            candidateName={user?.name || profile?.name || 'Candidate'}
          />

          {/* INTERVIEW STAGE CARD & CONVERSATION PANEL */}
          {!liveSession ? (
            /* Ready to Start Card */
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Ready for your {targetCompany} {targetRole} Interview?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The AI interviewer will ask questions aloud and automatically listen when you speak. No need to click Send every time.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">
                  Configured Hiring Flow for {targetCompany}:
                </span>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  {(interviewPlan?.rounds || []).map((r, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <strong className="text-slate-800">{r.name}</strong>
                      <span className="text-slate-400">({r.durationMinutes} mins • {r.questionCount} questions)</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleStartLiveInterview(false)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Begin Live AI Interview Simulation</span>
              </button>
            </div>
          ) : roundCompletedData ? (
            /* Round Transition Screen */
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6 max-w-xl mx-auto animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  {currentRound?.name} Completed!
                </h3>
                <p className="text-xs text-slate-500">
                  Round Score: <strong className="text-slate-800">{roundCompletedData.roundScore}/100</strong>
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                "{roundCompletedData.roundFeedback}"
              </div>

              <div className="pt-2">
                {roundCompletedData.nextRound ? (
                  <button
                    onClick={handleProceedToNextRound}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    <span>Proceed to Next Round: {roundCompletedData.nextRound.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinishEntireInterview}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>View Complete Interview Performance Report</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ACTIVE QUESTION & VOICE CONVERSATION INTERACTION PANEL */
            <div className="bg-white p-5 md:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-xs">
                    Question {questionNumber} of {totalQuestionsInRound}
                  </span>
                  <span className="font-semibold text-slate-500 text-[11px]">
                    Round: <strong className="text-slate-800">{currentRound?.name}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Elapsed: {formatTimer(interviewTimer)}</span>
                  </span>
                  <button
                    onClick={() => setAudioMuted(!audioMuted)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                    title={audioMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
                  >
                    {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* Spoken Question Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Interviewer Question:</span>
                  </span>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                    Topic: {currentQuestion?.topic || 'Core Fundamentals'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 leading-relaxed">
                  {currentQuestion?.questionText}
                </h4>
              </div>

              {/* Conversational Live Status Bar */}
              <div className="text-center py-1">
                {isAiSpeaking ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold animate-pulse">
                    <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Interviewer is speaking the question...</span>
                  </div>
                ) : isListening ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-rose-600" />
                    <span>Listening automatically... Speak naturally (auto-submits when you pause)</span>
                  </div>
                ) : interviewState === 'PROCESSING_ANSWER' ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>AI Interviewer is evaluating your response...</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-medium">
                    <span>Microphone ready. Speak aloud or refine your answer below.</span>
                  </div>
                )}
              </div>

              {/* Spoken Answer Live Transcript Stream */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Your Spoken Answer (Live Transcript):</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Hands-free active &bull; pauses trigger auto-submission
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={userSpokenAnswer}
                  onChange={(e) => setUserSpokenAnswer(e.target.value)}
                  placeholder="Speak through your microphone naturally. Your words will automatically appear here..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed shadow-xs"
                />
              </div>

              {/* Action Buttons: Finish Answer fallback & Replay */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => speakAiMessage(currentQuestion?.questionText, currentQuestion?.audioUrl, () => startListeningAutomatically())}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Repeat Question</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={interviewState === 'PROCESSING_ANSWER' || !userSpokenAnswer.trim()}
                    onClick={handleManualFinishAnswer}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {interviewState === 'PROCESSING_ANSWER' ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Finish Answer & Submit</span>
                  </button>
                </div>
              </div>

              {/* LIVE COACHING CARD (Appears immediately after evaluation without interrupting) */}
              {lastEvaluation && (
                <div className="p-4 md:p-5 rounded-2xl bg-white border border-indigo-200/90 shadow-md space-y-3 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${lastEvaluation.isCorrect ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="font-bold text-slate-900 text-xs">
                        AI Coach Feedback ({lastEvaluation.score}/100)
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      lastEvaluation.isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {lastEvaluation.isCorrect ? 'Accurate Response' : (lastEvaluation.isPartiallyCorrect ? 'Partially Correct' : 'Concept Needs Improvement')}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-medium">
                    {lastEvaluation.spokenFeedback}
                  </p>

                  {/* If candidate made mistakes, display constructive guidance */}
                  {Array.isArray(lastEvaluation.mistakes) && lastEvaluation.mistakes.length > 0 && (
                    <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-[11px] text-rose-900 space-y-1">
                      <span className="font-bold block text-rose-950 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Key Area to Correct:</span>
                      </span>
                      <p className="leading-relaxed">{lastEvaluation.mistakes.join(' • ')}</p>
                      {lastEvaluation.correctedExplanation && (
                        <p className="text-slate-700 mt-1 border-t border-rose-200/60 pt-1 italic">
                          <strong>Accurate Concept:</strong> {lastEvaluation.correctedExplanation}
                        </p>
                      )}
                    </div>
                  )}

                  {lastEvaluation.followUpQuestion && (
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-[11px] text-indigo-950 space-y-1">
                      <span className="font-bold block flex items-center gap-1 text-indigo-900">
                        <ArrowRight className="w-3 h-3 text-indigo-600" />
                        <span>Adaptive Follow-up:</span>
                      </span>
                      <p className="font-semibold text-slate-900">{lastEvaluation.followUpQuestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: PROCESS ARCHITECTURE & VERIFIED ROUNDS OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {targetCompany} Interview Architecture ({targetRole})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reported hiring rounds, topic distributions, and candidate experiences.
              </p>
            </div>
            <button
              onClick={() => fetchInterviewPlan(targetCompany, targetRole, true)}
              className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Re-scan public sources
            </button>
          </div>

          {loadingPlan ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Sparkles className="w-7 h-7 animate-spin mx-auto text-indigo-500" />
              <p className="font-semibold text-slate-700 text-xs">Researching interview patterns for {targetCompany}...</p>
            </div>
          ) : interviewPlan ? (
            <div className="space-y-6">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {interviewPlan.summary}
              </p>

              {/* Rounds Cards */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Configured Interview Stages ({interviewPlan.rounds?.length || 0})
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
                    setActiveTab('live');
                    handleStartLiveInterview(false);
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  <span>Start Live Simulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Unable to load interview architecture. Please try refreshing.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: PERMANENT INTERVIEW HISTORY & PERFORMANCE TREND
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Analytics KPI Summary Row */}
          {historyAnalytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] font-bold block uppercase">Completed Interviews</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5">{historyAnalytics.totalInterviews}</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] font-bold block uppercase">Average Score</span>
                <span className="text-2xl font-black text-indigo-600 mt-0.5">{historyAnalytics.averageScore}%</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] font-bold block uppercase">Best Score</span>
                <span className="text-2xl font-black text-emerald-600 mt-0.5">{historyAnalytics.bestScore}%</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <span className="text-slate-400 text-[10px] font-bold block uppercase">Score Improvement</span>
                <span className={`text-2xl font-black mt-0.5 ${historyAnalytics.improvementPercentage >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {historyAnalytics.improvementPercentage > 0 ? `+${historyAnalytics.improvementPercentage}%` : `${historyAnalytics.improvementPercentage}%`}
                </span>
              </div>
            </div>
          )}

          {/* Performance Trend Over Time */}
          {historyAnalytics?.trend && historyAnalytics.trend.length > 1 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Performance Trend Over Time</span>
                </h4>
                <span className="text-[11px] text-slate-400">Chronological Progression</span>
              </div>

              {/* Clean Trend Spark Bar */}
              <div className="flex items-end gap-3 h-28 pt-4 border-b border-slate-100">
                {historyAnalytics.trend.map((point, pIdx) => (
                  <div key={pIdx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-bold text-indigo-600">{point.overallScore}%</span>
                    <div 
                      className="w-full max-w-[42px] bg-indigo-500 rounded-t-lg transition-all duration-500 hover:bg-indigo-600"
                      style={{ height: `${Math.max(15, (point.overallScore / 100) * 100)}%` }}
                    />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">
                      Int {point.interviewIndex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Sessions Cards */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recorded Interview Sessions</h3>
                <p className="text-xs text-slate-500">Review detailed breakdowns, incorrect answers, and practice weak areas.</p>
              </div>
              <button
                onClick={fetchHistory}
                className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Sparkles className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                <p className="text-xs">Loading past interview records...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 font-medium">No completed interview sessions yet.</p>
                <button
                  onClick={() => {
                    setActiveTab('live');
                    handleStartLiveInterview(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  Start Your First Interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 hover:bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{item.company}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="font-semibold text-slate-700 text-xs">{item.role}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.overallScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.performanceLevel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                        <span>Date: {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>Rounds: <strong className="text-slate-700">{item.roundsCount}</strong></span>
                        <span>Questions: <strong className="text-slate-700">{item.questionsCount}</strong></span>
                        <span>Correct: <strong className="text-emerald-700">{item.correctAnswers}</strong></span>
                        {item.incorrectAnswers > 0 && (
                          <span>Needs Work: <strong className="text-amber-700">{item.incorrectAnswers}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xl font-black text-slate-900">{item.overallScore}%</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Overall Score</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenReportModal(item.sessionId)}
                          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </button>
                        <button
                          onClick={() => handleOpenPracticeMode(item.sessionId)}
                          className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Practice mistakes from this session"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Practice</span>
                        </button>
                        <button
                          onClick={() => {
                            setTargetCompany(item.company);
                            setTargetRole(item.role);
                            handleStartLiveInterview(true, item.sessionId);
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Retake interview with past weakness context"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DETAILED INTERVIEW REPORT (WITH DEDICATED INCORRECT ANSWERS SECTION)
          ========================================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {loadingReportDetails ? (
            <div className="text-center py-16 text-slate-400 space-y-3 bg-white rounded-3xl border border-slate-200">
              <Sparkles className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-semibold">Loading complete report analysis...</p>
            </div>
          ) : selectedReportSession?.finalReport ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              {/* Header */}
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedReportSession.companyName} Simulation Debrief
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Detailed Interview Performance Report
                </h3>
                <p className="text-xs text-slate-500">
                  Target Role: <strong className="text-slate-800">{selectedReportSession.targetRole}</strong> &bull; Date:{' '}
                  <strong>{new Date(selectedReportSession.createdAt).toLocaleDateString()}</strong>
                </p>
              </div>

              {/* Overall Score & Dimension Gauges */}
              <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white p-6 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row items-center gap-8">
                <div className="text-center shrink-0">
                  <ScoreGauge value={selectedReportSession.overallScore || 78} size={140} strokeWidth={11} color="#4F46E5" />
                  <p className="font-black text-slate-900 text-sm mt-2">Overall Score: {selectedReportSession.overallScore}/100</p>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block mt-1 ${
                    selectedReportSession.performanceLevel === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedReportSession.performanceLevel || 'Needs Improvement'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-slate-400 text-[10px] block font-semibold">Communication</span>
                    <span className="text-lg font-black text-slate-800">{selectedReportSession.finalReport.communicationScore || 78}/100</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-slate-400 text-[10px] block font-semibold">Technical Precision</span>
                    <span className="text-lg font-black text-slate-800">{selectedReportSession.finalReport.roleUnderstandingScore || selectedReportSession.overallScore}/100</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-slate-400 text-[10px] block font-semibold">Answer Depth</span>
                    <span className="text-lg font-black text-slate-800">{selectedReportSession.finalReport.answerQualityScore || 76}/100</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-slate-400 text-[10px] block font-semibold">Delivery & Confidence</span>
                    <span className="text-lg font-black text-slate-800">{selectedReportSession.finalReport.confidenceScore || 75}/100</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-slate-400 text-[10px] block font-semibold">HR / Cultural Readiness</span>
                    <span className="text-lg font-black text-slate-800">{selectedReportSession.finalReport.hrReadinessScore || 75}/100</span>
                  </div>
                </div>
              </div>

              {/* ROUND-BY-ROUND BREAKDOWN */}
              {selectedReportSession.rounds && selectedReportSession.rounds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Round-by-Round Breakdown</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {selectedReportSession.rounds.map((rnd, rIdx) => (
                      <div key={rIdx} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{rnd.name}</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            (rnd.score || 70) >= 65 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rnd.score || 75}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {rnd.feedback || `Evaluated core ${rnd.roundType} competencies.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DEDICATED SECTION 11: "NEEDS IMPROVEMENT" / INCORRECT ANSWERS */}
              {selectedReportSession.finalReport?.needsImprovementQuestions && selectedReportSession.finalReport.needsImprovementQuestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-rose-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Needs Improvement & Incorrect Answers ({selectedReportSession.finalReport.needsImprovementQuestions.length})</span>
                    </h4>
                    <button
                      onClick={() => handleOpenPracticeMode(selectedReportSession._id)}
                      className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Practice These Weak Areas</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedReportSession.finalReport.needsImprovementQuestions.map((item, nIdx) => (
                      <div key={nIdx} className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">Question: "{item.question}"</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Topic: {item.practiceTopic}
                          </span>
                        </div>

                        {item.userAnswer && (
                          <div className="p-3 bg-white rounded-xl border border-rose-200/80">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Your Spoken Answer:</span>
                            <p className="text-slate-700 mt-0.5 italic">"{item.userAnswer}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-rose-200">
                            <span className="font-bold text-rose-900 block text-[11px]">What was wrong / missing:</span>
                            <p className="text-rose-950 mt-0.5 text-[11px] leading-relaxed">{item.whatWasWrong}</p>
                          </div>
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                            <span className="font-bold text-emerald-900 block text-[11px]">Correct Concept to state:</span>
                            <p className="text-emerald-950 mt-0.5 text-[11px] leading-relaxed">{item.correctConcept}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>Recommended Practice Topic: <strong className="text-indigo-600">{item.practiceTopic}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLETE QUESTION-BY-QUESTION REVIEW */}
              {selectedReportSession.questions && selectedReportSession.questions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Complete Question Review ({selectedReportSession.questions.length} Questions)</span>
                  </h4>
                  <div className="space-y-3">
                    {selectedReportSession.questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">
                            Q{qIdx + 1}: {q.questionText}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {q.isCorrect ? 'Correct' : 'Needs Work'} ({q.score || 0}/100)
                          </span>
                        </div>

                        {q.userAnswer && (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px]">
                            <span className="text-slate-400 block font-semibold">Your Answer:</span>
                            <p className="text-slate-800 mt-0.5 italic">"{q.userAnswer}"</p>
                          </div>
                        )}

                        {q.feedback && (
                          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px]">
                            <span className="text-indigo-900 font-bold block">AI Feedback:</span>
                            <p className="text-indigo-950 mt-0.5 leading-relaxed">{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenPracticeMode(selectedReportSession._id)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Practice Weak Areas</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('live');
                    handleStartLiveInterview(true, selectedReportSession._id);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Interview (With Learning Context)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
              No interview report selected. Please select an interview from your History tab.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: AI COACH PRACTICE MODE ("Practice Weak Areas")
          ========================================================================= */}
      {activeTab === 'practice' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span>AI Coach Practice Mode</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted practice questions generated from your specific interview mistakes.
              </p>
            </div>
            <button
              onClick={() => handleOpenPracticeMode()}
              className="text-xs text-purple-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Generate New Practice Set
            </button>
          </div>

          {loadingPractice ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Sparkles className="w-7 h-7 animate-spin mx-auto text-purple-600" />
              <p className="font-semibold text-slate-700 text-xs">Synthesizing practice questions based on past mistakes...</p>
            </div>
          ) : practiceQuestions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-xs text-slate-500">No practice questions loaded.</p>
              <button
                onClick={() => handleOpenPracticeMode()}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Load Practice Questions
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
                  Practice Question {currentPracticeIdx + 1} of {practiceQuestions.length}
                </span>
                <span className="font-bold text-slate-500">
                  Topic: {practiceQuestions[currentPracticeIdx]?.topic}
                </span>
              </div>

              {/* Question card */}
              <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-200 text-sm font-semibold text-slate-900 leading-relaxed shadow-xs">
                {practiceQuestions[currentPracticeIdx]?.questionText}
                {practiceQuestions[currentPracticeIdx]?.hint && (
                  <p className="text-xs text-purple-700 font-normal mt-2 italic flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Coach Hint: {practiceQuestions[currentPracticeIdx].hint}</span>
                  </p>
                )}
              </div>

              {/* Candidate Practice Response */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Your Practice Response:</label>
                <textarea
                  rows={4}
                  value={practiceAnswer}
                  onChange={(e) => setPracticeAnswer(e.target.value)}
                  placeholder="Explain the concept clearly with concrete principles..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 leading-relaxed shadow-xs"
                />
              </div>

              {!practiceEvaluation ? (
                <button
                  disabled={evaluatingPractice || !practiceAnswer.trim()}
                  onClick={handleEvaluatePracticeAnswer}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                >
                  {evaluatingPractice ? <Sparkles className="w-4 h-4 animate-spin" /> : null}
                  <span>Submit Practice Answer for Instant Coaching</span>
                </button>
              ) : (
                <div className="p-5 rounded-2xl bg-white border border-purple-200 space-y-3 text-xs shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Coach Evaluation ({practiceEvaluation.score}/100)
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      practiceEvaluation.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {practiceEvaluation.isCorrect ? 'Good Understanding' : 'Needs Precision'}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{practiceEvaluation.spokenFeedback}</p>

                  {practiceQuestions[currentPracticeIdx]?.idealAnswer && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] space-y-1">
                      <span className="font-bold text-emerald-900 block">Recommended Mastery Answer:</span>
                      <p className="text-emerald-950 italic">"{practiceQuestions[currentPracticeIdx].idealAnswer}"</p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    {currentPracticeIdx < practiceQuestions.length - 1 ? (
                      <button
                        onClick={() => {
                          setCurrentPracticeIdx(prev => prev + 1);
                          setPracticeAnswer('');
                          setPracticeEvaluation(null);
                        }}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Next Practice Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTab('live');
                          handleStartLiveInterview(false);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Ready! Take Another Mock Interview</span>
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
          CHANGE TARGET COMPANY & ROLE MODAL
          ========================================================================= */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-6 animate-fadeIn font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Change Target Company & Role</h3>
              </div>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg cursor-pointer"
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
                  placeholder="e.g. TCS, Infosys, Google, Wipro..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {popularCompanies.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setTempCompany(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
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
                  placeholder="e.g. Data Analyst, MERN Stack Developer, Software Developer..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {popularRoles.map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setTempRole(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Save & Resimulate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
