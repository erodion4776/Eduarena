import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Sparkles, History, Target, Zap, 
  Filter, X, HelpCircle, Swords, BookOpen, 
  ArrowLeft, CheckCircle2, Bookmark, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library
import { toast } from 'sonner';
import { generateTutorial } from '@/src/services/geminiService';

// Math rendering libraries
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import AIHelpDesk from './AIHelpDesk';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// Nigerian exam board theming presets
const EXAM_BODIES = [
  { 
    id: 'JAMB', 
    name: 'JAMB', 
    fullName: 'Joint Admissions and Matriculation Board', 
    bodyColor: 'text-[#FACC15]', 
    theme: 'from-[#003566] to-[#001D3D]', 
    badgeBg: 'bg-[#FFD60A]/20', 
    badgeText: 'text-[#FFD60A]' 
  },
  { 
    id: 'WAEC', 
    name: 'WAEC', 
    fullName: 'West African Examinations Council', 
    bodyColor: 'text-white', 
    theme: 'from-[#052c1e] to-[#004b23]', 
    badgeBg: 'bg-white/20', 
    badgeText: 'text-white' 
  },
  { 
    id: 'NECO', 
    name: 'NECO', 
    fullName: 'National Examinations Council', 
    bodyColor: 'text-[#ef4444]', 
    theme: 'from-[#3c096c] to-[#240046]', 
    badgeBg: 'bg-red-500/20', 
    badgeText: 'text-red-400' 
  },
];

const SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government'];

// Safe offline default years so page loads beautifully even if server is offline
const FALLBACK_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012];

