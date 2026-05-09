import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, ChevronRight, MessageSquare, Brain, Eye, EyeOff, Filter, BookOpen } from 'lucide-react';
import { useThemeStore } from '@/src/store/useThemeStore';
import { useAIStore } from '@/src/store/useAIStore';
import { getGroupedQuestions, ENGLISH_ARCHIVE, JambQuestion } from '@/src/data/englishArchive';

export default function KnowledgeHub() {
  const { mode } = useThemeStore();
  const { toggleChat, addMessage, isChatOpen } = useAIStore();
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | 'All'>('All');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const groupedData = useMemo(() => getGroupedQuestions(), []);
  const allYears = useMemo(() => ['All', ...groupedData.map(g => g.year)], [groupedData]);

  const filteredQuestions = useMemo(() => {
    let results = ENGLISH_ARCHIVE;

    if (selectedYear !== 'All') {
      results = results.filter(q => q.examyear === selectedYear);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      results = results.filter(q => 
        q.question.toLowerCase().includes(query) ||
        q.section.toLowerCase().includes(query)
      );
    }

    return results;
  }, [search, selectedYear]);

  const toggleReveal = (id: number) => {
    setRevealedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const discussWithTutor = (q: JambQuestion) => {
    const text = `Tutor Chuks, explain question ${q.id} from the ${q.examyear} exam. It asks about: "${q.question.replace(/<[^>]*>?/gm, '')}"`;
    addMessage({
      id: Date.now().toString(),
      sender: 'student',
      text,
      timestamp: Date.now()
    });
    if (!isChatOpen) toggleChat();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar: Year Filter */}
      <aside className="w-64 border-r border-cyan-500/20 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
            <BookOpen className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Archives</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {allYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 border ${
                selectedYear === year 
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className="font-medium">{year === 'All' ? 'Full Archive' : `Class of ${year}`}</span>
              {selectedYear === year && (
                <motion.div layoutId="active-dot" className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950">
        {/* Header: Search */}
        <header className="p-8 border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">The Collective Library</h1>
              <p className="text-slate-400 text-sm font-medium tracking-wide">Hardcoded Engine. Zero Latency. Pure Knowledge.</p>
            </div>
            
            <div className="relative group w-full md:w-96">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <Input 
                  placeholder="Scan question bank..." 
                  className="pl-12 py-6 bg-slate-900/80 border-white/10 rounded-2xl focus:ring-2 focus:ring-cyan-500/30 transition-all text-white placeholder:text-slate-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden backdrop-blur-sm group">
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 px-3 py-1 text-[10px] uppercase font-black tracking-tighter">
                            JAMB ENGLISH - {q.examyear}
                          </Badge>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: #{q.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">VERIFIED</Badge>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        {/* Section/Passage */}
                        {q.section && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-cyan-400/5 blur-xl rounded-2xl" />
                            <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                              <div className="flex items-center gap-2 mb-3 text-cyan-400 font-black text-[10px] uppercase tracking-widest">
                                <BookOpen className="w-3 h-3" /> Instruction/Passage
                              </div>
                              <p 
                                className="text-slate-300 text-sm leading-relaxed italic"
                                dangerouslySetInnerHTML={{ __html: q.section }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Question */}
                        <div className="space-y-4">
                          <h3 
                            className="text-xl md:text-2xl font-bold text-slate-100 leading-tight"
                            dangerouslySetInnerHTML={{ __html: q.question }}
                          />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(q.option).map(([key, value]) => {
                            if (!value || key === 'e') return null;
                            const isCorrect = revealedAnswers[q.id] && q.answer.toLowerCase() === key.toLowerCase();
                            return (
                              <div 
                                key={key}
                                className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${
                                  isCorrect 
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                                    : 'bg-white/[0.03] border-white/5 text-slate-400'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm uppercase ${
                                  isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {key}
                                </div>
                                <span className="font-medium text-sm">{value}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-4 pt-4">
                          <Button 
                            onClick={() => toggleReveal(q.id)}
                            className={`flex-1 md:flex-none h-12 gap-2 rounded-xl font-bold shadow-lg transition-all ${
                              revealedAnswers[q.id] 
                                ? 'bg-white text-slate-950 hover:bg-slate-200' 
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            }`}
                          >
                            {revealedAnswers[q.id] ? (
                              <><EyeOff className="w-4 h-4" /> Hide Solution</>
                            ) : (
                              <><Eye className="w-4 h-4" /> Reveal Answer & Tutor Logic</>
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => discussWithTutor(q)}
                            className="flex-1 md:flex-none h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2 rounded-xl group"
                          >
                            <MessageSquare className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                            Discuss with Tutor Chuks
                          </Button>
                        </div>

                        {/* Reveal Panel */}
                        <AnimatePresence>
                          {revealedAnswers[q.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-6 p-6 rounded-2xl bg-white/[0.03] border-l-4 border-emerald-500 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase">
                                  <Brain className="w-4 h-4" /> Tutor Chuks Insight
                                </div>
                                
                                <div className="flex gap-4">
                                  <div className="w-12 h-12 shrink-0 rounded-full bg-cyan-500/20 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                                     <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Chuks" alt="Tutor" />
                                  </div>
                                  <div className="space-y-2">
                                     <div className="p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-slate-800 text-slate-200 text-sm leading-relaxed">
                                       {q.solution || "This follows standard grammatical rules for this sub-category. Let's break it down further if you need clarification!"}
                                     </div>
                                     <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                                       Correct Key: <span className="text-xl ml-1">{q.answer.toUpperCase()}</span>
                                     </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="py-40 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,211,238,0.1)]">
                   <Filter className="w-10 h-10 text-slate-700" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-white">No matches found</h3>
                   <p className="text-slate-500 max-w-sm mx-auto mt-2">Adjust your search or filters to scanning different nodes in the collective library.</p>
                </div>
                <Button onClick={() => { setSearch(''); setSelectedYear('All'); }} variant="link" className="text-cyan-400">Clear all filters</Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.2);
        }
      `}</style>
    </div>
  );
}
