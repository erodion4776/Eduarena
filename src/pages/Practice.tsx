import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Zap, BookOpen, Brain, ChevronRight, BarChart3, Clock3, Lightbulb, GraduationCap, XCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/src/lib/supabase';

export default function Practice() {
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiTutorResponse, setAiTutorResponse] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  
  // Filters and state for navigation
  const [filters, setFilters] = useState({ exam: 'jamb', subject: 'biology', year: '2024' });
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Use Supabase to fetch questions from 'questions' table (assuming exists based on context)
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_body', filters.exam)
        .eq('subject', filters.subject)
        .limit(10);

      if (error) throw error;

      const fetchedQuestions = data || [];
      setQuestions(fetchedQuestions);
      setCurrentIndex(0);
      setQuestion(fetchedQuestions[0] || null);
    } catch (e) {
      console.error("Supabase fetch failed, falling back to ALOC API", e);
      // Fallback to ALOC API
      try {
        const res = await fetch(`/api/aloc/q?exam=${filters.exam}&subject=${filters.subject}&year=${filters.year}&limit=10`);
        const data = await res.json();
        const fetchedQuestions = Array.isArray(data) ? data : (data.data ? [data.data] : []);
        setQuestions(fetchedQuestions);
        setCurrentIndex(0);
        setQuestion(fetchedQuestions[0] || null);
      } catch (innerE) {
        console.error("ALOC API fallback failed", innerE);
      }
    } finally {
      setLoading(false);
    }
  };
  const fetchAITutor = async (type: string) => {
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
      setCurrentIndex(c => c + 1);
      setQuestion(questions[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      setQuestion(questions[currentIndex - 1]);
    }
  };
  const [sessionId] = useState(`sess-${Date.now()}`);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, time: 0 });
  const [timer, setTimer] = useState(3600); // 1 hour CBT mode

  useEffect(() => {
    const saved = sessionStorage.getItem('practice_cache');
    if (saved) {
        const parsed = JSON.parse(saved);
        setQuestion(parsed.question);
        setStats(parsed.stats);
    } else {
        fetchQuestion();
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('practice_cache', JSON.stringify({ question, stats }));
  }, [question, stats]);

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

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aloc/q?subject=biology&type=utme');
      const data = await res.json();
      setQuestion(data.data);
      setExplanation('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };


  const getAIResponse = async (type: string, userAnswer?: string) => {
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
  };

  useEffect(() => { fetchQuestion(); }, []);

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
          <div>
            <h1 className="text-lg md:text-xl font-black">CBT Exam Session: {filters.subject}</h1>
            <div className="flex gap-4 text-xs mt-2 text-zinc-400">
                <span>Subject: {filters.subject}</span>
                <span className="hidden md:inline">Exam: JAMB 2024</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1"><Clock3 className="w-3 h-3" /> {formatTime(timer)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-zinc-800 text-xs rounded-xl p-2 border border-white/10" value={filters.exam} onChange={e => setFilters({...filters, exam: e.target.value})}>
                <option value="jamb">JAMB</option>
                <option value="waec">WAEC</option>
                <option value="neco">NECO</option>
            </select>
            <Button variant="outline" className="rounded-xl border-white/10 text-xs" onClick={fetchQuestions}>Start</Button>
            <Progress value={45} className="w-24 md:w-48" />
            <Button variant="outline" className="rounded-xl border-white/10 text-xs md:text-sm">End</Button>
          </div>
        </header>

        {/* Practice Interface */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            {loading ? (
                <div className="text-zinc-500 font-medium">Loading question...</div>
            ) : question ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl space-y-6">
                    <Card className="bg-zinc-800 border-white/20 p-6 md:p-8 rounded-3xl shadow-xl">
                        <div className="text-xs font-bold text-cyan-300 mb-4 bg-cyan-950/50 px-3 py-1 inline-block rounded-md">QUESTION {currentIndex + 1} OF {questions.length}</div>
                        <div dangerouslySetInnerHTML={{ __html: question.question }} className="text-lg md:text-xl mb-8 font-medium text-white leading-relaxed" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(question.option).map(([key, val]) => (
                                <Button 
                                    key={key} 
                                    variant="outline" 
                                    className="justify-start p-4 md:p-6 h-auto text-left rounded-xl border-zinc-600 bg-zinc-900/50 hover:bg-zinc-700 transition-all text-sm md:text-base text-zinc-100"
                                    onClick={() => {
                                        const correct = key === question.answer;
                                        setStats(s => {
                                           const newStats = { ...s, [correct ? 'correct' : 'wrong']: s[correct ? 'correct' : 'wrong'] + 1 };
                                           return newStats;
                                        });
                                        getAIResponse('explanation', correct ? 'correct' : 'wrong');
                                        saveStats();
                                    }}
                                >
                                    <span className="font-bold mr-4 text-cyan-400 w-8 text-center">{key.toUpperCase()}</span> {val as string}
                                </Button>
                            ))}
                        </div>
                    </Card>
                    
                    {/* Toolkit Buttons & Navigation */}
                    <div className="flex items-center justify-between w-full mt-6">
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => fetchAITutor('hint')} className="rounded-xl text-xs"><Lightbulb className="w-4 h-4 mr-2" /> Hint</Button>
                            <Button variant="secondary" onClick={() => fetchAITutor('explanation')} className="rounded-xl text-xs"><GraduationCap className="w-4 h-4 mr-2" /> Step-by-Step</Button>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>Prev</Button>
                            <Button className="rounded-xl" onClick={handleNext} disabled={currentIndex === questions.length - 1}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                        </div>
                    </div>

                    {/* AI modal/popover simplified */}
                    {aiTutorResponse && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                            onClick={() => setAiTutorResponse(null)}
                        >
                            <Card className="bg-zinc-900 border-cyan-500/30 p-6 rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="font-black text-cyan-400 mb-4 flex items-center gap-2">
                                    <Brain className="w-5 h-5" /> AI Tutor Guidance
                                </h3>
                                <p className="text-zinc-200 leading-relaxed">{aiTutorResponse}</p>
                                <Button className="mt-6 w-full rounded-xl" onClick={() => setAiTutorResponse(null)}>Close</Button>
                            </Card>
                        </motion.div>
                    )}
                </motion.div>
            ) : null}
        </div>
      </main>

      {/* AI Tutor & Stats Sidebar - Hide on small screens, show as a fixed panel potentially? */}
      <aside className="hidden md:flex w-96 border-l border-white/10 bg-zinc-900/50 backdrop-blur-md p-6 flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl"><Brain className="w-6 h-6 text-purple-400" /></div>
            <h2 className="font-bold text-lg">AI Tutor</h2>
        </div>
        
        {explanation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-zinc-950 border border-emerald-500/20 text-emerald-100 text-sm leading-relaxed overflow-y-auto">
                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Zap className="w-4 h-4" /> AI Insight</h4>
                {explanation}
            </motion.div>
        )}

        {/* Live Stats */}
        <div className="mt-auto bg-zinc-900 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 font-bold"><BarChart3 className="w-5 h-5 text-cyan-400" /> Live Performance</div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl flex items-center gap-2 font-black text-emerald-400"><CheckCircle2 className="w-4 h-4" /> {stats.correct}</div>
                <div className="bg-zinc-950 p-4 rounded-xl flex items-center gap-2 font-black text-rose-400"><XCircle className="w-4 h-4" /> {stats.wrong}</div>
            </div>
        </div>
      </aside>
    </div>
  );
}