export default function ExamOracle() {
  // --- NAVIGATION & VIEW STATE ---
  const [view, setView] = useState<'hub' | 'explorer' | 'predictions'>('hub');
  const [isProfessorPanelOpen, setIsProfessorPanelOpen] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // --- FILTERING & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamBody, setSelectedExamBody] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('Biology');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  
  // --- DATA STATE ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>(FALLBACK_YEARS);
  
  // --- AI TUTOR & ACTIVE QUESTION STATE ---
  const [tutorialContent, setTutorialContent] = useState('');
  const [isGeneratingTutorial, setIsGeneratingTutorial] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<any>(null);

  // --- INITIAL LOAD: FETCH YEARS & SUBJECTS ---
  useEffect(() => {
    Promise.all([
      fetch('/api/oracle/years').then((res) => res.ok ? res.json() : FALLBACK_YEARS),
      fetch('/api/admin/subjects').then((res) => res.ok ? res.json() : SUBJECTS.map((s, i) => ({ id: i, name: s })))
    ])
      .then(([yearData, subjectData]) => {
        setYears(Array.isArray(yearData) && yearData.length > 0 ? yearData : FALLBACK_YEARS);
        setSubjects(Array.isArray(subjectData) && subjectData.length > 0 
          ? subjectData 
          : SUBJECTS.map((s, i) => ({ id: i, name: s }))
        );
      })
      .catch(() => {
        // Safe fallback to preloaded content if server is unreachable
        setYears(FALLBACK_YEARS);
        setSubjects(SUBJECTS.map((s, i) => ({ id: i, name: s })));
      });
  }, []);

  // --- REFRESH TOPICS WHEN SUBJECT SELECTION CHANGES ---
  useEffect(() => {
    if (!selectedSubject) return;

    const sub = subjects.find((s) => s.name === selectedSubject);
    if (!sub) return;

    fetch(`/api/oracle/topics?subject_id=${sub.id}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  }, [selectedSubject, subjects]);

  // --- SEARCH THE PAST QUESTION ARCHIVES ---
  const handleSearchArchive = () => {
    const sub = subjects.find((s) => s.name === selectedSubject);
    let url = `/api/oracle/search?subject_id=${sub?.id || ''}`;

    if (selectedExamBody) url += `&exam=${selectedExamBody}`;
    if (selectedYear) url += `&year=${selectedYear}`;
    if (selectedTopic) {
      const top = topics.find((t) => t.name === selectedTopic);
      if (top) url += `&topic_id=${top.id}`;
    }

    fetch(url)
      .then((res) => res.ok ? res.json() : { questions: [] })
      .then((data) => {
        setQuestions(data.questions || []);
        setView('explorer');
      })
      .catch(() => {
        toast.info("Loading available archive content...");
        setQuestions([]);
        setView('explorer');
      });
  };

  // --- DYNAMIC EXAM THEME COMPUTATION ---
  const currentTheme = useMemo(() => {
    const body = EXAM_BODIES.find((b) => b.id === selectedExamBody);
    return body || EXAM_BODIES[0];
  }, [selectedExamBody]);

  // --- LAUNCH AI TUTOR PANEL ---
  const openTutorial = async (topic: string) => {
    setSelectedTopic(topic);
    setIsProfessorPanelOpen(true);
    setIsGeneratingTutorial(true);
    setTutorialContent('');
    
    try {
      const res = await fetch(`/api/oracle/search?subject=${selectedSubject}&topic=${topic}&limit=5`);
      const data = await res.json();
      const content = await generateTutorial(topic, selectedSubject, data.questions || []);
      setTutorialContent(content || 'Content is being reviewed for this topic. Please check back later.');
    } catch (e) {
      setTutorialContent('AI Tutor is currently reviewing textbooks. Please try again shortly!');
    } finally {
      setIsGeneratingTutorial(false);
    }
  };

  // --- SEND TOPIC TO BATTLE ARENA ---
  const handleBattleTopic = (topic: string) => {
    window.dispatchEvent(
      new CustomEvent('navigate-to-arena', { detail: { topic, subject: selectedSubject } })
    );
    toast.success("Preparing arena for battle!", {
      description: `You'll be tested on: ${topic}`
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: THE HUB (Main Dashboard) */}
          {view === 'hub' && (
            <motion.div 
              key="hub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center space-y-6 py-12">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 px-4 py-1.5 rounded-full font-black text-xs tracking-widest uppercase mb-4 border-none">
                    The Ultimate Academic Archive
                  </Badge>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-none">
                    EXAM <span className="text-indigo-600 italic">ORACLE</span>
                  </h1>
                </motion.div>
                
                {/* Global search prompt */}
                <div className="max-w-2xl mx-auto relative group">
                  <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Input 
                    type="text"
                    placeholder="Find any question, topic, or year..."
                    className="h-16 md:h-20 bg-white shadow-2xl rounded-3xl border-none pl-14 md:pl-16 pr-6 text-base md:text-xl font-medium focus-visible:ring-indigo-500/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchArchive()}
                  />
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                </div>
              </div>

              {/* Exam Body Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {EXAM_BODIES.map((body) => (
                  <motion.div
                    key={body.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedExamBody(body.id);
                      handleSearchArchive();
                    }}
                    className={`cursor-pointer group relative overflow-hidden rounded-[40px] p-10 h-72 flex flex-col justify-between transition-all shadow-2xl hover:shadow-indigo-500/20 border-4 ${
                      selectedExamBody === body.id ? 'border-indigo-500/50' : 'border-white'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${body.theme} opacity-100 group-hover:scale-110 transition-transform duration-700`} />
                    <div className="absolute inset-0 bg-white/5" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="p-4 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <Badge className={`${body.badgeBg} ${body.badgeText} border-none font-black italic tracking-widest px-4 py-1.5`}>
                        1983 - 2025
                      </Badge>
                    </div>

                    <div className="relative z-10 space-y-2">
                      <h3 className={`text-5xl md:text-6xl font-black ${body.bodyColor} tracking-tighter leading-none group-hover:translate-x-2 transition-transform`}>
                        {body.name}
                      </h3>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] pl-1">
                        {body.fullName}
                      </p>
                    </div>

                    <div className="absolute bottom-0 right-0 p-8 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-4 transition-all duration-500">
                       <Zap className="w-12 h-12 text-white fill-white/20" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Timeline Year Selection Grid */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                    Timeline Archive
                  </h2>
                  <div className="flex gap-2">
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger className="w-40 md:w-56 bg-white rounded-xl font-bold uppercase text-[10px] tracking-widest">
                        <SelectValue placeholder="All Topics" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100">
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {years.map((y) => (
                    <motion.div
                      key={y}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedYear(String(y));
                        handleSearchArchive();
                      }}
                      className="cursor-pointer group bg-white p-6 rounded-[32px] shadow-sm hover:shadow-2xl border border-slate-100 transition-all flex flex-col items-center gap-2 relative overflow-hidden"
                    >
                      <div className="absolute -top-4 -right-4 p-8 bg-indigo-50/50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                      <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-600 transition-colors relative z-10">
                        {y}
                      </span>
                      
                      {/* Circular progress showing coverage completeness */}
                      <div className="flex flex-col items-center relative z-10">
                         <div className="relative w-12 h-12 mb-1">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="24" cy="24" r="20" fill="none" stroke="#f8fafc" strokeWidth="4" />
                              <circle 
                                cx="24" 
                                cy="24" 
                                r="20" 
                                fill="none" 
                                stroke="#6366f1" 
                                strokeWidth="4" 
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 20} 
                                strokeDashoffset={(2 * Math.PI * 20) * (1 - (y % 10) / 10)} 
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                              {(y % 10) * 10}%
                            </span>
                         </div>
                      </div>

                      {/* Subject Preview Tags */}
                      <div className="flex flex-wrap items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         {['M', 'E', 'P', 'B'].map((s) => (
                           <span key={s} className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                             {s}
                           </span>
                         ))}
                         <span className="text-[8px] font-bold text-slate-400">+3</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: QUESTION EXPLORER */}
          {view === 'explorer' && (
            <motion.div 
              key="explorer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Sidebar: Advanced Filters */}
              <div className="lg:col-span-3 space-y-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setView('hub')}
                  className="mb-4 hover:bg-slate-200 text-slate-600 font-black gap-2 -ml-2"
                >
                  <ArrowLeft className="w-4 h-4" /> BACK TO HUB
                </Button>

                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white">
                  <CardHeader className="p-6 border-b border-slate-100">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Filter className="w-4 h-4 text-indigo-600" /> Advanced Filter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* Subject Select */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Subject
                      </Label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="rounded-xl border-slate-200 h-12 font-bold">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Topic Buckets */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Topic Buckets
                      </Label>
                      <ScrollArea className="h-64 pr-4">
                        <div className="space-y-2">
                          <Button 
                            variant={selectedTopic === '' ? 'secondary' : 'ghost'} 
                            onClick={() => setSelectedTopic('')}
                            className="w-full justify-start rounded-xl font-bold text-xs"
                          >
                            All Topics
                          </Button>
                          {topics.map((t) => (
                            <Button
                              key={t.id}
                              variant={selectedTopic === t.name ? 'secondary' : 'ghost'}
                              onClick={() => setSelectedTopic(t.name)}
                              className="w-full justify-start rounded-xl font-bold text-xs text-left px-4 h-auto py-3 leading-snug"
                            >
                              {t.name}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Question Status Filters */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                       {['unattempted', 'failed', 'mastered', 'bookmarked'].map((status) => (
                         <div key={status} className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {status}
                            </span>
                            <Switch />
                         </div>
                       ))}
                    </div>

                    <Button 
                      className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl border-none"
                      onClick={handleSearchArchive}
                    >
                      Apply Filters
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Question List */}
              <div className="lg:col-span-9 space-y-8">
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentTheme.theme} flex items-center justify-center text-white shadow-lg shadow-indigo-200`}>
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight italic text-slate-900">
                        {currentTheme.name} <span className="text-slate-300">/</span> {selectedYear || 'All Years'}
                      </h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {selectedSubject} Question Bank
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                    <div className="flex flex-col items-center">
                      <Label htmlFor="mock-mode" className="text-[10px] font-black uppercase mb-1">
                        Mock Exam Mode
                      </Label>
                      <Switch 
                        id="mock-mode"
                        checked={isMockMode}
                        onCheckedChange={setIsMockMode}
                      />
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <div className="text-[10px] font-black text-slate-400 uppercase">Archive Count</div>
                      <div className="text-xl font-black text-slate-900">{questions.length}</div>
                    </div>
                  </div>
                </div>

                {/* Questions List Cards */}
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <Card className="p-12 text-center border-dashed border-slate-200 rounded-3xl bg-transparent">
                      <p className="text-slate-500 font-medium">
                        No questions match this filter yet. Adjust your criteria to explore more.
                      </p>
                    </Card>
                  ) : (
                    questions.map((q, idx) => (
                      <motion.div 
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      >
                        <Card className="border-none shadow-sm hover:shadow-xl transition-all rounded-[32px] overflow-hidden group bg-white">
                          <CardContent className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row gap-8">
                              <div className="flex-shrink-0 flex md:flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <span className="text-2xl font-black">#{idx + 1}</span>
                                </div>
                                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-bold text-[10px]">
                                  {q.year}
                                </Badge>
                              </div>
                              
                              <div className="flex-1 space-y-6">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] uppercase tracking-widest">
                                      {currentTheme.name}
                                    </Badge>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <Badge variant="outline" className="text-indigo-600 border-indigo-100 font-black text-[9px] uppercase tracking-widest">
                                      {q.topic}
                                    </Badge>
                                  </div>
                                  <Button size="icon" variant="ghost" className="rounded-full text-slate-400 hover:text-indigo-600">
                                    <Bookmark className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Question Content */}
                                <div className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {q.question_text}
                                  </ReactMarkdown>
                                </div>

                                {isMockMode ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     {Object.entries(q.options || {}).map(([label, text]: any) => (
                                       <Button 
                                         key={label} 
                                         variant="outline" 
                                         className="justify-start h-14 rounded-2xl font-bold border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700"
                                       >
                                         <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3 text-xs">
                                           {label}
                                         </span>
                                         {String(text)}
                                       </Button>
                                     ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl h-12 px-6 gap-2 shadow-lg shadow-indigo-100 italic border-none">
                                      <CheckCircle2 className="w-4 h-4" /> VIEW SOLUTION
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      onClick={() => {
                                        setActiveQuestion(q);
                                        openTutorial(q.topic);
                                      }}
                                      className="bg-slate-900 hover:bg-black text-white font-black rounded-xl h-12 px-6 gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest italic border-none"
                                    >
                                      <Zap className="w-4 h-4 text-indigo-400" /> AI TUTORIAL
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => handleBattleTopic(q.topic)}
                                      className="border-slate-200 text-slate-500 font-black rounded-xl h-12 px-6 gap-2 hover:bg-slate-50"
                                    >
                                      <Swords className="w-4 h-4" /> BATTLE TOPIC
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI TUTOR SIDE PANEL */}
        <Sheet open={isProfessorPanelOpen} onOpenChange={setIsProfessorPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-xl p-0 border-l border-slate-100 shadow-2xl overflow-hidden">
            <div className="h-full flex flex-col bg-white">
              
              {/* Panel Header Card */}
              <div className="p-8 md:p-12 bg-indigo-600 text-white space-y-4">
                <Badge className="bg-white/20 text-white border-none font-black italic tracking-widest text-[10px] uppercase">
                  AI Mastery Professor
                </Badge>
                <SheetHeader className="p-0 text-left">
                  <SheetTitle className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                    {selectedTopic || 'Concept Master'}
                  </SheetTitle>
                  <SheetDescription className="text-indigo-100 font-medium text-base md:text-lg leading-relaxed pt-2">
                    Reviewing exam trends and question patterns from {years.length}+ years of past papers.
                  </SheetDescription>
                </SheetHeader>
              </div>

              {/* Panel Body Content */}
              <ScrollArea className="flex-1 p-6 md:p-12">
                <div className="space-y-12 pb-20">
                  {isGeneratingTutorial ? (
                    <div className="space-y-8 animate-pulse">
                      <div className="h-8 w-1/3 bg-slate-100 rounded-lg" />
                      <div className="space-y-4">
                        <div className="h-4 w-full bg-slate-50 rounded-full" />
                        <div className="h-4 w-full bg-slate-50 rounded-full" />
                        <div className="h-4 w-5/6 bg-slate-50 rounded-full" />
                      </div>
                      <div className="h-32 w-full bg-slate-50 rounded-3xl" />
                      <div className="h-8 w-1/2 bg-slate-100 rounded-lg" />
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {tutorialContent}
                      </ReactMarkdown>

                      {/* Mock Challenge CTA within the Panel */}
                      <div className="mt-12 p-8 bg-slate-900 rounded-[32px] text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Target className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 space-y-2">
                          <h4 className="text-2xl font-black tracking-tighter italic uppercase">
                            Mock Challenge
                          </h4>
                          <p className="text-slate-400 font-medium italic text-sm">
                            Ready to test your mastery? Sample questions generated from the 2025 exam prediction model.
                          </p>
                        </div>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-2xl font-black text-lg gap-2 shadow-xl shadow-indigo-600/20 relative z-10 italic border-none">
                          <History className="w-6 h-6" /> START MOCK
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Panel Footer HUD */}
              <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                     <HelpCircle className="w-6 h-6" />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-slate-500 italic">
                    Questions left on this topic: 15
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  className="font-black text-indigo-600 group uppercase tracking-widest text-[10px]" 
                  onClick={() => setIsProfessorPanelOpen(false)}
                >
                  Close Panel <X className="ml-2 w-4 h-4 group-hover:rotate-180 transition-transform" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Floating AI Assistant chat pop */}
        <AIHelpDesk contextQuestion={activeQuestion} />
      </div>
    </div>
  );
}
