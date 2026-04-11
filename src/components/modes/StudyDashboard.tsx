import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Play, FileText, Clock, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import TextbookSearch from '../solutions/TextbookSearch';

export default function StudyDashboard() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch('/api/content').then(res => res.json()).then(setCourses);
  }, []);

  const handleSelectSolution = (id: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-solution', { detail: { solutionId: id } }));
  };

  const handleSelectTextbook = (id: string) => {
    // For now, just navigate to solutions tab
    window.dispatchEvent(new CustomEvent('navigate-to-solution', { detail: { solutionId: null } }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <header className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome back, Scholar</h1>
          <p className="text-slate-500 text-lg">Continue your journey to mastery.</p>
        </div>
        
        {/* Prominent Search Bar */}
        <div className="max-w-3xl">
          <TextbookSearch onSelectSolution={handleSelectSolution} onSelectTextbook={handleSelectTextbook} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Active Courses
              </h2>
              <Button variant="link" className="text-blue-600">View All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course: any) => (
                <Card key={course.id} className="group hover:shadow-md transition-all border-slate-200">
                  <CardContent className="p-0">
                    <div className="h-32 bg-slate-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                      <BookOpen className="w-12 h-12 text-blue-200" />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{course.subject}</span>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Clock className="w-3 h-3" />
                          2h left
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 leading-tight">{course.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{course.description}</p>
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2">
                        {course.type === 'video' ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        Continue Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-600 text-white border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-24 h-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">12 / 20 hrs</div>
              <div className="w-full bg-blue-400/30 h-2 rounded-full overflow-hidden">
                <div className="bg-white h-full w-[60%]" />
              </div>
              <p className="text-sm text-blue-100">You're doing great! 8 more hours to reach your goal.</p>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Upcoming Tasks</h2>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">Calculus Quiz {i}</div>
                    <div className="text-xs text-slate-500">Due in 2 days</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import { Trophy } from 'lucide-react';
