import React, { useRef, useEffect, useState } from 'react';
import { 
  Bot, 
  Video, 
  VideoOff, 
  Volume2, 
  User, 
  ShieldCheck, 
  Radio,
  Sparkles
} from 'lucide-react';
import robotImg from '../../assets/robot.jpg';
import hrImg from '../../assets/hr.jpeg';

export default function AIInterviewVideoStage({
  company = 'TCS',
  role = 'Software Developer',
  roundTitle = 'Technical Round',
  interviewerRole = 'Senior Technical Interviewer',
  roundKey = 'technical', // 'aptitude' | 'technical' | 'hr' | 'practice'
  isAiSpeaking = false,
  cameraActive = false,
  cameraError = null,
  stream = null,
  onToggleCamera = () => {},
  candidateName = 'Candidate'
}) {
  const candidateVideoRef = useRef(null);
  const streamBoundRef = useRef(null);

  // Determine which interviewer image to use:
  // HR round uses hrImg (c:\Users\nayak\OneDrive\Desktop\GCEK\hr.jpeg)
  // Technical / Aptitude rounds use robotImg
  const isHrRound = roundKey === 'hr' || String(roundTitle).toLowerCase().includes('hr') || String(interviewerRole).toLowerCase().includes('hr') || String(roundTitle).toLowerCase().includes('behavioral');
  const activeAvatarImg = isHrRound ? (hrImg || '/hr.jpeg') : (robotImg || '/robot.jpeg');

  // Lifelike blinking state for HR interviewer
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthPhase, setMouthPhase] = useState(0);

  // 1. Natural Random Eye Blinking interval (every 3.2 - 5.5 seconds)
  useEffect(() => {
    let blinkTimeout = null;
    let blinkDurationTimeout = null;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 2500 + 3000; // 3 to 5.5 seconds
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        blinkDurationTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 150); // Blink duration 150ms
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (blinkDurationTimeout) clearTimeout(blinkDurationTimeout);
    };
  }, []);

  // 2. Realistic Mouth / Phoneme movement while AI is speaking
  useEffect(() => {
    let mouthInterval = null;
    if (isAiSpeaking) {
      // Alternate mouth openness mimicking natural speech cadences
      mouthInterval = setInterval(() => {
        setMouthPhase(prev => (prev + 1) % 4);
      }, 120);
    } else {
      setMouthPhase(0);
    }
    return () => {
      if (mouthInterval) clearInterval(mouthInterval);
    };
  }, [isAiSpeaking]);

  // 3. ARCHITECTURAL CAMERA STREAM BINDING (Permanent White Screen Bug Fix)
  useEffect(() => {
    const videoEl = candidateVideoRef.current;
    if (!videoEl) return;

    if (stream && cameraActive) {
      if (videoEl.srcObject !== stream || streamBoundRef.current !== stream) {
        streamBoundRef.current = stream;
        videoEl.srcObject = stream;
        
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(err => {
            console.warn('[AIInterviewVideoStage] Autoplay play notification:', err.message);
          });
        };
      } else {
        // Ensure playback continues even if component re-rendered
        if (videoEl.paused) {
          videoEl.play().catch(() => {});
        }
      }
    } else {
      if (!cameraActive && videoEl.srcObject) {
        videoEl.srcObject = null;
        streamBoundRef.current = null;
      }
    }
  }, [stream, cameraActive]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-2xl space-y-3.5 font-sans">
      {/* Session Title Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-extrabold text-white tracking-wide uppercase text-[11px] flex items-center gap-1.5">
            <span>{company}</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-indigo-300">{roundTitle}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="hidden sm:inline">Target: {role}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold border border-white/10 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Interactive Live Simulation</span>
          </span>
        </div>
      </div>

      {/* Main Dual-Screen Grid: Left AI Interviewer, Right Candidate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        
        {/* ==================== LEFT SIDE: REAL-TIME AI INTERVIEWER ==================== */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] md:aspect-[16/10] min-h-[260px] sm:min-h-[310px] lg:min-h-[360px] bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center group select-none">
          
          {/* Avatar Base Wrapper with Natural Head Sway & Bobbing */}
          <div 
            className={`w-full h-full relative overflow-hidden transition-transform duration-700 ${
              isAiSpeaking 
                ? 'animate-[avatarSway_3s_ease-in-out_infinite]' 
                : 'animate-[avatarIdle_6s_ease-in-out_infinite]'
            }`}
          >
            {/* The Avatar Portrait Image (hr.jpeg or robot.jpg) */}
            <img
              src={activeAvatarImg}
              alt={isHrRound ? "HR Interviewer" : "AI Technical Interviewer"}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHrRound 
                  ? 'object-[center_12%] scale-[1.08]' // Crops watermark cleanly while centering on head/torso
                  : 'object-top scale-[1.02]'
              }`}
              onError={(e) => { 
                e.currentTarget.onerror = null;
                e.currentTarget.src = isHrRound ? '/hr.jpeg' : '/robot.jpg'; 
              }}
            />

            {/* LIFELIKE FACIAL ANIMATION OVERLAYS FOR HR PERSONA */}
            {isHrRound && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 1. Realistic Eye Blink Overlay Layer (Positioned across the eye coordinate line) */}
                <div 
                  className={`absolute top-[18.2%] left-[41.5%] w-[17%] h-[3.8%] flex items-center justify-between transition-opacity duration-75 ${
                    isBlinking ? 'opacity-95 scale-y-100' : 'opacity-0 scale-y-0'
                  }`}
                >
                  {/* Left Eye Eyelid */}
                  <div className="w-[43%] h-[7px] bg-[#d5a585] rounded-full shadow-[inset_0_-2px_4px_rgba(80,45,25,0.7)] border-b border-[#633a20]" />
                  {/* Right Eye Eyelid */}
                  <div className="w-[43%] h-[7px] bg-[#d5a585] rounded-full shadow-[inset_0_-2px_4px_rgba(80,45,25,0.7)] border-b border-[#633a20]" />
                </div>

                {/* 2. Realistic Speaking Mouth & Jaw Animation (Positioned over lips coordinate line) */}
                {isAiSpeaking && (
                  <div 
                    className="absolute top-[25.2%] left-[45.2%] w-[9.6%] h-[3.2%] flex items-center justify-center transition-all duration-100"
                    style={{
                      transform: mouthPhase === 0 
                        ? 'scaleY(1.0) scaleX(1.0)' 
                        : mouthPhase === 1 
                        ? 'scaleY(1.55) scaleX(1.04) translateY(1.5px)' 
                        : mouthPhase === 2 
                        ? 'scaleY(1.85) scaleX(0.96) translateY(2px)' 
                        : 'scaleY(1.35) scaleX(1.02) translateY(1px)'
                    }}
                  >
                    {/* Natural Inner Mouth Depth / Phoneme Aperture */}
                    <div 
                      className="w-[78%] h-[65%] bg-[#481116] rounded-[45%] opacity-85 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] border-t border-[#f5eedd]/70 transition-all duration-75"
                      style={{
                        height: mouthPhase === 0 ? '25%' : mouthPhase === 2 ? '80%' : '55%'
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* LIFELIKE ROBOTIC VOCALIZER FOR TECHNICAL ROUND */}
            {!isHrRound && isAiSpeaking && (
              <div className="absolute top-[28%] left-[46%] w-[8%] h-[4%] bg-cyan-400/30 rounded-full blur-[3px] animate-ping pointer-events-none" />
            )}
          </div>

          {/* Cinematic Studio Vignette & Studio Lighting Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/40 pointer-events-none" />

          {/* Dynamic AI Speaking Aura Glow */}
          {isAiSpeaking && (
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
              isHrRound 
                ? 'shadow-[inset_0_0_50px_rgba(244,114,182,0.25)]' 
                : 'shadow-[inset_0_0_50px_rgba(99,102,241,0.3)]'
            }`} />
          )}

          {/* Top-Left Live Status Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white shadow-md">
            {isAiSpeaking ? (
              <>
                <span className={`w-2 h-2 rounded-full animate-ping ${isHrRound ? 'bg-pink-400' : 'bg-purple-400'}`} />
                <Volume2 className={`w-3.5 h-3.5 ${isHrRound ? 'text-pink-400' : 'text-purple-400'}`} />
                <span className={`font-bold ${isHrRound ? 'text-pink-300' : 'text-purple-300'}`}>Speaking...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-200">AI {isHrRound ? 'HR Interviewer' : 'Technical Lead'}</span>
              </>
            )}
          </div>

          {/* Top-Right Company Badge */}
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-slate-300">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>{company} Panel</span>
          </div>

          {/* Bottom Overlay: Interviewer Name Tag & Audio Visualizer */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2 text-white">
            <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-lg">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHrRound ? 'bg-pink-500' : 'bg-indigo-500'}`} />
              <div>
                <p className="text-xs font-bold leading-tight tracking-tight text-white flex items-center gap-1.5">
                  <span>{interviewerRole}</span>
                  {isHrRound && (
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded-md font-semibold border border-pink-500/30">
                      Live Voice
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {company} Assessment Board &bull; {role}
                </p>
              </div>
            </div>

            {/* Speaking Audio Waves Animation */}
            {isAiSpeaking && (
              <div className={`flex items-center gap-1 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg border ${
                isHrRound 
                  ? 'bg-pink-950/90 border-pink-400/40 text-pink-300' 
                  : 'bg-purple-950/90 border-purple-400/40 text-purple-300'
              }`}>
                <span className="w-1 h-3.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-2.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="w-1 h-4 bg-current rounded-full animate-bounce [animation-delay:450ms]" />
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT SIDE: CANDIDATE LIVE CAMERA ==================== */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] md:aspect-[16/10] min-h-[260px] sm:min-h-[310px] lg:min-h-[360px] bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
          
          {/* Permanent Video Element Mounted In Place (Architectural Fix for White Screen) */}
          <video
            ref={candidateVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover [transform:scaleX(-1)] transition-opacity duration-300 ${
              cameraActive && !cameraError ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Vignette Overlay for Candidate Feed */}
          {cameraActive && !cameraError && (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 pointer-events-none z-1" />
          )}

          {/* Fallback View if Camera is Turned Off or Error Occurs */}
          {(!cameraActive || cameraError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 bg-slate-950">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                <VideoOff className="w-6 h-6 text-slate-300" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-bold text-white">
                  {cameraError ? 'Camera Permission Required' : 'Webcam Is Turned Off'}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {cameraError || 'Turn on your camera for the realistic live video interview experience.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleCamera}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Video className="w-3.5 h-3.5" />
                <span>{cameraError ? 'Retry Camera Access' : 'Turn On Camera'}</span>
              </button>
            </div>
          )}

          {/* Top-Right Camera Controls & Live Tag */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {cameraActive && !cameraError && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white shadow-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>LIVE FEED</span>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCamera}
              className={`p-2 rounded-xl backdrop-blur-md border transition cursor-pointer ${
                cameraActive 
                  ? 'bg-slate-900/85 text-emerald-400 hover:bg-slate-800 border-white/15' 
                  : 'bg-white/10 text-slate-400 hover:bg-white/20 border-white/10'
              }`}
              title={cameraActive ? 'Mute camera' : 'Enable camera'}
            >
              {cameraActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Bottom Overlay: Candidate Name Tag */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-lg text-white">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight text-white">
                {candidateName} <span className="text-[10px] font-normal text-slate-400">(Candidate)</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {cameraActive && !cameraError ? 'Real-Time Video Active' : 'Camera Feed Inactive'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Embedded CSS Animations for Realistic Avatar Head Movement */}
      <style>{`
        @keyframes avatarIdle {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-2.5px) rotate(0.4deg);
          }
        }
        @keyframes avatarSway {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-2px) rotate(0.5deg) scale(1.008);
          }
          75% {
            transform: translateY(1.5px) rotate(-0.4deg) scale(1.004);
          }
        }
      `}</style>
    </div>
  );
}

