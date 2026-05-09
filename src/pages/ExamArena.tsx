import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  RefreshCw, 
  BrainCircuit, 
  ChevronRight, 
  Terminal, 
  Cpu, 
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Volume2,
  Square
} from 'lucide-react';
import { alocService } from '../lib/alocService';
import { aiTutor } from '../lib/aiTutor';
import { ALOCQuestion, TutorResponse } from '../types';
import { cacheService } from '../lib/cacheService';
import { questionRouter } from '../lib/questionRouter';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { voiceService } from '../lib/voiceService';

export default function ExamArena() {
  const [currentQuestion, setCurrentQuestion] = useState<ALOCQuestion | null>(null);
  const [questionQueue, setQuestionQueue] = useState<ALOCQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<TutorResponse | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [subject, setSubject] = useState('english');
  const [examType, setExamType] = useState('utme');
  const [year, setYear] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [vaultSize, setVaultSize] = useState(0);
  const [globalVaultCount, setGlobalVaultCount] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState(logger.getLogs());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageRetry, setImageRetry] = useState(0); // 0: questions/, 1: root storage, 2: failed

  const IMAGE_BASE_URL = 'https://questions.aloc.com.ng/storage/';

  const getImageUrl = () => {
    if (!currentQuestion?.image || currentQuestion.image.trim() === "") return '';
    if (currentQuestion.image.startsWith('http')) return currentQuestion.image;
    
    // Universal logic: try root storage directly
    return `https://questions.aloc.com.ng/storage/${currentQuestion.image}`;
  };

  const showDemoImage = () => {
    const demoQuestion: ALOCQuestion = {
      id: 9999,
      subject: "physics",
      examType: "UTME",
      examyear: "2024",
      question: "Calculate the total resistance in the circuit shown below. This is a Neural Hub visual demonstration to prove diagram rendering.",
      option: {
        a: "5.0 Ω",
        b: "10.0 Ω",
        c: "15.0 Ω",
        d: "20.0 Ω",
        e: ""
      },
      answer: "a",
      solution: "In a parallel circuit, the total resistance is calculated using the reciprocal formula. This demo uses a high-quality external image to verify that the Neural Hub interface correctly renders diagrams regardless of the source.",
      image: "https://www.allaboutcircuits.com/uploads/articles/three-resistor-parallel-circuit.jpg",
      source: "vault"
    };
    setCurrentQuestion(demoQuestion);
    setQuestionQueue([demoQuestion]);
    setCurrentIndex(0);
    setImageError(false);
    setImageLoading(true);
    setAiResponse(null);
    logger.info("🎬 Demo Mode: Loading hardcoded visual test question.");
  };

  const handleImageError = () => {
    logger.error(`Image failed to render: ${getImageUrl()}`);
    setImageError(true);
  };

  useEffect(() => {
    voiceService.setChangeListener(setIsSpeaking);
    return () => voiceService.stop();
  }, []);

  useEffect(() => {
    const unsubscribe = logger.subscribe(setDebugLogs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setVaultSize(cacheService.getVaultStats().total);
    fetchGlobalVaultStats();
  }, [currentQuestion]);

  // Handle Cloud Migration on Initial Load
  useEffect(() => {
    questionRouter.migrateLocalToGlobal();
  }, []);

  const fetchGlobalVaultStats = async () => {
    if (!supabase) {
      logger.warn("Stats Fetch Skipped: Supabase not initialized.");
      return;
    }
    
    logger.info("Checking Global Vault size...");
    try {
      const { count, error, status } = await supabase
        .from('global_questions_vault')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        logger.info(`Stats Fetch Success: Found ${count} items.`);
        setGlobalVaultCount(count);
      } else {
        logger.error("Stats Fetch Error", {
          message: error.message,
          code: error.code,
          status
        });
      }
    } catch (e) {
      logger.error("Global Stats Exception", e);
    }
  };

  useEffect(() => {
    fetchNewQuestion(true); // Always fresh fetch on filters change
  }, [subject, examType, year]);

  const fetchNewQuestion = async (isFreshBatch: boolean = false, subjectOverride?: string) => {
    setLoading(true);
    setAiResponse(null);
    setSelectedOption(null);
    setIsCorrect(null);
    voiceService.stop();
    setImageError(false);
    setImageLoading(true);
    setImageRetry(0);

    const activeSubject = subjectOverride || subject;
    
    if (!isFreshBatch && currentIndex < questionQueue.length - 1 && !subjectOverride) {
      // Just move to next in queue
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentQuestion(questionQueue[nextIdx]);
      setLoading(false);
      return;
    }

    try {
      // Use Smart Router for fetching
      const question = await questionRouter.getSmartQuestion(activeSubject, examType, year);
      
      if (question) {
        if (subjectOverride) setSubject(subjectOverride);
        setQuestionQueue([question]);
        setCurrentIndex(0);
        setCurrentQuestion(question);
      } else {
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error(err);
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption || !currentQuestion) return;
    
    setSelectedOption(option);
    const correct = option.toLowerCase() === currentQuestion.answer.toLowerCase();
    setIsCorrect(correct);

    if (!correct) {
      // Automatically run neural analysis if wrong
      runNeuralAnalysis(`I picked option ${option.toUpperCase()}, but it's wrong. Oya, enlighten me!`);
    }
  };

  const runNeuralAnalysis = async (customQuery?: string) => {
    if (!currentQuestion) return;
    setIsAiProcessing(true);
    setShowAiPanel(true);
    try {
      const res = await aiTutor.askTutorChuksLive(customQuery || "Explain this question and why the answer is correct.", currentQuestion);
      setAiResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* --- STEP 3: NEURAL LINK STATUS BAR --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-full backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-400 rounded-full"
              />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400/80">
              Status: Connected to National Question Bank
            </span>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">NODE_ID</span>
                <span className="text-xs font-mono text-zinc-300">ARENA_77</span>
             </div>
             <div className="h-4 w-px bg-zinc-800" />
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">LATENCY</span>
                <span className="text-xs font-mono text-emerald-500">24ms</span>
             </div>
             <div className="h-4 w-px bg-zinc-800" />
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">GLOBAL_VAULT</span>
                <span className="text-xs font-mono text-cyan-400">{globalVaultCount ?? '...'}</span>
             </div>
             <div className="h-4 w-px bg-zinc-800" />
             <button 
               onClick={() => setShowLogs(!showLogs)}
               className="flex items-center gap-2 hover:bg-zinc-800 px-2 py-0.5 rounded transition-colors"
             >
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">CLOUD_LOGS</span>
                <Terminal className={`w-3 h-3 ${showLogs ? 'text-emerald-500' : 'text-zinc-500'}`} />
             </button>
          </div>
        </div>

        <AnimatePresence>
          {showLogs && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-4 overflow-hidden"
            >
              <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 font-mono text-[10px]">
                 <div className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1">
                    <div className="flex items-center gap-4">
                       <span className="text-zinc-500 font-bold">BRIDGE_DIAGNOSTICS</span>
                       <button 
                         onClick={() => fetchNewQuestion(true, 'physics')}
                         className="px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-[8px] font-black tracking-tighter transition-all"
                       >
                          FORCE_PHYSICS_DIAGRAM
                       </button>
                       <button 
                         onClick={showDemoImage}
                         className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-black tracking-tighter transition-all"
                       >
                          SHOW_IMAGE_DEMO
                       </button>
                    </div>
                    <button onClick={() => setShowLogs(false)} className="text-zinc-600 hover:text-white">CLOSE</button>
                 </div>
                 <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                    {debugLogs.length === 0 && <div className="text-zinc-700 italic">No logs yet...</div>}
                    {debugLogs.map((log, i) => (
                      <div key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-zinc-700 shrink-0">{log.timestamp}</span>
                        <span className={`shrink-0 font-bold ${
                          log.level === 'error' ? 'text-red-500' : 
                          log.level === 'warn' ? 'text-orange-500' : 
                          'text-cyan-500'
                        }`}>[{log.level.toUpperCase()}]</span>
                        <span className="text-zinc-300 break-all">{log.message}</span>
                        {log.details && (
                          <span className="text-zinc-600 italic">
                            ({JSON.stringify(log.details)})
                          </span>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-12 space-y-6">
            {/* Header / Selection */}
            <div className="flex flex-wrap items-center justify-between gap-4">
               <div>
                  <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-zinc-500">
                    LIVE_NEURAL_HUB
                  </h1>
                  <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">Deep Learning Exam Simulation</p>
               </div>
               
               <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase p-2 focus:outline-none cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <option value="english">English</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="biology">Biology</option>
                    <option value="economics">Economics</option>
                    <option value="government">Government</option>
                    <option value="civiledu">Civic Education</option>
                    <option value="commerce">Commerce</option>
                    <option value="accounting">Accounting</option>
                    <option value="currentaffairs">Current Affairs</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-800" />
                  <select 
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase p-2 focus:outline-none cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <option value="utme">JAMB (UTME)</option>
                    <option value="waec">WAEC</option>
                    <option value="neco">NECO</option>
                    <option value="post-utme">Post-UTME</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-800" />
                  <select 
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      // fetchNewQuestion will be triggered by useEffect
                    }}
                    className="bg-transparent text-xs font-bold uppercase p-2 focus:outline-none cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <option value="">All Years</option>
                    {Array.from({ length: 30 }, (_, i) => 2024 - i).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* --- STEP 3: QUESTION CARD (GLASSMORPHISM) --- */}
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000" />
               <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 min-h-[300px] flex flex-col justify-between">
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <RefreshCw className="w-12 h-12 text-zinc-700 animate-spin" />
                    </div>
                  ) : currentQuestion ? (
                    <motion.div 
                      key={currentQuestion.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                           <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20">
                             {currentQuestion.examType} {currentQuestion.examyear}
                           </span>
                           <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border ${currentQuestion.source === 'vault' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                             {currentQuestion.source === 'vault' ? 'GLOBAL VAULT' : 'LIVE SATELLITE (ALOC)'}
                           </span>
                           <span className="text-zinc-600 font-mono text-[10px]">ID: {currentQuestion.id}</span>
                        </div>

                        {currentQuestion.section && (
                          <div 
                            className="p-4 bg-zinc-800/30 border-l-2 border-emerald-500 text-sm italic text-zinc-400 leading-relaxed rounded-r-xl"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.section }}
                          />
                        )}

                        {currentQuestion.passage && (
                          <div className="p-6 bg-black/40 border border-white/5 rounded-2xl text-sm leading-relaxed text-zinc-300 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <p className="font-black text-[10px] uppercase tracking-widest text-emerald-500/60 mb-2">Reading Passage</p>
                            <div dangerouslySetInnerHTML={{ __html: currentQuestion.passage }} />
                          </div>
                        )}

                        {currentQuestion.image && !imageError && (
                          <div className="relative group/img overflow-hidden rounded-2xl bg-white border border-white/10 shadow-xl">
                            {imageLoading && (
                              <div className="absolute inset-0 bg-zinc-100 animate-pulse flex items-center justify-center">
                                <Cpu className="w-8 h-8 text-zinc-300 animate-spin" />
                              </div>
                            )}
                            <div className="p-4 flex justify-center bg-white">
                              <img 
                                src={getImageUrl()} 
                                alt="Exam Diagram" 
                                onLoad={() => setImageLoading(false)}
                                onError={handleImageError}
                                className={`max-h-64 object-contain transition-opacity duration-500 rounded-sm ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                              />
                            </div>
                            {!imageLoading && (
                              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-bold text-zinc-300 uppercase tracking-widest opacity-0 group-hover/img:opacity-100 transition-opacity">
                                NEURAL_DIAGRAM_ATTACHED
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-1">
                          <h2 
                            className="text-2xl md:text-3xl font-bold leading-tight tracking-tight mt-2"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
                          />
                          
                          {/* Visual Debugger */}
                          <div className="mt-4 p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                             <div className="flex items-center gap-2 text-[10px] font-mono text-red-400">
                                <span className="font-bold">DEBUG:</span>
                                <span>{currentQuestion.image ? `Image Data = "${currentQuestion.image}"` : "No image in this question data."}</span>
                                {imageError && <span className="text-red-600 font-black ml-2 underline">!! RENDERING_FAILED !!</span>}
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(currentQuestion.option)
                          .filter(([_, value]) => value && value.trim() !== "")
                          .map(([key, value]) => {
                          const isThisSelected = selectedOption === key;
                          const isThisCorrect = currentQuestion.answer.toLowerCase() === key.toLowerCase();
                          
                          let borderClass = "border-white/10";
                          let bgClass = "bg-white/5";
                          let dotClass = "bg-zinc-800 text-zinc-500";

                          if (selectedOption) {
                            if (isThisCorrect) {
                              borderClass = "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                              bgClass = "bg-emerald-500/10";
                              dotClass = "bg-emerald-500 text-white";
                            } else if (isThisSelected && !isThisCorrect) {
                              borderClass = "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                              bgClass = "bg-red-500/10";
                              dotClass = "bg-red-500 text-white";
                            }
                          }

                          return (
                            <button 
                              key={key}
                              onClick={() => handleOptionSelect(key)}
                              disabled={!!selectedOption}
                              className={`text-left border ${borderClass} ${bgClass} p-4 rounded-2xl transition-all group flex items-start gap-4 disabled:cursor-default`}
                            >
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase border border-transparent transition-colors ${dotClass}`}>
                                {key}
                              </span>
                              <span className={`${selectedOption ? (isThisCorrect ? 'text-emerald-400' : isThisSelected ? 'text-red-400' : 'text-zinc-500') : 'text-zinc-300'} pt-1`}>
                                {value}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-600">
                      <AlertCircle className="w-10 h-10" />
                      <p className="font-bold uppercase tracking-widest text-sm">No node connection</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-12 pt-8 border-t border-white/5">
                    <button 
                      onClick={() => fetchNewQuestion(false)}
                      disabled={loading}
                      className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-tighter hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      {currentIndex < questionQueue.length - 1 ? `Next Question (${currentIndex + 2}/${questionQueue.length})` : 'Shuffle Node'}
                    </button>

                    {/* --- STEP 3: THE AI BUTTON --- */}
                    <button 
                      onClick={() => runNeuralAnalysis()}
                      className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-tighter hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      Neural Analysis
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* --- STEP 4: DEVELOPER CONSOLE (DEMO MODE) --- */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden mt-12">
          <div className="bg-zinc-900 px-6 py-2 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2">
               <Terminal className="w-4 h-4 text-zinc-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Developer Console</span>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-zinc-600 font-mono">LIVE_FEED</span>
               </div>
               {currentQuestion && (
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 font-mono">SOURCE:</span>
                    <span className={`text-[10px] font-mono ${currentQuestion.source === 'vault' ? 'text-cyan-400' : 'text-emerald-500'}`}>
                      {currentQuestion.source?.toUpperCase() || 'LIVE'}
                    </span>
                 </div>
               )}
            </div>
          </div>
          <div className="p-6 font-mono grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px] overflow-y-auto custom-scrollbar">
             <div className="space-y-4">
                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">{'//'} Raw_API_Response</span>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-[10px] text-emerald-500/80 break-all overflow-auto max-h-[200px]">
                   {currentQuestion ? JSON.stringify(currentQuestion, null, 2) : "Awaiting data stream..."}
                </div>
             </div>
             <div className="space-y-4">
                <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">{'//'} Active_Neural_Nodes</span>
                <div className="space-y-2">
                   <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${aiResponse?.provider === 'gemini' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-zinc-800'}`} />
                         <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Gemini-Pro-Vision</span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600">MASTER</span>
                   </div>
                   <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${aiResponse?.provider === 'groq' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-zinc-800'}`} />
                         <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Groq-Llama-3</span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600">FAILOVER_01</span>
                   </div>
                   <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${aiResponse?.provider === 'huggingface' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-zinc-800'}`} />
                         <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">HF-Inference</span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600">FAILOVER_02</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* --- AI SLIDE-OUT PANEL --- */}
      <AnimatePresence>
        {showAiPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiPanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-full md:w-[450px] bg-[#0c0c0c] border-l border-white/10 z-50 p-8 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                       <Cpu className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                       <h3 className="font-black text-xl uppercase tracking-tighter">Tutor Chuks</h3>
                       <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest">Neural Link Active</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setShowAiPanel(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors border border-white/5"
                 >
                   <ChevronRight className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <MessageSquare className="w-4 h-4 text-zinc-600" />
                       <span className="text-xs font-black uppercase text-zinc-600 tracking-widest">Query Analysis</span>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 italic text-zinc-400">
                       {aiResponse ? `Student input detected. Routing to ${aiResponse.provider.toUpperCase()} nodes...` : "Neural stream initiating..."}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black uppercase text-emerald-500 tracking-widest">Tutor Output</span>
                       </div>
                       {aiResponse && (
                         <div className="flex items-center gap-3">
                           <AnimatePresence>
                             {isSpeaking && (
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.8 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.8 }}
                                 className="flex items-end gap-0.5 h-3"
                               >
                                 {[0, 1, 2].map((i) => (
                                   <motion.div
                                     key={i}
                                     animate={{ 
                                       height: ["20%", "100%", "20%"]
                                     }}
                                     transition={{ 
                                       duration: 0.6, 
                                       repeat: Infinity, 
                                       delay: i * 0.1,
                                       ease: "easeInOut"
                                     }}
                                     className="w-0.5 bg-cyan-400 rounded-full"
                                   />
                                 ))}
                               </motion.div>
                             )}
                           </AnimatePresence>
                           <button 
                             onClick={() => isSpeaking ? voiceService.stop() : voiceService.speak(aiResponse.answer)}
                             className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition-all group relative overflow-hidden"
                           >
                             <div className="absolute inset-0 bg-emerald-400/5 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                             {isSpeaking ? (
                               <Square className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                             ) : (
                               <Volume2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                             )}
                           </button>
                         </div>
                       )}
                    </div>
                    <div className="min-h-[200px] relative">
                       {isAiProcessing ? (
                         <div className="space-y-4 pt-4">
                            <div className="h-4 bg-zinc-800 rounded animate-pulse w-full" />
                            <div className="h-4 bg-zinc-800 rounded animate-pulse w-5/6" />
                            <div className="h-4 bg-zinc-800 rounded animate-pulse w-4/6" />
                         </div>
                       ) : aiResponse ? (
                         <div className="text-lg leading-relaxed text-zinc-100 font-medium whitespace-pre-wrap">
                            {aiResponse.answer}
                            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                               <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Processed via {aiResponse.provider} Node</span>
                               <Zap className="w-3 h-3 text-emerald-500" />
                            </div>
                         </div>
                       ) : null}
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
      `}} />

      {/* --- Neural Data Stream Overlay --- */}
      <div className="fixed bottom-8 left-8 z-30 pointer-events-none hidden md:block">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-3 rounded-xl shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-emerald-500/60 uppercase">Neural Data Stream</span>
          </div>
          <div className="font-mono text-[9px] text-zinc-400">
            IMAGE_FIELD: <span className={currentQuestion?.image ? "text-cyan-400" : "text-zinc-600"}>
              "{currentQuestion?.image || ""}"
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
