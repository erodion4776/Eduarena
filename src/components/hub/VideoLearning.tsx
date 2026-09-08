import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, ChevronLeft, FileText, MessageSquare, Download, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Clean rules contract for lessons
interface Lesson {
  id: string;
  title: string;
  video_url: string;
  order: number;
  duration: string;
}

interface Course {
  id: string;
  subject: string;
}

interface VideoLearningProps {
  course?: Course;
  onBack: () => void;
  onStartPractice: (lesson: Lesson) => void;
}

// Starter content shown if the server database API is temporarily disconnected
const FALLBACK_LESSONS: Lesson[] = [
  {
    id: "lesson-1",
    title: "Introduction to Quadratic Equations",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Replace with actual course video embed URLs
    order: 1,
    duration: "12 mins"
  },
  {
    id: "lesson-2",
    title: "Solving Equations using Factoring Method",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    order: 2,
    duration: "18 mins"
  }
];

export default function VideoLearning({ course, onBack, onStartPractice }: VideoLearningProps) {
  // --- SAFE FALLBACKS ---
  const activeCourse = course || { id: "default-course-id", subject: "Mathematics" };

  // --- STATE MANAGEMENT ---
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  // --- FETCH COURSE MODULES ---
  useEffect(() => {
    fetch(`/api/courses/${activeCourse.id}/lessons`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not reach course database.");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLessons(data);
          setCurrentLesson(data[0]);
        } else {
          // If server returns empty list, load fallbacks
          setLessons(FALLBACK_LESSONS);
          setCurrentLesson(FALLBACK_LESSONS[0]);
        }
      })
      .catch((err) => {
        // Fallback gracefully so students can preview lessons while building offline
        setLessons(FALLBACK_LESSONS);
        setCurrentLesson(FALLBACK_LESSONS[0]);
      });
  }, [activeCourse.id]);

  // --- ACTION HANDLERS ---
  const handleDownloadNotes = () => {
    toast.success("Download Started!", {
      description: "We are assembling your study notes PDF now."
    });
  };

  const handleViewComments = () => {
    toast.info("Opening Study Discussion Boards...", {
      description: "Connecting with other scholars studying this topic."
    });
  };

  const toggleLessonCompletion = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const isAlreadyCompleted = prev.includes(lessonId);
      if (isAlreadyCompleted) {
        toast("Marked as incomplete");
        return prev.filter((id) => id !== lessonId);
      } else {
        toast.success("Lesson Complete!", {
          description: "Keep going to build up your master score progress!"
        });
        return [...prev, lessonId];
      }
    });
  };

  // --- REAL-TIME DYNAMIC PROGRESS CALCULATIONS ---
  const totalLessonsCount = lessons.length || 1;
  const progressPercent = Math.round((completedLessons.length / totalLessonsCount) * 100);

  // --- LOADING PLACEHOLDER SCREEN ---
  if (!currentLesson) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 text-center space-y-6">
        <Card className="p-16 border-none bg-slate-900/10">
          <p className="text-slate-500 font-medium animate-pulse">Pre-buffering learning assets...</p>
        </Card>
      </div>
    );
  }

  // Find the details of the upcoming lesson to tease in the "Next Up" preview card
  const nextUpIndex = lessons.findIndex((l) => l.id === currentLesson.id) + 1;
  const nextLesson = lessons[nextUpIndex] || null;

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 animate-in slide-in-from-right duration-300 text-slate-900">
      
      {/* Back Button HUD */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100/50">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Player & Study Tools Card */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Main Video Frame player */}
          <div className="aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-white shadow-slate-200/50">
            <iframe 
              src={currentLesson.video_url} 
              className="w-full h-full" 
              allowFullScreen 
              title={currentLesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>

          {/* Current Lesson Title Details Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 hover:bg-blue-600 border-none text-white font-bold">{activeCourse.subject}</Badge>
                <span className="text-xs font-bold text-slate-400">
                  Lesson {currentLesson.order} of {lessons.length}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">{currentLesson.title}</h1>
            </div>
            
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-6 rounded-2xl gap-2 border-none transition-all shadow-lg shadow-green-600/20 shrink-0"
              onClick={() => onStartPractice(currentLesson)}
            >
              <Zap className="w-5 h-5 fill-current" /> Take Practice Quiz
            </Button>
          </div>

          {/* Secondary Study Cards widgets row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Study Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Comprehensive review guides summarizing core lecture takeaways.</p>
                <Button variant="outline" onClick={handleDownloadNotes} className="w-full gap-2 border-slate-200 hover:bg-slate-50">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Class Debate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Join group chat channels with fellow study room peers.</p>
                <Button variant="outline" onClick={handleViewComments} className="w-full border-slate-200 hover:bg-slate-50">
                  Join Discussion
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm bg-blue-50/50 border-blue-100 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Coming Up Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextLesson ? (
                  <>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{nextLesson.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{nextLesson.duration} • Module {nextLesson.order}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-900">Congratulations!</p>
                    <p className="text-xs text-slate-500 mt-1">You reached the end of this course syllabus.</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Playlist Content sidebar selection cards */}
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm h-full max-h-[750px] flex flex-col rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">
                Course Outline
              </CardTitle>
              
              {/* Dynamic Progress tracker meter */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">{progressPercent}%</span>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {lessons.map((lesson: Lesson) => {
                  const isActive = currentLesson.id === lesson.id;
                  const isChecked = completedLessons.includes(lesson.id);

                  return (
                    <div
                      key={lesson.id}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all relative ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                          : 'hover:bg-slate-100/70 text-slate-600 bg-white'
                      }`}
                    >
                      {/* Check completed/incomplete lessons */}
                      <button
                        onClick={() => toggleLessonCompletion(lesson.id)}
                        className={`mt-0.5 shrink-0 transition-colors focus:outline-none ${
                          isActive 
                            ? 'text-white hover:text-blue-200' 
                            : 'text-slate-300 hover:text-blue-600'
                        }`}
                        title={isChecked ? "Mark as Incomplete" : "Mark as Completed"}
                      >
                        {isChecked ? (
                          <CheckCircle className="w-5 h-5 fill-current text-green-400" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>

                      {/* Clickable Lesson body selector */}
                      <button
                        onClick={() => setCurrentLesson(lesson)}
                        className="flex-1 text-left focus:outline-none min-w-0"
                      >
                        <div className={`text-sm font-bold leading-tight ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}>
                          {lesson.title}
                        </div>
                        <div className={`text-xs mt-1 ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}>
                          {lesson.duration} • Lecture
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>

      </div>
    </div>
  );
}
