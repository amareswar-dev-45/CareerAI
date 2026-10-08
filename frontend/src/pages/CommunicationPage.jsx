import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareQuote,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  BookOpen,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Award,
  Play,
  Square,
  RefreshCw,
  Layers,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Check,
  Send,
  User,
  Bot
} from 'lucide-react';
import API from '../services/api';

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reading' | 'conversation' | 'mistakes' | 'progress'

  // Global Progress State
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // READING PRACTICE STATES
  const [readingLevel, setReadingLevel] = useState('Beginner');
  const [readingTopic, setReadingTopic] = useState('College Life');
  const [readingPassage, setReadingPassage] = useState(null);
  const [loadingPassage, setLoadingPassage] = useState(false);
  const [isRecordingReading, setIsRecordingReading] = useState(false);
  const [readingAudioBlob, setReadingAudioBlob] = useState(null);
  const [readingAudioUrl, setReadingAudioUrl] = useState(null);
  const [readingTranscript, setReadingTranscript] = useState('');
  const [readingAnalysis, setReadingAnalysis] = useState(null);
  const [analyzingReading, setAnalyzingReading] = useState(false);

  // CONVERSATION STATES
  const [convoTopic, setConvoTopic] = useState('College Studies & Campus Life');
  const [convoLevel, setConvoLevel] = useState('Beginner');
  const [convoHistory, setConvoHistory] = useState([
    {
      role: 'ai',
      content: "Hi there! I am your AI communication coach. What did you work on or study today?",
      audioUrl: null
    }
  ]);
  const [studentInputText, setStudentInputText] = useState('');
  const [isRecordingConvo, setIsRecordingConvo] = useState(false);
  const [convoAudioBlob, setConvoAudioBlob] = useState(null);
  const [sendingConvo, setSendingConvo] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [convoFeedback, setConvoFeedback] = useState(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);

  // MISTAKE PRACTICE STATES
  const [activeMistakeIndex, setActiveMistakeIndex] = useState(0);
  const [mistakeSpokenText, setMistakeSpokenText] = useState('');
  const [isRecordingMistake, setIsRecordingMistake] = useState(false);
  const [evaluatingMistake, setEvaluatingMistake] = useState(false);
  const [mistakeEvaluation, setMistakeEvaluation] = useState(null);

  // MediaRecorder & Voice Loop refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const activeAudioPlayerRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const isRecordingConvoRef = useRef(false);
  const sendingConvoRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const initialGreetingSpokenRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Synchronize state to refs for asynchronous voice loop callbacks
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    isRecordingConvoRef.current = isRecordingConvo;
  }, [isRecordingConvo]);

  useEffect(() => {
    sendingConvoRef.current = sendingConvo;
  }, [sendingConvo]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  // Auto-scroll chat stream when new messages or statuses arrive
  useEffect(() => {
    if (activeTab === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [convoHistory, sendingConvo, isAiSpeaking, isRecordingConvo]);

  // Fetch Progress
  const fetchProgress = async () => {
    setLoadingProgress(true);
    try {
      const res = await API.get('/communication/progress');
      if (res.data?.success) {
        setProgressData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Web Speech API with natural pause / silence detection & auto submit
  const initSpeechRecognition = (onTranscript, autoSendOnSilence = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        const trimmed = transcript.trim();
        liveTranscriptRef.current = trimmed;
        if (onTranscript) onTranscript(trimmed);

        // Natural pause detection: 1.6 seconds of silence triggers automatic submission
        if (autoSendOnSilence && trimmed.length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopRecording('conversation', true);
          }, 1600);
        }
      };

      recognition.onspeechend = () => {
        if (autoSendOnSilence && liveTranscriptRef.current && liveTranscriptRef.current.trim().length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopRecording('conversation', true);
          }, 1100);
        }
      };

      recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setMicPermissionError(true);
        }
      };

      recognition.onend = () => {
        // Keep listening alive if in conversation mode and user hasn't spoken yet
        if (isRecordingConvoRef.current && !isAiSpeakingRef.current && activeTabRef.current === 'conversation') {
          if (liveTranscriptRef.current && liveTranscriptRef.current.trim().length > 2) {
            stopRecording('conversation', true);
          } else {
            try {
              recognition.start();
            } catch (e) {}
          }
        }
      };

      return recognition;
    }
    return null;
  };

  // Start Mic Recording
  const startRecording = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionError(false);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      liveTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      if (type === 'reading') {
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setReadingAudioBlob(blob);
          setReadingAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach(track => track.stop());
        };
        setIsRecordingReading(true);

        const recognition = initSpeechRecognition((liveText) => {
          setReadingTranscript(liveText);
        }, false);
        if (recognition) {
          speechRecognitionRef.current = recognition;
          recognition.start();
        }
      } else if (type === 'conversation') {
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setConvoAudioBlob(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        setIsRecordingConvo(true);
        isRecordingConvoRef.current = true;

        const recognition = initSpeechRecognition((liveText) => {
          setStudentInputText(liveText);
        }, true);
        if (recognition) {
          speechRecognitionRef.current = recognition;
          recognition.start();
        }
      } else if (type === 'mistake') {
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
        };
        setIsRecordingMistake(true);

        const recognition = initSpeechRecognition((liveText) => {
          setMistakeSpokenText(liveText);
        }, false);
        if (recognition) {
          speechRecognitionRef.current = recognition;
          recognition.start();
        }
      }

      mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError(true);
      }
      setIsRecordingConvo(false);
      isRecordingConvoRef.current = false;
      setIsRecordingReading(false);
      setIsRecordingMistake(false);
    }
  };

  // Stop Mic Recording
  const stopRecording = (type, autoSend = false) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }

    if (type === 'reading') setIsRecordingReading(false);
    if (type === 'conversation') {
      setIsRecordingConvo(false);
      isRecordingConvoRef.current = false;
      if (autoSend) {
        const text = liveTranscriptRef.current || studentInputText;
        if (text && text.trim().length > 0) {
          setTimeout(() => {
            handleSendConversationMessage(text.trim());
          }, 60);
        }
      }
    }
    if (type === 'mistake') setIsRecordingMistake(false);
  };

  // Unified AI Speech Engine: Plays synthesized voice or browser TTS, then triggers auto-listening
  const speakAiReply = (text, audioUrl, onComplete) => {
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;

    // Stop active mic to avoid picking up speaker output
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    setIsRecordingConvo(false);
    isRecordingConvoRef.current = false;

    let hasCompleted = false;
    const handleFinish = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    };

    if (audioUrl) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current = null;
      }
      try {
        const audio = new Audio(audioUrl);
        activeAudioPlayerRef.current = audio;
        audio.onended = handleFinish;
        audio.onerror = () => {
          speakWithBrowser(text, handleFinish);
        };
        audio.play().catch(e => {
          console.warn('Audio play notice, falling back to browser speech:', e.message);
          speakWithBrowser(text, handleFinish);
        });
        return;
      } catch (e) {
        console.warn('Audio initialization notice:', e.message);
      }
    }

    speakWithBrowser(text, handleFinish);
  };

  // Browser Speech Synthesis Engine
  const speakWithBrowser = (text, onFinished) => {
    if (!('speechSynthesis' in window) || !text) {
      if (onFinished) onFinished();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira')));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (onFinished) onFinished();
      };
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (onFinished) onFinished();
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis call notice:', err);
      if (onFinished) onFinished();
    }
  };

  // Automatically activate microphone after AI finishes speaking
  const startAutoListening = () => {
    if (activeTabRef.current !== 'conversation') return;
    if (isAiSpeakingRef.current || sendingConvoRef.current || isRecordingConvoRef.current) return;

    startRecording('conversation');
  };

  // Conversation lifecycle: speaks initial greeting and manages cleanup
  useEffect(() => {
    if (activeTab !== 'conversation') {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecordingConvo(false);
      setIsAiSpeaking(false);
    } else {
      // Automatic start: AI speaks opening greeting and then activates mic
      if (!initialGreetingSpokenRef.current && convoHistory.length === 1 && convoHistory[0].role === 'ai') {
        const timer = setTimeout(() => {
          initialGreetingSpokenRef.current = true;
          speakAiReply(convoHistory[0].content, convoHistory[0].audioUrl, () => {
            startAutoListening();
          });
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab]);

  // Generate Reading Passage
  const handleGeneratePassage = async () => {
    setLoadingPassage(true);
    setReadingAnalysis(null);
    setReadingTranscript('');
    setReadingAudioUrl(null);
    setReadingAudioBlob(null);

    try {
      const res = await API.post('/communication/reading/generate', {
        level: readingLevel,
        topic: readingTopic
      });
      if (res.data?.success) {
        setReadingPassage(res.data.data);
      }
    } catch (err) {
      console.error('Error generating passage:', err);
    } finally {
      setLoadingPassage(false);
    }
  };

  // Submit Reading for Analysis
  const handleSubmitReadingAnalysis = async () => {
    if (!readingPassage) return;
    setAnalyzingReading(true);

    try {
      const formData = new FormData();
      formData.append('expectedText', readingPassage.passage);
      formData.append('spokenText', readingTranscript);
      formData.append('level', readingLevel);
      formData.append('topic', readingTopic);
      formData.append('durationSeconds', readingPassage.targetDurationSeconds || 40);

      if (readingAudioBlob) {
        formData.append('audio', readingAudioBlob, 'reading_audio.webm');
      }

      const res = await API.post('/communication/reading/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setReadingAnalysis(res.data.data);
        fetchProgress();
      }
    } catch (err) {
      console.error('Error analyzing reading:', err);
      alert('Unable to analyze speech right now. Please try again.');
    } finally {
      setAnalyzingReading(false);
    }
  };

  // Send Conversation Message
  const handleSendConversationMessage = async (overrideText) => {
    const textToSend = (overrideText || studentInputText).trim();
    if (!textToSend && !convoAudioBlob) return;

    setSendingConvo(true);
    const updatedHistory = [...convoHistory, { role: 'student', content: textToSend }];
    setConvoHistory(updatedHistory);
    setStudentInputText('');

    try {
      let res;
      if (textToSend) {
        // Fast path: direct JSON request (instant transmission, <20ms)
        res = await API.post('/communication/conversation/message', {
          studentMessage: textToSend,
          level: convoLevel,
          topic: convoTopic,
          history: JSON.stringify(updatedHistory)
        });
      } else {
        // Fallback path: audio upload if no text transcript
        const formData = new FormData();
        formData.append('studentMessage', textToSend);
        formData.append('level', convoLevel);
        formData.append('topic', convoTopic);
        formData.append('history', JSON.stringify(updatedHistory));

        if (convoAudioBlob) {
          formData.append('audio', convoAudioBlob, 'convo_audio.webm');
        }

        res = await API.post('/communication/conversation/message', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data?.success) {
        const aiMsg = {
          role: 'ai',
          content: res.data.data.reply,
          audioUrl: res.data.data.audioUrl,
          subtleCorrection: res.data.data.subtleCorrection
        };
        setConvoHistory([...updatedHistory, aiMsg]);

        // Automatically speak AI voice response and automatically activate mic when AI finishes speaking
        speakAiReply(res.data.data.reply, res.data.data.audioUrl, () => {
          startAutoListening();
        });
      }
    } catch (err) {
      console.error('Error in conversation message:', err);
    } finally {
      setSendingConvo(false);
      setConvoAudioBlob(null);
    }
  };

  // Reset Conversation Session with fresh topic prompt
  const handleResetConversation = (newTopic = convoTopic) => {
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }

    setIsRecordingConvo(false);
    isRecordingConvoRef.current = false;
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
    setSendingConvo(false);
    setStudentInputText('');
    setConvoFeedback(null);

    let openingPrompt = "Hi there! I am your AI communication coach. What did you work on or study today?";
    if (newTopic === 'Hobbies & Free Time') {
      openingPrompt = "Hello! What hobbies or activities do you enjoy during your free time?";
    } else if (newTopic === 'Tech Projects & Coding') {
      openingPrompt = "Hi there! Tell me about what tech projects or coding topics you're currently exploring.";
    } else if (newTopic === 'Daily Routine & Habits') {
      openingPrompt = "Hi! How does your typical day look, and what productive habits are you building?";
    } else if (newTopic === 'Future Goals & Placements') {
      openingPrompt = "Greetings! What are your career goals and what kind of roles are you preparing for?";
    }

    const resetMsg = [{ role: 'ai', content: openingPrompt, audioUrl: null }];
    setConvoHistory(resetMsg);

    setTimeout(() => {
      speakAiReply(openingPrompt, null, () => {
        startAutoListening();
      });
    }, 400);
  };

  // End Conversation & Generate Feedback
  const handleEndConversation = async () => {
    if (convoHistory.length <= 1) return;
    setGeneratingFeedback(true);

    try {
      const res = await API.post('/communication/conversation/feedback', {
        history: convoHistory,
        level: convoLevel,
        topic: convoTopic
      });

      if (res.data?.success) {
        setConvoFeedback(res.data.data);
        fetchProgress();
      }
    } catch (err) {
      console.error('Error generating conversation feedback:', err);
    } finally {
      setGeneratingFeedback(false);
    }
  };

  // Evaluate Mistake Practice Attempt
  const handleEvaluateMistake = async (mistake) => {
    if (!mistakeSpokenText.trim()) return;
    setEvaluatingMistake(true);

    try {
      const res = await API.post('/communication/practice', {
        originalMistake: mistake.spoken,
        expectedCorrection: mistake.correct,
        studentSpoken: mistakeSpokenText.trim(),
        mistakeId: mistake._id
      });

      if (res.data?.success) {
        setMistakeEvaluation(res.data.data);
        fetchProgress();
      }
    } catch (err) {
      console.error('Error evaluating practice:', err);
    } finally {
      setEvaluatingMistake(false);
    }
  };

  // Default initial passage if none loaded
  useEffect(() => {
    if (!readingPassage) {
      handleGeneratePassage();
    }
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 font-sans">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Communication Coach</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Communication
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium max-w-xl leading-relaxed">
              "Learn English by actually speaking with AI — not just watching lessons."
            </p>
            <p className="text-xs text-indigo-400 font-bold tracking-wide">
              Read. Speak. Talk. Get Feedback. Improve.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('reading')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reading Practice</span>
            </button>
            <button
              onClick={() => setActiveTab('conversation')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>AI Conversation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('reading')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'reading'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Reading Practice</span>
        </button>

        <button
          onClick={() => setActiveTab('conversation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'conversation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>AI Conversation</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'mistakes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Practice My Mistakes</span>
          {progressData?.unresolvedMistakes?.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {progressData.unresolvedMistakes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'progress'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Progress & History</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. OVERVIEW SECTION                                            */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Progress Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fluency</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {progressData?.averageScores?.fluency || 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Speaking flow</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grammar</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {progressData?.averageScores?.grammar || 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sentence structure</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vocabulary</span>
              <p className="text-2xl font-black text-purple-600 mt-1">
                {progressData?.averageScores?.vocabulary || 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Word choices</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {progressData?.averageScores?.accuracy || 0}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Clarity & phrasing</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessions Done</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {progressData?.totalSessions || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Real practice sessions</p>
            </div>
          </div>

          {/* User Journey Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reading Practice Card */}
            <div
              onClick={() => setActiveTab('reading')}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">1. Reading Practice</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Read AI passages tailored to your level aloud. Get instant speech-to-text analysis, pronunciation estimates, and pacing insights.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                <span>Start Reading Aloud</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* AI Conversation Card */}
            <div
              onClick={() => setActiveTab('conversation')}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">2. AI Spoken Conversation</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Have natural, friendly voice dialogues with your AI coach. The AI speaks with a natural voice, listens, and gently guides your conversation.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-purple-600">
                <span>Start Voice Chat</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Practice My Mistakes Card */}
            <div
              onClick={() => setActiveTab('mistakes')}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">3. Practice My Mistakes</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Turn your mistakes into strengths! Speak the corrected sentences aloud and get instant verification when you improve.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-rose-600">
                <span>Review & Speak</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Weak Areas & Recommended Practice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Target Weak Areas</h3>
              </div>
              <div className="space-y-2">
                {progressData?.weakAreas && progressData.weakAreas.length > 0 ? (
                  progressData.weakAreas.map((area, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{area}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Complete practice sessions to identify areas to improve.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900">Recommended Practice Plan</h3>
              </div>
              <div className="space-y-2">
                {progressData?.recommendedPractice && progressData.recommendedPractice.length > 0 ? (
                  progressData.recommendedPractice.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Recommendations will appear after your first session.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. READING PRACTICE SECTION                                     */}
      {/* ============================================================== */}
      {activeTab === 'reading' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Proficiency Level
                </label>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setReadingLevel(lvl)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        readingLevel === lvl
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Topic Context
                </label>
                <select
                  value={readingTopic}
                  onChange={(e) => setReadingTopic(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="College Life">College Life & Daily Routine</option>
                  <option value="Career Preparation">Career Preparation & Placements</option>
                  <option value="Technology & Future">Technology & Innovation</option>
                  <option value="Introducing Yourself">Introducing Yourself & Projects</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGeneratePassage}
              disabled={loadingPassage || isRecordingReading}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPassage ? 'animate-spin' : ''}`} />
              <span>{loadingPassage ? 'Generating Passage...' : 'Generate New Passage'}</span>
            </button>
          </div>

          {/* Main Passage Display Card */}
          {readingPassage && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    {readingPassage.level} • {readingPassage.topic}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">{readingPassage.title}</h2>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                  Target: ~{readingPassage.targetDurationSeconds || 40}s
                </div>
              </div>

              {/* The Passage Text */}
              <div className="p-6 rounded-2xl bg-indigo-50/40 border border-indigo-100/80">
                <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium tracking-wide">
                  "{readingPassage.passage}"
                </p>
              </div>

              {/* Key Vocabulary Pills */}
              {readingPassage.keyVocabulary && readingPassage.keyVocabulary.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Key Vocabulary & Pronunciation Hints
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {readingPassage.keyVocabulary.map((vocab, vIdx) => (
                      <div
                        key={vIdx}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                      >
                        <span className="font-bold text-slate-900">{vocab.word}</span>
                        {vocab.pronunciationHint && (
                          <span className="text-[11px] text-indigo-600 font-medium">/{vocab.pronunciationHint}/</span>
                        )}
                        <span className="text-[10px] text-slate-400">({vocab.meaning})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spoken Recording Controls */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {!isRecordingReading ? (
                    <button
                      onClick={() => startRecording('reading')}
                      disabled={analyzingReading}
                      className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Reading Aloud</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => stopRecording('reading')}
                      className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  {readingAudioUrl && !isRecordingReading && (
                    <button
                      onClick={() => playAudio(readingAudioUrl)}
                      className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                      <span>Replay My Recording</span>
                    </button>
                  )}
                </div>

                {readingTranscript && !isRecordingReading && (
                  <button
                    onClick={handleSubmitReadingAnalysis}
                    disabled={analyzingReading}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {analyzingReading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Speech with AI...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Speech Analysis</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Live Speech Recognition Transcript Indicator */}
              {isRecordingReading && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Listening... Read the passage aloud now.</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "{readingTranscript || 'Speak clearly into your microphone...'}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reading Analysis Results Card */}
          {readingAnalysis && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-md space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Reading Performance Analysis</h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                  Speed: {readingAnalysis.speakingSpeed}
                </div>
              </div>

              {/* Score Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-center">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Fluency</span>
                  <p className="text-3xl font-black text-indigo-900 mt-1">{readingAnalysis.fluencyScore}%</p>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Grammar</span>
                  <p className="text-3xl font-black text-emerald-900 mt-1">{readingAnalysis.grammarScore}%</p>
                </div>
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Accuracy</span>
                  <p className="text-3xl font-black text-blue-900 mt-1">{readingAnalysis.accuracyScore}%</p>
                </div>
                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                    Pronunciation estimate
                  </span>
                  <p className="text-3xl font-black text-purple-900 mt-1">{readingAnalysis.pronunciationScore}%</p>
                </div>
              </div>

              {/* Feedback Message */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
                "{readingAnalysis.feedbackMessage}"
              </div>

              {/* Detected Issues & Words to Practice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Detected Pacing & Speech Issues</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {readingAnalysis.detectedIssues?.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Words to Practice Pronouncing</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {readingAnalysis.wordsToPractice?.map((word, wIdx) => (
                      <span
                        key={wIdx}
                        onClick={() => speakTextNative(word)}
                        className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                        title="Click to hear pronunciation"
                      >
                        <Volume2 className="w-3 h-3 text-indigo-500" />
                        <span>{word}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Suggestions */}
              {readingAnalysis.suggestions && readingAnalysis.suggestions.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                  <span className="text-xs font-bold text-emerald-900 block">Coach Recommendations</span>
                  <ul className="text-xs text-emerald-800 space-y-1">
                    {readingAnalysis.suggestions.map((sug, sIdx) => (
                      <li key={sIdx} className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. AI CONVERSATION PARTNER SECTION                              */}
      {/* ============================================================== */}
      {activeTab === 'conversation' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Conversation Top Settings */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Conversation Topic
                </label>
                <select
                  value={convoTopic}
                  onChange={(e) => {
                    const newTopic = e.target.value;
                    setConvoTopic(newTopic);
                    handleResetConversation(newTopic);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="College Studies & Campus Life">College Studies & Campus Life</option>
                  <option value="Hobbies & Free Time">Hobbies & Free Time</option>
                  <option value="Tech Projects & Coding">Tech Projects & Coding</option>
                  <option value="Daily Routine & Habits">Daily Routine & Habits</option>
                  <option value="Future Goals & Placements">Future Goals & Placements</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Pacing Level
                </label>
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setConvoLevel(lvl)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        convoLevel === lvl
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleEndConversation}
              disabled={convoHistory.length <= 1 || generatingFeedback}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            >
              {generatingFeedback ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Dialogue...</span>
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5" />
                  <span>End Session & Get Feedback</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Chat Stream */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              {convoHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-md space-y-1.5 ${msg.role === 'student' ? 'text-right' : 'text-left'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed inline-block ${
                        msg.role === 'student'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>

                    {/* AI Voice Playback button */}
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            speakAiReply(msg.content, msg.audioUrl, () => {
                              startAutoListening();
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen</span>
                        </button>

                        {msg.subtleCorrection && (
                          <span className="text-[10px] text-slate-400 italic">
                            💡 Tip: {msg.subtleCorrection}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === 'student' && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {sendingConvo && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold py-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>AI coach is listening & preparing response...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Spoken Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-3">
              {/* AI Speaking state indicator */}
              {isAiSpeaking && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-700 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                    <span className="font-bold">AI Coach is speaking...</span>
                  </div>
                  <span className="text-[11px] text-indigo-500 italic">Microphone will activate automatically</span>
                </div>
              )}

              {/* Microphone permission alert indicator */}
              {micPermissionError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Microphone access needed. Please click allow on your browser's microphone prompt to speak naturally.</span>
                </div>
              )}

              {/* Spoken transcript live preview */}
              {isRecordingConvo && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span className="font-bold">Listening to you speak:</span>
                    <span className="italic">"{studentInputText || 'Say anything naturally...'}"</span>
                  </div>
                  <button
                    onClick={() => stopRecording('conversation', true)}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    Done Speaking
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {!isRecordingConvo ? (
                  <button
                    onClick={() => startRecording('conversation')}
                    disabled={sendingConvo}
                    className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
                    title="Click to speak with microphone"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => stopRecording('conversation', true)}
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer animate-pulse"
                    title="Stop speaking"
                  >
                    <Square className="w-5 h-5 fill-white" />
                  </button>
                )}

                <input
                  type="text"
                  placeholder="Or type your reply here..."
                  value={studentInputText}
                  onChange={(e) => setStudentInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendConversationMessage();
                  }}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />

                <button
                  onClick={() => handleSendConversationMessage()}
                  disabled={!studentInputText.trim() || sendingConvo}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* End-of-Session Feedback Report */}
          {convoFeedback && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-lg space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Communication Summary</h3>
                </div>
                <span className="text-xs font-bold text-indigo-600">
                  Overall Score: {convoFeedback.scores?.overall}%
                </span>
              </div>

              {/* Scores Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 text-center">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Fluency</span>
                  <p className="text-2xl font-black text-indigo-900 mt-0.5">{convoFeedback.scores?.fluency}%</p>
                </div>
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Grammar</span>
                  <p className="text-2xl font-black text-emerald-900 mt-0.5">{convoFeedback.scores?.grammar}%</p>
                </div>
                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Vocabulary</span>
                  <p className="text-2xl font-black text-purple-900 mt-0.5">{convoFeedback.scores?.vocabulary}%</p>
                </div>
                <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Clarity</span>
                  <p className="text-2xl font-black text-blue-900 mt-0.5">{convoFeedback.scores?.clarity}%</p>
                </div>
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Accuracy</span>
                  <p className="text-2xl font-black text-amber-900 mt-0.5">{convoFeedback.scores?.accuracy}%</p>
                </div>
              </div>

              {/* Beginner-friendly Mistakes Corrections */}
              {convoFeedback.mistakes && convoFeedback.mistakes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Identified Mistakes & Natural Phrasing
                  </h4>
                  <div className="space-y-3">
                    {convoFeedback.mistakes.map((mstk, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">You said:</span>
                          <p className="text-xs text-rose-800 font-semibold">"{mstk.spoken}"</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Better:</span>
                          <p className="text-xs text-emerald-900 font-bold">"{mstk.better}"</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Why?</span>
                          <p className="text-xs text-slate-600">{mstk.explanation}</p>
                        </div>

                        {/* Try saying it again interactive prompt */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700">Try saying it again:</span>
                          <button
                            onClick={() => {
                              setActiveTab('mistakes');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>Practice This Sentence</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PRACTICE MY MISTAKES (LOOP)                                  */}
      {/* ============================================================== */}
      {activeTab === 'mistakes' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <h2 className="text-base font-bold text-slate-900">Practice My Mistakes</h2>
            <p className="text-xs text-slate-500">
              Speak the corrected sentence aloud. The AI coach listens and checks your progress in real time.
            </p>
          </div>

          {progressData?.unresolvedMistakes && progressData.unresolvedMistakes.length > 0 ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-md space-y-6">
              {/* Mistake pagination */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Mistake {activeMistakeIndex + 1} of {progressData.unresolvedMistakes.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={activeMistakeIndex === 0}
                    onClick={() => {
                      setActiveMistakeIndex(prev => prev - 1);
                      setMistakeEvaluation(null);
                      setMistakeSpokenText('');
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={activeMistakeIndex >= progressData.unresolvedMistakes.length - 1}
                    onClick={() => {
                      setActiveMistakeIndex(prev => prev + 1);
                      setMistakeEvaluation(null);
                      setMistakeSpokenText('');
                    }}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Active Mistake Details */}
              {(() => {
                const currentMistake = progressData.unresolvedMistakes[activeMistakeIndex];
                return (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-1">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Original Spoken:</span>
                      <p className="text-sm font-semibold text-rose-900">"{currentMistake.spoken}"</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Correct Way:</span>
                      <p className="text-base font-black text-emerald-900">"{currentMistake.correct}"</p>
                    </div>

                    {currentMistake.explanation && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">Grammar Rule: </span>
                        {currentMistake.explanation}
                      </div>
                    )}

                    {/* Microphone Practice Controls */}
                    <div className="p-6 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-center space-y-4">
                      <p className="text-xs font-bold text-indigo-900">
                        Please try this sentence again. Press the microphone and speak aloud:
                      </p>

                      <div className="flex items-center justify-center gap-3">
                        {!isRecordingMistake ? (
                          <button
                            onClick={() => startRecording('mistake')}
                            disabled={evaluatingMistake}
                            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Click & Speak Sentence</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => stopRecording('mistake')}
                            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer animate-pulse"
                          >
                            <Square className="w-4 h-4 fill-white" />
                            <span>Done Speaking</span>
                          </button>
                        )}
                      </div>

                      {mistakeSpokenText && !isRecordingMistake && (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-slate-700">
                            <span className="font-bold">You said:</span> "{mistakeSpokenText}"
                          </p>
                          <button
                            onClick={() => handleEvaluateMistake(currentMistake)}
                            disabled={evaluatingMistake}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                          >
                            {evaluatingMistake ? 'Verifying Speech...' : 'Verify My Improvement'}
                          </button>
                        </div>
                      )}

                      {/* Evaluation Result */}
                      {mistakeEvaluation && (
                        <div
                          className={`p-4 rounded-2xl border text-xs font-bold animate-fadeIn ${
                            mistakeEvaluation.improved
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                              : 'bg-amber-100 border-amber-300 text-amber-900'
                          }`}
                        >
                          <p className="text-sm">{mistakeEvaluation.feedback}</p>
                          <p className="text-[11px] font-medium mt-1">Accuracy Score: {mistakeEvaluation.score}/100</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Zero Pending Mistakes!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have no unresolved mistakes right now. Complete a Reading Practice or AI Conversation session to practice more!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. PROGRESS & HISTORY SECTION                                   */}
      {/* ============================================================== */}
      {activeTab === 'progress' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Detailed Progress Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Average Fluency</span>
              <p className="text-3xl font-black text-indigo-900 mt-1">{progressData?.averageScores?.fluency || 0}%</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Average Grammar</span>
              <p className="text-3xl font-black text-emerald-900 mt-1">{progressData?.averageScores?.grammar || 0}%</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Average Vocabulary</span>
              <p className="text-3xl font-black text-purple-900 mt-1">{progressData?.averageScores?.vocabulary || 0}%</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Average Accuracy</span>
              <p className="text-3xl font-black text-blue-900 mt-1">{progressData?.averageScores?.accuracy || 0}%</p>
            </div>
          </div>

          {/* Recent Practice Sessions Log Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Communication Practice Sessions</h3>
                <p className="text-xs text-slate-500">Real session history stored in MongoDB</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600">
                Total: {progressData?.totalSessions || 0}
              </span>
            </div>

            {progressData?.recentSessions && progressData.recentSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Topic / Context</th>
                      <th className="px-6 py-3">Level</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progressData.recentSessions.map((session) => (
                      <tr key={session._id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-bold capitalize text-slate-900">
                          {session.sessionType === 'reading' ? '📖 Reading' : '💬 Conversation'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{session.topic}</td>
                        <td className="px-6 py-4 text-slate-600">{session.level}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                            {session.overallScore}/100
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">
                          {new Date(session.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No sessions completed yet. Start your first Reading Practice above!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
