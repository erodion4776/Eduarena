import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  BrainCircuit, 
  ChevronRight, 
  ChevronLeft,
  Clock, 
  Award, 
  FileText, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { useNeuralVaultStore } from '../store/useNeuralVaultStore';
import { aiTutor } from '../lib/aiTutor';
import { voiceService } from '../lib/voiceService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function ExamArena() {
  const navigate = useNavigate();
  const { 
    currentSession, 
    isLoading, 
    answerQuestion, 
    setCurrentIndex, 
    setActiveSubjectIndex, 
    submitSession,
    hydrateSession
  } = useNeuralVaultStore();

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Hydrate session on load
  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  // Synchronized High-Precision Countdown Timer with Auto-Submit
  useEffect(() => {
    if (!currentSession || currentSession.isSubmitted) return;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000);
      return Math.max(0, currentSession.duration - elapsed);
    };

    setTimeLeft(calculateTimeLeft());

    const secondsTimer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(secondsTimer);
        submitSession().then(() => {
          setShowResultsModal(true);
        });
        toast.error("MASTER TIMER COMPLETED! Submitting exam automatically.", {
          duration: 10000
        });
      }
    }, 1000);

    return () => clearInterval(secondsTimer);
  }, [currentSession, submitSession]);

  useEffect(() => {
    voiceService.setChangeListener(setIsSpeaking);
    return () => voiceService.stop();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm font-black uppercase tracking-widest animate-pulse">Engaging Quantum Link...</p>
      </div>
    );
  }

  // Active Link Inactive View (Conceptual Resilience State)
  if (!currentSession) {
    return (
      <div className="min-h-full w-full text-white p-4 md:p-8 flex items-center justify-center font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/90 border border-white/5 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">NeuralLink Inactive</h1>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              No active test block has been authorized. Select single or compile a 4-subject JAMB block with a unified timer from the command deck.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-cyan-600/15"
          >
            Configure CBT Block
          </Button>
        </motion.div>
      </div>
    );
  }

  const { subjects, activeSubjectIndex, isSubmitted, userAnswers, examType } = currentSession;
  const activeSubject = subjects[activeSubjectIndex];
  
  if (!activeSubject || !activeSubject.questions || activeSubject.questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-black">No questions generated.</h2>
        <p className="text-sm text-zinc-400 max-w-sm">Failed to retrieve proper questions of this subject from satellite or local caches.</p>
        <Button onClick={() => navigate('/')} className="bg-zinc-800 rounded-xl">Return to Command Deck</Button>
      </div>
    );
  }

  const currentIndex = activeSubject.currentIndex;
  const currentQuestion = activeSubject.questions[currentIndex];

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCountForSubject = (sub: typeof activeSubject) => {
    return sub.questions.filter(q => userAnswers[String(q.id)] !== undefined).length;
  };

  const currentAnswer = currentQuestion ? userAnswers[String(currentQuestion.id)] : undefined;

  const handleOptionSelect = (key: string) => {
    if (isSubmitted) return;
    answerQuestion(currentQuestion.id, key);
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(activeSubjectIndex, currentIndex - 1);
      setAiResponse(null);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < activeSubject.questions.length - 1) {
      setCurrentIndex(activeSubjectIndex, currentIndex + 1);
      setAiResponse(null);
    }
  };

  // AI Chuks Live Interaction Block (Masked during assessment)
  const queryTutorChuks = async () => {
    if (!isSubmitted) return;
    setIsAiProcessing(true);
    setShowAiPanel(true);
    try {
      const response = await aiTutor.askTutorChuksLive("Explain the logic and concept step-by-step.", currentQuestion);
      setAiResponse(response);
    } catch (e) {
      toast.error("Failed to route link to Tutor Chuks.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Calculate scores on total block
  let totalSessionQuestions = 0;
  let correctSessionAnswers = 0;
  subjects.forEach(s => {
    s.questions.forEach(q => {
      totalSessionQuestions++;
      if (userAnswers[String(q.id)]?.toLowerCase() === (q.answer || '').toLowerCase()) {
        correctSessionAnswers++;
      }
    });
  });

  return (
    <div className="min-h-full text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30 overflow-x-hidden w-full relative">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HUD CONTROL DISPLAY HEADER */}
        <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 bg-zinc-900 border border-white/5 p-4 md:p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="p-3 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded-2xl transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                  {examType} ACTIVE BLOCK
                </span>
                {supabase && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Cloud Sync On
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-black mt-1 leading-snug">Unified Mock Simulation</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${
              isSubmitted 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : timeLeft < 300 
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 font-bold animate-pulse' 
                  : 'bg-zinc-950 border-white/5 text-cyan-400 font-mono'
            }`}>
              <Clock className="w-4 h-4" />
              <div className="text-sm font-black tracking-widest">
                {isSubmitted ? 'SUBMITTED' : formatTimer(timeLeft)}
              </div>
            </div>

            {!isSubmitted && (
              <Button 
                onClick={() => {
                  submitSession().then(() => {
                    setShowResultsModal(true);
                  });
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl py-6 px-6 text-xs uppercase tracking-wider"
              >
                End Exam & Submit
              </Button>
            )}
          </div>
        </header>

        {/* NESTED SUBJECT NAVIGATION TABS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subjects.map((sub, idx) => {
            const isSelected = idx === activeSubjectIndex;
            const answered = getAnsweredCountForSubject(sub);
            const total = sub.questions.length;
            
            return (
              <button
                key={sub.subject}
                onClick={() => setActiveSubjectIndex(idx)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-zinc-900 border-cyan-500 shadow-md shadow-cyan-500/5' 
                    : 'bg-zinc-900/40 border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider block truncate max-w-[120px]">
                    {sub.subject}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">
                    {answered}/{total}
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-3 overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all ${isSelected ? 'bg-cyan-500' : 'bg-zinc-600'}`}
                    style={{ width: `${(answered / (total || 1)) * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </section>

        {/* MAIN MOCK CONTENT CONTAINER */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
              
              {/* Question HUD indicators */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                  Question {currentIndex + 1} of {activeSubject.questions.length}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {activeSubject.questions.map((q, idx) => {
                    const isCurrent = idx === currentIndex;
                    const ans = userAnswers[String(q.id)];
                    const isAns = ans !== undefined;
                    
                    let bubbleColor = 'bg-zinc-950 border-white/5 text-zinc-500';
                    if (isCurrent) {
                      bubbleColor = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                    } else if (isAns) {
                      bubbleColor = 'bg-zinc-800 border-zinc-700 text-zinc-300';
                    }

                    if (isSubmitted) {
                      const isCorrect = ans?.toLowerCase() === (q.answer || '').toLowerCase();
                      if (isAns) {
                        bubbleColor = isCorrect 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-rose-500/20 border-rose-500 text-rose-400';
                      }
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(activeSubjectIndex, idx)}
                        className={`w-7 h-7 rounded-lg border text-[11px] font-mono flex items-center justify-center transition-all ${bubbleColor}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comprehension / passage attached */}
              {currentQuestion.passage && (
                <div className="p-4 bg-zinc-950/80 border border-white/5 rounded-2xl text-xs leading-relaxed text-zinc-300 max-h-[220px] overflow-y-auto">
                  <span className="font-black text-[9px] uppercase tracking-widest text-cyan-400 block mb-2">Attached Comprehension Passage</span>
                  <div dangerouslySetInnerHTML={{ __html: currentQuestion.passage }} />
                </div>
              )}

              {/* Visual image */}
              {currentQuestion.image && (
                <div className="flex justify-center bg-white p-4 rounded-2xl border border-white/10 max-h-48 overflow-hidden">
                  <img 
                    src={currentQuestion.image.startsWith('http') ? currentQuestion.image : `https://questions.aloc.com.ng/storage/${currentQuestion.image}`} 
                    alt="CBT Diagram" 
                    className="max-h-40 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Question content */}
              <div 
                className="text-base md:text-xl font-bold tracking-tight text-white leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />

              {/* Options Selector with active Mode Masking */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.option && Object.entries(currentQuestion.option)
                  .filter(([_, value]) => value && value.trim() !== '')
                  .map(([key, value]) => {
                    const isSelected = currentAnswer === key;
                    const isCorrect = (currentQuestion.answer || '').toLowerCase() === key.toLowerCase();
                    
                    let buttonStyle = 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10';
                    let badgeStyle = 'bg-zinc-900 border-white/10 text-zinc-500';

                    if (!isSubmitted) {
                      // Under assessment: only zinc border highlighting for chosen attempts (Exam Masking)
                      if (isSelected) {
                        buttonStyle = 'bg-cyan-950/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/5';
                        badgeStyle = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                      }
                    } else {
                      // Post-Submission: correctness clearly visible
                      if (isCorrect) {
                        buttonStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
                        badgeStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black';
                      } else if (isSelected && !isCorrect) {
                        buttonStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                        badgeStyle = 'bg-rose-500/20 border-rose-500 text-rose-400 font-black';
                      } else {
                        buttonStyle = 'bg-zinc-950/20 border-white/5 text-zinc-600 opacity-40';
                      }
                    }

                    return (
                      <button
                        key={key}
                        disabled={isSubmitted}
                        onClick={() => handleOptionSelect(key)}
                        className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all ${buttonStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs ${badgeStyle}`}>
                            {key.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium pr-4">{value}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Navigate & review tools */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={currentIndex === 0}
                    onClick={handlePrevQuestion}
                    className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl disabled:opacity-30 text-xs font-bold"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={currentIndex === activeSubject.questions.length - 1}
                    onClick={handleNextQuestion}
                    className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl disabled:opacity-30 text-xs font-bold"
                  >
                    Next
                  </Button>
                </div>

                {isSubmitted && (
                  <Button
                    onClick={queryTutorChuks}
                    className="bg-cyan-600 hover:bg-cyan-500 font-black text-xs uppercase px-4 rounded-xl flex items-center gap-1.5"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" /> Explain Solution
                  </Button>
                )}
              </div>
            </div>

            {/* Explanations shown immediately after submission */}
            {isSubmitted && currentQuestion.explanation && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/40 border border-emerald-500/10 p-6 rounded-3xl"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase mb-3">
                  <HelpCircle className="w-4 h-4 text-emerald-400" /> Syllabus Reference Solution
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">
                  {currentQuestion.explanation}
                </p>
              </motion.div>
            )}
          </div>

          {/* AI TUTOR PANEL - ASSESSMENT MASKING SUPPORT */}
          <div className="lg:col-span-4 space-y-6">
            {!isSubmitted ? (
              <div className="bg-zinc-900 border border-dashed border-white/5 rounded-3xl p-6 text-center space-y-4">
                <Lock className="w-8 h-8 text-cyan-500/40 mx-auto animate-pulse" />
                <h3 className="font-extrabold text-sm uppercase text-zinc-300">Tutor Link Encrypted</h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Assessment Mode is active. Complete and submit your unified mock script to engage Tutor Chuks diagnostics.
                </p>
                
                <div className="bg-zinc-950 rounded-2xl p-4 border border-white/5 text-left text-xs font-mono space-y-2">
                  <div className="text-[10px] text-zinc-400 uppercase font-black">Performance Diagnostics</div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Unanswered count:</span>
                    <span className="text-cyan-400 font-bold">
                      {totalSessionQuestions - Object.keys(userAnswers).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Assigned Timer:</span>
                    <span className="text-cyan-400 font-bold">{formatTimer(timeLeft)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-black text-sm uppercase">Tutor Chuks Diagnostic</h3>
                  </div>
                  
                  <button 
                    onClick={() => isSpeaking ? voiceService.stop() : voiceService.speak(aiResponse?.answer || "Explanation ready.")}
                    className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 rounded-xl border border-white/5 transition-colors"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 text-orange-400 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {isAiProcessing ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
                    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-xs text-zinc-500 font-black uppercase tracking-widest animate-pulse">Running Neural Inference...</p>
                  </div>
                ) : aiResponse ? (
                  <div className="space-y-4">
                    <div className="text-xs text-zinc-300 bg-zinc-950 p-4 rounded-2xl border border-white/5 whitespace-pre-line leading-relaxed max-h-[250px] overflow-y-auto">
                      {aiResponse.answer}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 text-right">
                      Processed via {aiResponse.provider} Network
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-zinc-950/50 rounded-2xl border border-dashed border-white/5 text-zinc-500 text-xs">
                    Choose a question in reviews and select "Explain Solution" to fire full model diagnostics.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* FINAL EXAMINATION ASSESSMENT OVERLAY */}
      <AnimatePresence>
        {showResultsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-zinc-900 border border-white/10 max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">CBT Simulation Complete</h2>
                <p className="text-xs text-zinc-500">Your results have been registered dynamically to the storage sync bridge.</p>
              </div>

              {/* Assessment diagnostics numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Unified Score</span>
                  <span className={`text-3xl font-black block mt-1 ${
                    currentSession.score >= 70 ? 'text-emerald-400' : currentSession.score >= 50 ? 'text-cyan-400' : 'text-rose-400'
                  }`}>
                    {Math.round(currentSession.score)}%
                  </span>
                </div>

                <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Reward Earned</span>
                  <span className="text-3xl font-black text-amber-400 block mt-1">
                    +{currentSession.xpEarned} XP
                  </span>
                </div>
              </div>

              {/* Breakdown by subject list */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Subject Breakdown</span>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {subjects.map(sub => {
                    let subCorrect = 0;
                    sub.questions.forEach(q => {
                      if (userAnswers[String(q.id)]?.toLowerCase() === (q.answer || '').toLowerCase()) {
                        subCorrect++;
                      }
                    });
                    const percent = Math.round((subCorrect / (sub.questions.length || 1)) * 100);

                    return (
                      <div key={sub.subject} className="flex items-center justify-between text-xs bg-zinc-950 px-3 py-2 border border-white/5 rounded-xl">
                        <span className="uppercase font-medium text-zinc-300">{sub.subject}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 font-mono text-[10px]">{subCorrect} / {sub.questions.length}</span>
                          <span className={`font-black font-mono ${
                            percent >= 70 ? 'text-emerald-400' : percent >= 50 ? 'text-cyan-400' : 'text-rose-400'
                          }`}>{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="flex-1 py-4 border-white/10 hover:bg-zinc-800 text-xs text-white uppercase font-black tracking-wider rounded-2xl"
                >
                  Return to Dashboard
                </Button>
                <Button 
                  onClick={() => setShowResultsModal(false)}
                  className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs uppercase font-black tracking-wider rounded-2xl"
                >
                  Review Questions
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
