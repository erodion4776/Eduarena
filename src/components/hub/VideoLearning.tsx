import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, ChevronLeft, FileText, MessageSquare, Download, Zap } from 'lucide-react';

export default function VideoLearning({ course, onBack, onStartPractice }: any) {
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/courses/${course.id}/lessons`).then(res => res.json()).then(data => {
      setLessons(data);
      if (data.length > 0) setCurrentLesson(data[0]);
    });
  }, [course.id]);

  if (!currentLesson) return null;

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 animate-in slide-in-from-right duration-500">
      <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500 hover:text-slate-900">
        <ChevronLeft className="w-4 h-4" /> Back to Hub
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-slate-100">
            <iframe 
              src={currentLesson.video_url} 
              className="w-full h-full" 
              allowFullScreen 
              title={currentLesson.title}
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600">{course.subject}</Badge>
                <span className="text-sm font-bold text-slate-400">Lesson {currentLesson.order} of {lessons.length}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">{currentLesson.title}</h1>
            </div>
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 rounded-2xl gap-2 shadow-lg shadow-green-600/20"
              onClick={() => onStartPractice(currentLesson)}
            >
              <Zap className="w-5 h-5" /> Take Practice Quiz
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Study Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">Comprehensive notes covering all key concepts in this lesson.</p>
                <Button variant="outline" className="w-full gap-2 border-slate-200">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">Join 124 other students discussing this topic.</p>
                <Button variant="outline" className="w-full border-slate-200">View Comments</Button>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm bg-blue-50/50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Next Up
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-bold text-slate-900">Linear Equations</p>
                <p className="text-xs text-slate-500">15 minutes • Video</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm h-[calc(100vh-200px)] flex flex-col rounded-[32px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Course Content</CardTitle>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[25%]" />
                </div>
                <span className="text-xs font-bold text-slate-400">25%</span>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {lessons.map((lesson: any) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all text-left group ${
                      currentLesson.id === lesson.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`mt-1 ${currentLesson.id === lesson.id ? 'text-white' : 'text-slate-300 group-hover:text-blue-600'}`}>
                      {completedLessons.includes(lesson.id) ? <CheckCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold leading-tight ${currentLesson.id === lesson.id ? 'text-white' : 'text-slate-900'}`}>
                        {lesson.title}
                      </div>
                      <div className={`text-xs mt-1 ${currentLesson.id === lesson.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {lesson.duration} • Video
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
