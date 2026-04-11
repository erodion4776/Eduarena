import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Book, Play, HelpCircle, Filter, ChevronRight, Bookmark } from 'lucide-react';
import { useThemeStore } from '@/src/store/useThemeStore';

export default function KnowledgeHub({ onSelectCourse, onSelectQuestion }: any) {
  const { mode } = useThemeStore();
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'questions'>('courses');

  useEffect(() => {
    fetch('/api/courses').then(res => res.json()).then(setCourses);
    fetch('/api/questions').then(res => res.json()).then(setQuestions);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/questions?search=${search}`);
    const data = await res.json();
    setQuestions(data);
    setActiveTab('questions');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-4xl font-black tracking-tight ${mode === 'arena' ? 'text-green-500' : 'text-slate-900'}`}>
              Knowledge Hub
            </h1>
            <p className="text-slate-500 text-lg">Your central engine for learning and practice.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-4 py-1 border-blue-200 text-blue-600">JAMB 2026</Badge>
            <Badge variant="outline" className="px-4 py-1 border-green-200 text-green-600">WAEC 2026</Badge>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input 
            placeholder="Search for topics, questions, or subjects (e.g. 'Calculus', 'Photosynthesis')..." 
            className="pl-12 py-8 text-lg rounded-2xl border-2 border-slate-100 focus:border-blue-600 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-xl px-6">
            Search
          </Button>
        </form>
      </header>

      <div className="flex gap-4 border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('courses')}
          className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'courses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          Courses
        </button>
        <button 
          onClick={() => setActiveTab('questions')}
          className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'questions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          Q&A Bank
        </button>
      </div>

      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <Card key={course.id} className="group hover:shadow-xl transition-all border-slate-100 overflow-hidden cursor-pointer" onClick={() => onSelectCourse(course)}>
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <img src={`https://picsum.photos/seed/${course.subject}/800/400`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                <Badge className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white border-white/30">{course.subject}</Badge>
              </div>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Play className="w-3 h-3" /> 12 Lessons
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                    Start Learning <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q: any) => (
            <Card key={q.id} className="hover:border-blue-200 transition-all cursor-pointer group" onClick={() => onSelectQuestion(q)}>
              <CardContent className="p-6 flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">{q.exam_type}</Badge>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{q.subject}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{q.question_text}</h3>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs font-bold text-slate-400">Difficulty: <span className="text-blue-600">{q.difficulty}</span></span>
                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-blue-600">
                      <Bookmark className="w-4 h-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 self-center" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
