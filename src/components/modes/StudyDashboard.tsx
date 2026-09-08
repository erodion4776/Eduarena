import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Play, 
  FileText, 
  Clock, 
  ChevronRight, 
  Trophy, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import TextbookSearch from '../solutions/TextbookSearch';

// TypeScript contract defining what a course object looks like
interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  type: 'video' | 'text';
  duration?: string;
}

// Starter fallback courses shown if the backend server is offline
const FALLBACK_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Mastering Linear & Quadratic Equations',
    subject: 'Mathematics',
    description: 'Learn step-by-step methods for factoring, quadratic formula, and graphing.',
    type: 'video',
    duration: '2h left'
  },
  {
    id: 'course-2',
    title: 'Mechanics & Newton’s Laws of Motion',
    subject: 'Physics',
    description: 'Explore velocity, acceleration, friction, and real-world forces in action.',
    type: 'text',
    duration: '1h left'
  }
];

export default function StudyDashboard() {
  // --- STATE MANAGEMENT ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH ENROLLED COURSES ---
  useEffect(() => {
    fetch('/api/content')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load course catalog.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
        } else {
          // Use starter courses if database returned empty array
          setCourses(FALLBACK_COURSES);
        }
      })
      .catch(() => {
        // Fallback gracefully so students can preview the dashboard offline
        setCourses(FALLBACK_COURSES);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // --- NAVIGATION EVENT DISPATCHERS ---
  const handleSelectSolution = (id: string) => {
    window.dispatchEvent(
      new CustomEvent('navigate-to-solution', { detail: { solutionId: id } })
    );
  };

  const handleSelectTextbook = (_id: string) => {
    window.dispatchEvent(
      new CustomEvent('navigate-to-solution', { detail: { solutionId: null } })
    );
  };

  const handleContinueCourse = (course: Course) => {
    toast.success(`Resuming ${course.title}`, {
      description: `Opening ${course.subject} study deck...`
    });
  };

  const handleTaskClick = (taskName: string) => {
    toast.info(`Opening ${taskName}`, {
      description: 'Preparing your practice questions...'
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 font-sans">
      
      {/* Header & Search Bar */}
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Welcome back, Scholar 👋
          </h1>
          <p className="text-slate-500 text-base md:text-lg mt-1 font-medium">
            Continue your daily study goals and track your progress.
          </p>
        </div>
        
        {/* Textbook & Solution Instant Search Bar */}
        <div className="max-w-3xl">
          <TextbookSearch 
            onSelectSolution={handleSelectSolution} 
            onSelectTextbook={handleSelectTextbook} 
          />
        </div>
      </header>

      {/* Main Grid: Active Courses (Left) & Goals / Tasks (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Active Study Modules */}
        <div className="lg:col-span-2 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Active Courses
              </h2>
              <Button 
                variant="link" 
                onClick={() => toast.info("Opening complete course syllabus...")}
                className="text-blue-600 font-bold hover:text-blue-700 p-0"
              >
                View All
              </Button>
            </div>
            
            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card 
                  key={course.id} 
                  className="group hover:shadow-lg transition-all duration-300 border-slate-200 rounded-3xl overflow-hidden bg-white"
                >
                  <CardContent className="p-0">
                    {/* Course Banner / Thumbnail */}
                    <div className="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                      <BookOpen className="w-12 h-12 text-blue-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>

                    {/* Course Content Details */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-wider">
                          {course.subject}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {course.duration || '2h left'}
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 leading-snug line-clamp-1">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <Button 
                        onClick={() => handleContinueCourse(course)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-2 py-5 shadow-sm transition-all"
                      >
                        {course.type === 'video' ? (
                          <Play className="w-4 h-4 fill-current" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        Continue Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Weekly Target & Upcoming Quizzes */}
        <div className="space-y-6">
          
          {/* Weekly Learning Goal Widget */}
          <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border-none shadow-xl shadow-blue-600/20 rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Trophy className="w-28 h-28 text-white" />
            </div>
            
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" /> Weekly Target
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-4xl font-black tracking-tight">12 / 20 hrs</div>
              
              {/* Progress Bar (60%) */}
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                <div className="bg-yellow-400 h-full w-[60%] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              </div>
              
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                You're on track! Just <span className="font-bold text-white">8 more hours</span> to achieve your weekly study badge.
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Assignment & Quiz Reminders */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Tasks</h2>
            
            <div className="space-y-3">
              {[
                { title: 'Calculus Diagnostic Quiz', due: 'Due in 2 days', subject: 'Mathematics' },
                { title: 'Cell Biology Review Test', due: 'Due in 4 days', subject: 'Biology' },
                { title: 'JAMB English Vocabulary Drill', due: 'Due this Sunday', subject: 'English' }
              ].map((task, index) => (
                <div 
                  key={index} 
                  onClick={() => handleTaskClick(task.title)}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {task.due} • {task.subject}
                    </div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
