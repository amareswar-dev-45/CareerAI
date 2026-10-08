import React, { useRef, useEffect } from 'react';
import { 
  Bot, 
  Video, 
  VideoOff, 
  Volume2, 
  User, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import robotImg from '../../assets/robot.jpg';

export default function AIInterviewVideoStage({
  company = 'TCS',
  role = 'Software Developer',
  roundTitle = 'Interview Stage',
  interviewerRole = 'AI Senior Interviewer',
  isAiSpeaking = false,
  cameraActive = false,
  cameraError = null,
  stream = null,
  onToggleCamera = () => {},
  candidateName = 'Candidate'
}) {
  const candidateVideoRef = useRef(null);

  // Bind or re-bind live stream whenever stream changes or camera toggles
  useEffect(() => {
    const videoEl = candidateVideoRef.current;
    if (videoEl) {
      if (stream && cameraActive) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
        videoEl.play().catch(err => {
          // Autoplay policy or pause notice
          console.warn('Video play notice:', err.message);
        });
      } else {
        videoEl.srcObject = null;
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
            <span>Interactive Session</span>
          </span>
        </div>
      </div>

      {/* Main Dual-Screen Grid: Left AI, Right Candidate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        
        {/* ==================== LEFT SIDE: AI INTERVIEWER ==================== */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] md:aspect-[16/10] min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex items-center justify-center group">
          {/* AI Interviewer Robot Image */}
          <img
            src={robotImg || '/robot.jpeg'}
            alt="AI Interviewer"
            className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
            onError={(e) => { 
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/robot.jpg'; 
            }}
          />

          {/* Cinematic Vignette & Bottom Gradient for Professional Studio Appearance */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/40 pointer-events-none" />

          {/* Top-Left Live Status Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white shadow-md">
            {isAiSpeaking ? (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 font-bold">Speaking...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-200">AI Interviewer</span>
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
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight tracking-tight text-white">
                  {interviewerTitle}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {company} AI Hiring Panel
                </p>
              </div>
            </div>

            {/* Speaking Audio Waves Animation */}
            {isAiSpeaking && (
              <div className="flex items-center gap-1 bg-purple-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-purple-400/40 shadow-lg">
                <span className="w-1 h-3.5 bg-purple-300 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-5 bg-purple-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-2.5 bg-purple-300 rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="w-1 h-4 bg-purple-300 rounded-full animate-bounce [animation-delay:450ms]" />
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT SIDE: CANDIDATE LIVE CAMERA ==================== */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] md:aspect-[16/10] min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex items-center justify-center">
          {cameraActive && !cameraError ? (
            <>
              {/* Mirrored Live Video Stream to prevent inverted perspective */}
              <video
                ref={candidateVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover [transform:scaleX(-1)]"
              />
              {/* Vignette Overlay for Crisp Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/30 pointer-events-none" />
            </>
          ) : (
            /* Graceful Camera Fallback / Permission Block */
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                <VideoOff className="w-6 h-6 text-slate-300" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-xs font-bold text-white">
                  {cameraError ? 'Camera Permission Required' : 'Webcam Is Turned Off'}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {cameraError || 'Turn on your camera for the realistic video interview experience.'}
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
            {cameraActive && (
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
                {cameraActive ? 'Real-Time Video Active' : 'Camera Feed Muted'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
