import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Sparkles, History, Target, ChevronRight, Zap, Filter, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateTutorial, generateMockQuestions } from '@/src/services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import AIHelpDesk from './AIHelpDesk';

export default function ExamOracle() {
  const [view, setView] = useState<'browse' | 'tutor' | 'mock' | 'predictions' | 'time-machine'>('time-machine');
  const [exam, setExam] = useState('JAMB');
  const [subject, setSubject] = useState('Biology');
  const [year, setYear] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [tutorial, setTutorial] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockExam, setMockExam] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [currentQuestionForAI, setCurrentQuestionForAI] = useState<any>(null);

  useEffect(() => {
    fetch('/api/oracle/years')
      .then(res => res.json())
      .then(setYears);
  }, []);

  useEffect(() => {
    fetch(`/api/oracle/topics?subject=${subject}`)
      .then(res => res.json())
      .then(setTopics);
  }, [subject]);

  const handleSearch = () => {
    let url = `/api/oracle/search?exam=${exam}&subject=${subject}`;
    if (year) url += `&year=${year}`;
    if (selectedTopic) url += `&topic=${selectedTopic}`;
    
    fetch(url)
      .then(res => res.json())
      .then(setQuestions);
  };

  const handleStudyWithAI = async (topic: string) => {
    setSelectedTopic(topic);
    setView('tutor');
    setIsGenerating(true);
    setTutorial('');
    
    try {
      // Fetch some past questions for context
      const contextRes = await fetch(`/api/oracle/search?subject=${subject}&topic=${topic}`);
      const contextQuestions = await contextRes.json();
      
      const content = await generateTutorial(topic, subject, contextQuestions);
      setTutorial(content || 'Failed to generate tutorial.');
    } catch (e) {
      setTutorial('Error connecting to AI Tutor.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartMock = async () => {
    setView('mock');
    setIsGenerating(true);
    setMockExam([]);
    try {
      const qs = await generateMockQuestions(selectedTopic || 'General', subject, 10);
      setMockExam(qs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
              Exam <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">Oracle</span>
            </h1>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
            40 Years of Past Questions • AI Mastery Engine
          </p>
        </div>

        <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
          {[
            { id: 'time-machine', icon: History, label: 'Time Machine' },
            { id: 'browse', icon: Search, label: 'Search Archive' },
            { id: 'tutor', icon: Zap, label: 'AI Tutorial' },
            { id: 'mock', icon: Timer, label: 'Mock Exam' },
            { id: 'predictions', icon: Target, label: '2025 Prediction' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
                view === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {view === 'time-machine' && (
        <div className="space-y-12">
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <h2 className="text-4xl font-black italic text-slate-900 tracking-tighter">SELECT YOUR <span className="text-indigo-600">ERA</span></h2>
            <p className="text-slate-500 font-medium">Navigate 40 years of academic history with one tap.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 overflow-y-auto max-h-[600px] p-4 custom-scrollbar">
            {years.map(y => (
              <motion.button
                key={y}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setYear(String(y));
                  setView('browse');
                  handleSearch();
                }}
                className="group relative h-32 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 flex flex-col items-center justify-center transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10">
                  <Badge className="bg-slate-900 text-white font-black">{y >= 2000 ? '2K' : '80s/90s'}</Badge>
                </div>
                <span className="text-2xl font-black text-slate-300 group-hover:text-indigo-600 transition-colors">{y}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-indigo-400">Vault Archive</span>
                <div className="absolute bottom-3 w-1.5 h-1.5 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {view === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters */}
          <Card className="lg:col-span-1 border-none shadow-xl rounded-[32px] overflow-hidden bg-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 group">
                <Filter className="w-5 h-5 text-indigo-600 group-hover:rotate-12 transition-transform" />
                Vault Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Type</label>
                <div className="flex flex-wrap gap-2">
                  {['JAMB', 'WAEC', 'NECO'].map(e => (
                    <button
                      key={e}
                      onClick={() => setExam(e)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        exam === e ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {['Biology', 'Mathematics', 'Physics', 'Chemistry', 'English', 'Govt', 'Economics'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year (1983-2025)</label>
                <Input 
                  type="number" 
                  placeholder="e.g. 1998" 
                  className="rounded-xl border-slate-200"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  <option value="">All Topics</option>
                  {topics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleSearch}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl py-6 gap-2 shadow-xl shadow-indigo-200"
              >
                <Search className="w-5 h-5" /> EXPLORE VAULT
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 italic">
                {questions.length > 0 ? `${questions.length} Results Found` : "Select filters to start exploration"}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questions.map((q) => (
                <Card key={q.id} className="border-none shadow-sm hover:shadow-xl transition-all rounded-3xl overflow-hidden group">
                  <CardContent className="p-6 md:p-8 flex gap-6">
                    <div className="hidden md:flex flex-shrink-0 flex-col items-center gap-2">
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                        <Book className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[10px]">{q.year}</Badge>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{q.exam} - {q.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-xs font-bold text-slate-400">{q.topic}</span>
                        </div>
                        <Badge variant="outline" className={`border-2 font-black text-[10px] ${
                          q.difficulty === 'Hard' ? 'text-red-500 border-red-100' : 'text-green-500 border-green-100'
                        }`}>
                          {q.difficulty}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-slate-900 leading-snug">
                        {q.question_text}
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <Button 
                          variant="secondary" 
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-black text-xs gap-2"
                          onClick={() => {
                            setCurrentQuestionForAI(q);
                            handleStudyWithAI(q.topic);
                          }}
                        >
                          <Sparkles className="w-4 h-4" /> MASTER TOPIC
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="text-slate-400 font-bold text-xs hover:text-slate-900"
                          onClick={() => setCurrentQuestionForAI(q)}
                        >
                          View Solution <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {questions.length === 0 && (
                <div className="text-center p-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                  <History className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 italic">Vault Locked</h3>
                  <p className="text-slate-500 font-medium">Use the filters or the Time Machine to unlock questions from 1983 - 2025.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'tutor' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
          <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-700 p-10 text-white flex flex-row items-center justify-between">
              <div className="space-y-2">
                <Badge className="bg-white/20 text-white border-none font-black italic">AI MASTERY ENGINE</Badge>
                <CardTitle className="text-4xl font-black tracking-tight">{selectedTopic || 'Select a Topic'}</CardTitle>
                <p className="text-indigo-100 font-medium">Personalized Exam Strategy & Tutorial</p>
              </div>
              <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md">
                <Zap className="w-12 h-12 text-white animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="p-10 prose prose-indigo max-w-none">
              {isGenerating ? (
                <div className="space-y-8">
                  <div className="h-6 w-3/4 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-24 w-full bg-slate-100 rounded-3xl animate-pulse" />
                  <div className="h-6 w-1/2 bg-slate-100 rounded-full animate-pulse" />
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-slate-50 rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-slate-50 rounded-full animate-pulse" />
                    <div className="h-4 w-5/6 bg-slate-50 rounded-full animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{tutorial}</ReactMarkdown>
                  <div className="mt-12 pt-12 border-t border-slate-100 flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-xl mb-1">Knowledge Check</h4>
                      <p className="text-slate-500 font-medium">Test your mastery with AI-generated 2025 predicted questions.</p>
                    </div>
                    <Button 
                      onClick={handleStartMock}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-8 px-10 rounded-3xl text-lg shadow-xl shadow-indigo-200 gap-3"
                    >
                      <Timer className="w-6 h-6" /> START MOCK EXAM
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'mock' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between px-6">
            <h2 className="text-2xl font-black italic text-slate-900">
              Mock Exam: <span className="text-indigo-600">{selectedTopic || subject}</span>
            </h2>
            <div className="flex items-center gap-3 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black shadow-sm border border-red-100">
              <Timer className="w-5 h-5" /> 15:00
            </div>
          </div>

          {isGenerating ? (
            <div className="p-20 text-center space-y-6">
              <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-2xl font-black text-slate-900 italic">Assembling your 2025 Prediction...</h3>
              <p className="text-slate-500 font-medium">Combining past paper logic with AI-generated frequency models.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mockExam.map((q, i) => (
                <Card key={i} className="border-none shadow-xl rounded-[32px] overflow-hidden group">
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-600 uppercase text-xs tracking-widest">Question {i + 1}</span>
                      {q.is_predicted_2025 && (
                        <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] gap-1">
                          <Target className="w-3 h-3" /> 2025 PREDICTION
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-bold text-slate-900">{q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options.map((opt: string, idx: number) => (
                        <button 
                          key={idx}
                          className="p-5 border-2 border-slate-100 rounded-2xl text-left font-bold text-slate-600 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all hover:text-indigo-600 group/opt"
                        >
                          <span className="inline-block w-8 h-8 rounded-lg bg-slate-50 group-hover/opt:bg-indigo-100 flex items-center justify-center mr-3 text-xs">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="py-12">
                <Button className="w-full bg-slate-900 hover:bg-black text-white py-10 rounded-[32px] font-black text-xl shadow-2xl">
                  SUBMIT EXAM FOR SCORING
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'predictions' && (
         <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <Badge className="bg-indigo-600 text-white border-none font-black italic px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px]">
                Proprietary AI Frequency Model
              </Badge>
              <h2 className="text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
                2025 Exam <span className="text-indigo-600 underline">Crystal Ball</span>
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                Based on 40 years of data (1983-2024), here is what our AI predicts for your upcoming exams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Highest Probability Topic', val: 'Photosynthesis', prob: '94%', icon: <Target /> },
                { label: 'Recurring Year Cycle', val: '1998 JAMB Logic', prob: '82%', icon: <History /> },
                { label: 'New Syllabus Focus', val: 'Biotechnology', prob: '78%', icon: <Zap /> }
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-2xl rounded-[32px] p-8 text-center bg-white space-y-4 group hover:scale-105 transition-transform duration-500">
                  <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {React.cloneElement(stat.icon as React.ReactElement<any>, { className: "w-8 h-8" })}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <h4 className="text-2xl font-black text-slate-900 leading-tight">{stat.val}</h4>
                  </div>
                  <div className="text-indigo-600 font-black text-3xl italic">{stat.prob}</div>
                </Card>
              ))}
            </div>

            <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-slate-900 text-white relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 opacity-20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-12 space-y-8 relative z-10">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black italic tracking-tight uppercase">AI Mastery Blueprint 2025</h3>
                  <div className="w-20 h-1.5 bg-indigo-600 rounded-full" />
                </div>
                
                <div className="space-y-6">
                  {['Focus 70% of study time on the "Recurrence King" topics (Genetics, Energy, Ecology).', 'Beware of "The Distractor Pattern": 2024 results suggest examiners are pivoting to image-based logic for WAEC Biology.', 'Confidence Score: 91% for Biology Paper 1'].map((tip, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs font-black">
                        {i + 1}
                      </div>
                      <p className="text-indigo-100 font-medium leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
         </div>
      )}
      <AIHelpDesk contextQuestion={currentQuestionForAI} />
    </div>
  );
}
