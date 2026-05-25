import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Zap, BookOpen, Brain, ChevronRight, BarChart3, Clock3, Lightbulb, GraduationCap, XCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/src/lib/supabase';

export default function Practice() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiTutorResponse, setAiTutorResponse] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  
  // Filters and state for navigation
  const [filters, setFilters] = useState({ exam: 'jamb', subject: 'biology', year: '2024' });
  const [sessionId] = useState(`sess-${Date.now()}`);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, time: 0 });
  const [timer, setTimer] = useState(3600); // 1 hour CBT mode

  // Standardize questions of different formats (Supabase vs ALOC vs Local API)
  const normalizeQuestion = (q: any) => {
    if (!q) return null;
    
    // Normalize question text (HTML or pure string)
    const questionText = q.question || q.question_text || q.question_content || '';
    
    // Normalize options object (ensure standard keys A, B, C, D)
    let optionsObj: Record<string, string> = {};
    if (q.option) {
      optionsObj = q.option;
    } else if (q.options) {
      optionsObj = q.options;
    }
    
    const normalizedOptions: Record<string, string> = {};
    Object.entries(optionsObj).forEach(([key, val]) => {
      normalizedOptions[key.toLowerCase().trim()] = val as string;
    });
    
    // Normalize correct answer key
    const rawAnswer = q.answer || q.correct_answer || q.correct_option || 'a';
    const answer = String(rawAnswer).toLowerCase().trim();
    
    // Normalize explanation
    const explanationText = q.explanation || q.solution || 'No explanation available.';
    
    return {
      ...q,
      question: questionText,
      option: normalizedOptions,
      answer: answer,
      explanation: explanationText
    };
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setExplanation('');
    setAiTutorResponse(null);
    try {
      let fetched: any[] = [];

      // 1. Try Supabase Ingestion Query first
      if (supabase) {
        console.log("Attempting Supabase retrieve for questions...");
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .ilike('subject', filters.subject)
          .ilike('exam_type', filters.exam)
          .limit(10);

        if (!error && data && data.length > 0) {
          fetched = data;
          console.log(`Successfully pulled ${data.length} questions from Supabase`);
        } else if (error) {
          console.warn("Supabase fetch failed, proceeding to ALOC API proxy", error);
        }
      }

      // 2. Fallback to ALOC API Proxy (fetches 10 questions)
      if (fetched.length === 0) {
        console.log("ALOC Ingestion Fallback proxy triggered...");
        const res = await fetch(`/api/aloc/q/10?subject=${filters.subject.toLowerCase()}&type=${filters.exam.toLowerCase()}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (Array.isArray(data.data)) {
              fetched = data.data;
            } else if (data.data) {
              fetched = [data.data];
            } else if (Array.isArray(data)) {
              fetched = data;
            }
          }
        }
      }

      // 3. Last Line of Defense: Local Server Static database
      if (fetched.length === 0) {
        console.log("Engaging local static questions database fallback...");
        const res = await fetch(`/api/questions?subject=${filters.subject}&exam_type=${filters.exam.toUpperCase()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            fetched = data;
          }
        }
      }

      // 4. Clean normalization check
      const normalized = fetched.map(normalizeQuestion).filter(Boolean);
      
      if (normalized.length > 0) {
        setQuestions(normalized);
        setCurrentIndex(0);
        setQuestion(normalized[0]);
        setUserAnswers({});
      } else {
        console.warn("Could not retrieve questions of selected subject from database.");
        setQuestions([]);
        setQuestion(null);
      }
    } catch (e) {
      console.error("Critical CBT pool retrieval error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAITutor = async (type: string) => {
    if (!question) return;
    setLoading(true);
    try {
        const response = await fetch('/api/practice/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question_text: question.question,
                correct_answer: question.answer,
                type,
                options: question.option
            })
        });
        const data = await response.json();
        setAiTutorResponse(data.response);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setQuestion(questions[nextIdx]);
      setExplanation('');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setQuestion(questions[prevIdx]);
      setExplanation('');
    }
  };

  // 1. Hydrate state on page load
  useEffect(() => {
    const saved = sessionStorage.getItem('practice_cache');
    if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.questions && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
            setCurrentIndex(parsed.currentIndex || 0);
            setQuestion(parsed.question || parsed.questions[parsed.currentIndex || 0]);
            setUserAnswers(parsed.userAnswers || {});
            setStats(parsed.stats || { correct: 0, wrong: 0, time: 0 });
          } else {
            fetchQuestions();
          }
        } catch (err) {
          console.error("Failed to restore practice cache", err);
          fetchQuestions();
        }
    } else {
        fetchQuestions();
    }
  }, []);

  // 2. Cache updates to sessionStorage
  useEffect(() => {
    if (questions.length > 0) {
      sessionStorage.setItem('practice_cache', JSON.stringify({ 
        questions, 
        currentIndex, 
        question, 
        userAnswers,
        stats 
      }));
    }
  }, [questions, currentIndex, question, userAnswers, stats]);

  const saveStats = async () => {
    await fetch('/api/practice/session/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sessionId,
            subject: filters.subject,
            finalScore: (stats.correct / (stats.correct + stats.wrong || 1)) * 100,
            totalQuestions: stats.correct + stats.wrong,
            xpEarned: stats.correct * 10,
            mistakes: stats.wrong
        })
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const getAIResponse = async (type: string, userAnswer?: string) => {
    if (!question) return;
    try {
      const res = await fetch('/api/practice/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question.question, 
          options: question.option, 
          userAnswer: userAnswer || type,
          type 
        })
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Main Practice Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Control Bar */}
        <header className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md">
          <div className="min-w-0 pr-4">
            <h1 className="text-lg md:text-xl font-black truncate capitalize">Practice Arena: {filters.subject}</h1>
            <div className="flex gap-4 text-xs mt-2 text-zinc-400">
                <span className="capitalize">Subject: {filters.subject}</span>
                <span className="hidden md:inline uppercase">Exam: {filters.exam} {filters.year}</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1 shrink-0">
                  <Clock3 className="w-3 h-3" /> {formatTime(timer)}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Subject Selector dropdown */}
            <select 
              className="bg-zinc-800 text-xs rounded-xl p-2 border border-white/10 text-white outline-none focus:border-cyan-500 max-w-[120px]"
              value={filters.subject} 
              onChange={e => setFilters({...filters, subject: e.target.value})}
            >
              <option value="mathematics">Mathematics</option>
              <option value="english">English</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="economics">Economics</option>
              <option value="government">Government</option>
            </select>

            {/* Exam Selector dropdown */}
            <select 
              className="bg-zinc-800 text-xs rounded-xl p-2 border border-white/10 text-white outline-none focus:border-cyan-400" 
              value={filters.exam} 
              onChange={e => setFilters({...filters, exam: e.target.value})}
            >
                <option value="jamb">JAMB</option>
                <option value="waec">WAEC</option>
                <option value="neco">NECO</option>
            </select>
            <Button variant="outline" className="rounded-xl border-cyan-500/30 text-cyan-400 bg-cyan-950/15 text-xs hover:bg-cyan-950/30 font-bold" onClick={fetchQuestions}>Start</Button>
            <Progress value={questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0} className="w-16 md:w-32" />
          </div>
        </header>

        {/* Practice Interface */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center no-scrollbar">
            {loading ? (
                <div className="text-zinc-500 font-medium flex items-center gap-2 animate-pulse self-center">
                  <Brain className="w-5 h-5 text-cyan-500 animate-spin" /> Fetching practice mock deck...
                </div>
            ) : question ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl space-y-6">
                    <Card className="bg-zinc-900 border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
                        
                        <div className="text-xs font-bold text-cyan-300 mb-4 bg-cyan-950/50 px-3 py-1.5 inline-block rounded-lg border border-cyan-500/20">
                          QUESTION {currentIndex + 1} OF {questions.length}
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: question.question }} className="text-base md:text-lg mb-8 font-medium text-zinc-100 leading-relaxed font-sans" />
                        
                        <div className="grid grid-cols-1 gap-3.5">
                            {Object.entries(question.option).map(([key, val]) => {
                                const isSelected = userAnswers[currentIndex] === key;
                                const isCorrect = key === question.answer;
                                const answered = userAnswers[currentIndex] !== undefined;

                                let borderClass = "border-white/5 bg-zinc-950/50 hover:bg-zinc-800 text-zinc-200";
                                if (answered) {
                                  if (isCorrect) {
                                    borderClass = "border-emerald-500/50 bg-emerald-950/20 text-emerald-300 ring-1 ring-emerald-500/20";
                                  } else if (isSelected) {
                                    borderClass = "border-rose-500/50 bg-rose-950/20 text-rose-300 ring-1 ring-rose-500/20";
                                  } else {
                                    borderClass = "border-zinc-800 bg-zinc-950/10 text-zinc-500 opacity-40 cursor-not-allowed";
                                  }
                                }

                                return (
                                    <button 
                                        key={key} 
                                        disabled={answered}
                                        className={`flex items-start outline-none justify-start p-4 h-auto text-left rounded-2xl border transition-all duration-200 text-sm md:text-base ${borderClass}`}
                                        onClick={() => {
                                            const correct = key === question.answer;
                                            
                                            setUserAnswers(prev => ({ ...prev, [currentIndex]: key }));
                                            
                                            setStats(s => {
                                               const newStats = { ...s, [correct ? 'correct' : 'wrong']: s[correct ? 'correct' : 'wrong'] + 1 };
                                               return newStats;
                                            });
                                            getAIResponse('explanation', correct ? 'correct' : 'wrong');
                                            saveStats();
                                        }}
                                    >
                                        <span className={`font-black mr-4 w-7 h-7 text-xs flex items-center justify-center rounded-lg border shrink-0 ${
                                          answered && isCorrect 
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                            : answered && isSelected 
                                              ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                                              : 'bg-zinc-900 border-white/10 text-cyan-400'
                                        }`}>
                                            {key.toUpperCase()}
                                        </span> 
                                        <span className="flex-1 self-center">{val as string}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                    
                    {/* Toolkit Buttons & Navigation */}
                    <div className="flex items-center justify-between w-full mt-6 bg-zinc-900/40 p-3 rounded-2xl border border-white/5">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => fetchAITutor('hint')} className="rounded-xl text-xs hover:bg-zinc-800 border-white/5 text-zinc-300">
                              <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Hint
                            </Button>
                            <Button variant="outline" onClick={() => fetchAITutor('explanation')} className="rounded-xl text-xs hover:bg-zinc-800 border-white/5 text-zinc-300">
                              <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Step-by-step logic
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              onClick={handlePrev} 
                              className="text-xs rounded-xl hover:bg-zinc-800" 
                              disabled={currentIndex === 0}
                            >
                              Prev
                            </Button>
                            
                            <Button 
                              className="rounded-xl text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold" 
                              onClick={handleNext} 
                              disabled={currentIndex === questions.length - 1}
                            >
                              Next <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </div>
                    </div>

                    {/* AI modal/popover simplified */}
                    {aiTutorResponse && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                            onClick={() => setAiTutorResponse(null)}
                        >
                            <Card className="bg-zinc-900 border border-cyan-500/30 p-6 rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="font-black text-cyan-400 mb-4 flex items-center gap-2 text-lg">
                                    <Brain className="w-5 h-5 text-cyan-400" /> AI Tutor Guidance
                                </h3>
                                <p className="text-zinc-200 leading-relaxed text-sm whitespace-pre-wrap">{aiTutorResponse}</p>
                                <Button className="mt-6 w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold" onClick={() => setAiTutorResponse(null)}>Ack & Close</Button>
                            </Card>
                        </motion.div>
                    )}
                </motion.div>
            ) : (
                <div className="self-center flex flex-col items-center gap-4 text-center max-w-sm p-6 bg-zinc-900/50 rounded-3xl border border-white/5">
                  <XCircle className="w-10 h-10 text-rose-500/80" />
                  <div>
                    <h3 className="font-extrabold text-white text-base">No questions found</h3>
                    <p className="text-zinc-400 text-xs mt-1">Please select a different syllabus category or click "Start" above to retry fetching.</p>
                  </div>
                  <Button onClick={fetchQuestions} className="rounded-xl w-full bg-cyan-600 hover:bg-cyan-500">Retry Ingestion</Button>
                </div>
            )}
        </div>
      </main>

      {/* AI Tutor & Stats Sidebar */}
      <aside className="hidden lg:flex w-96 border-l border-white/10 bg-zinc-900/30 backdrop-blur-xl p-6 flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-2xl border border-purple-500/20"><Brain className="w-5 h-5 text-purple-400" /></div>
            <h2 className="font-extrabold text-base">AI Copilot Feed</h2>
        </div>
        
        {explanation ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-zinc-950/80 border border-emerald-500/20 text-emerald-100 text-sm leading-relaxed overflow-y-auto max-h-[400px]">
                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> AI Diagnostic</h4>
                {explanation}
            </motion.div>
        ) : (
            <div className="text-center p-6 bg-zinc-950/30 rounded-2xl border border-dashed border-white/5 text-zinc-500 text-xs">
              Answer the active question to stream detailed syllabus diagnostic and model calculations here.
            </div>
        )}

        {/* Live Stats */}
        <div className="mt-auto bg-zinc-900 p-5 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-zinc-300 text-xs uppercase tracking-widest"><BarChart3 className="w-4 h-4 text-cyan-400" /> Performance Analytics</div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-emerald-500/5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">CORRECT</span>
                  <span className="font-mono text-2xl font-black text-emerald-400">{stats.correct}</span>
                </div>
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-rose-500/5 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">WRONG</span>
                  <span className="font-mono text-2xl font-black text-rose-400">{stats.wrong}</span>
                </div>
            </div>
        </div>
      </aside>
    </div>
  );
}
