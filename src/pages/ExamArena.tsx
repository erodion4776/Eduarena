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
  AlertCircle
} from 'lucide-react';
import { alocService } from '../lib/alocService';
import { aiTutor, ALOCQuestion, TutorResponse } from '../lib/aiTutor';

export default function ExamArena() {
  const [currentQuestion, setCurrentQuestion] = useState<ALOCQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<TutorResponse | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [subject, setSubject] = useState('english');
  const [examType, setExamType] = useState('jamb');

  useEffect(() => {
    fetchNewQuestion();
  }, []);

  const fetchNewQuestion = async () => {
    setLoading(true);
    setAiResponse(null);
    try {
      const q = await alocService.fetchLiveQuestion(subject, examType);
      setCurrentQuestion(q);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runNeuralAnalysis = async () => {
    if (!currentQuestion) return;
    setIsAiProcessing(true);
    setShowAiPanel(true);
    try {
      const res = await aiTutor.askTutorChuksLive("Explain this question and why the answer is correct.", currentQuestion);
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
          </div>
        </div>

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
                  </select>
                  <div className="w-px h-4 bg-zinc-800" />
                  <select 
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase p-2 focus:outline-none cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <option value="jamb">JAMB</option>
                    <option value="waec">WAEC</option>
                    <option value="neco">NECO</option>
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
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20">
                             {currentQuestion.examType} {currentQuestion.examyear}
                           </span>
                           <span className="text-zinc-600 font-mono text-[10px]">ID: {currentQuestion.id}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                          {currentQuestion.question}
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(currentQuestion.option).map(([key, value]) => (
                          <button 
                            key={key}
                            className="text-left bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group flex items-start gap-4"
                          >
                            <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black uppercase text-zinc-500 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 border border-transparent group-hover:border-emerald-500/20">
                              {key}
                            </span>
                            <span className="text-zinc-300 pt-1">{value}</span>
                          </button>
                        ))}
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
                      onClick={fetchNewQuestion}
                      disabled={loading}
                      className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-tighter hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      New Question
                    </button>

                    {/* --- STEP 3: THE AI BUTTON --- */}
                    <button 
                      onClick={runNeuralAnalysis}
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
                       "Explain this question and why the answer is correct."
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Terminal className="w-4 h-4 text-emerald-500" />
                       <span className="text-xs font-black uppercase text-emerald-500 tracking-widest">Tutor Output</span>
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
    </div>
  );
}
