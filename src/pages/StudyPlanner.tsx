import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { syllabusData } from '../data/syllabus';
import { supabase } from '@/src/lib/supabase';
import { 
  Calendar, 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Target, 
  RotateCcw, 
  BookOpen, 
  ChevronRight, 
  UserCheck, 
  Layers, 
  Sliders, 
  Bookmark, 
  Flame, 
  GraduationCap, 
  Zap, 
  User, 
  Award,
  Search,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

// Custom seeded random generator to ensure true profile-level isolation and customization
function getSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const rand = getSeededRandom(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  objectives: string[];
  completedObjectives: string[];
  status: 'pending' | 'completed';
  day: string;
}

interface UserStudyPlan {
  examType: string;
  subjects: string[];
  intensity: 'casual' | 'standard' | 'intensive';
  preference: string;
  tasks: StudyTask[];
  seed: string;
  createdAt: string;
}

export default function StudyPlanner() {
  const { user } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState<UserStudyPlan | null>(null);

  // Setup Wizard State
  const [examType, setExamType] = useState<'WAEC' | 'JAMB' | 'NECO'>('JAMB');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<'casual' | 'standard' | 'intensive'>('standard');
  const [preference, setPreference] = useState<string>('Pomodoro');
  const [customSeedAddition, setCustomSeedAddition] = useState<string>('');

  // Active UI states
  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'calendar' | 'focus'>('calendar');

  // Supabase Database Syllabus Connection State
  const [dbSyllabusData, setDbSyllabusData] = useState<Record<string, any[]>>({});
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbSyllabusCount, setDbSyllabusCount] = useState(0);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Load the personalized study plan for this specific student from isolated local storage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`study_plan_${user.id}`);
      if (saved) {
        try {
          setCurrentPlan(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse study plan', e);
        }
      }
    }
  }, [user]);

  // Fetch dynamic syllabus topics from Supabase 'knowledge_base' or fallback to 'document_chunks'
  useEffect(() => {
    async function fetchSyllabusFromSupabase() {
      const sbClient = supabase;
      if (!sbClient) {
        console.warn('Supabase client not initialized or credentials missing.');
        return;
      }

      setIsDbLoading(true);
      try {
        let rows: any[] = [];
        let sourceUsed = '';

        // Try 'knowledge_base' table first
        const { data: kbData, error: kbError } = await sbClient
          .from('knowledge_base')
          .select('*');

        if (!kbError && kbData && kbData.length > 0) {
          rows = kbData;
          sourceUsed = 'knowledge_base';
        } else {
          if (kbError) console.log('knowledge_base fetch error or table missing:', kbError.message);
          
          // Fallback to 'document_chunks' table which also maps syllabus content
          const { data: chunkData, error: chunkError } = await sbClient
            .from('document_chunks')
            .select('subject, topic, content');
            
          if (!chunkError && chunkData && chunkData.length > 0) {
            rows = chunkData;
            sourceUsed = 'document_chunks';
          } else {
            if (chunkError) console.log('document_chunks fetch error:', chunkError.message);
          }
        }

        if (rows.length > 0) {
          const parsedSyllabus: Record<string, any[]> = {};
          let parsedCount = 0;

          rows.forEach((row) => {
            const rawSubject = row.subject || row.subject_name || 'General';
            const subject = rawSubject.trim();
            
            // If the subject name is general like "Chemistry" or "Physics", map it to both "JAMB Chemistry" and "Chemistry" 
            // so it seamlessly matches either active view
            const isJambOnly = subject.toUpperCase().startsWith('JAMB') || row.exam_type?.toUpperCase() === 'JAMB';
            const isWaecOnly = subject.toUpperCase().startsWith('WAEC') || row.exam_type?.toUpperCase() === 'WAEC';

            let targetSubjectKeys: string[] = [];
            if (isJambOnly) {
              targetSubjectKeys.push(subject.toUpperCase().startsWith('JAMB') ? subject : `JAMB ${subject}`);
            } else if (isWaecOnly) {
              targetSubjectKeys.push(subject.toUpperCase().startsWith('WAEC') ? subject : subject);
            } else {
              // Neutral subject: map to both so both JAMB and WAEC selection can access it
              const cleanSubject = subject.replace(/^(JAMB|WAEC)\s+/i, '');
              targetSubjectKeys.push(`JAMB ${cleanSubject}`);
              targetSubjectKeys.push(cleanSubject);
            }

            const topicBase = row.topic || row.topic_name || row.title || 'General Core Concept';
            const subtopicBase = row.subtopic || row.subtopic_name || '';
            const topicText = subtopicBase ? `${topicBase} (${subtopicBase})` : topicBase;
            
            // Extract or generate objectives safely
            let objectives: string[] = [];
            if (Array.isArray(row.objectives)) {
              objectives = row.objectives;
            } else if (typeof row.objectives === 'string' && row.objectives.trim()) {
              try {
                objectives = JSON.parse(row.objectives);
              } catch {
                objectives = row.objectives.split('\n').map((s: string) => s.trim()).filter(Boolean);
              }
            } else if (row.content || row.description) {
              const text = row.content || row.description;
              objectives = text
                .split(/[.!?\n]+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 12 && !s.startsWith('-') && !s.startsWith('*'))
                .slice(0, 4);
            }

            if (objectives.length === 0) {
              objectives = [
                'Review core definitions and context',
                'Analyze key mechanisms and methodologies',
                'Practice exam-style review problems'
              ];
            }

            targetSubjectKeys.forEach(subjectKey => {
              if (!parsedSyllabus[subjectKey]) {
                parsedSyllabus[subjectKey] = [];
              }

              // Avoid adding identical topic names under same subject
              const exists = parsedSyllabus[subjectKey].some(t => t.topic.toLowerCase() === topicText.toLowerCase());
              if (!exists) {
                parsedSyllabus[subjectKey].push({
                  sn: String(parsedSyllabus[subjectKey].length + 1),
                  topic: topicText,
                  objectives,
                  examType: row.exam_type || (subjectKey.startsWith('JAMB') ? 'JAMB' : 'WAEC'),
                  subject: subjectKey.replace('JAMB ', ''),
                  isFromDb: true,
                  dbSource: sourceUsed
                });
                parsedCount++;
              }
            });
          });

          setDbSyllabusData(parsedSyllabus);
          setDbSyllabusCount(parsedCount);
          toast.success(`Connected to Supabase! Loaded ${parsedCount} dynamic topics from ${sourceUsed}.`);
        }
      } catch (err: any) {
        console.error('Failed to load syllabus data from database:', err);
      } finally {
        setIsDbLoading(false);
      }
    }

    fetchSyllabusFromSupabase();
  }, [user]);

  // Combine static local syllabus data with real-time Supabase database syllabus data
  const combinedSyllabusData = useMemo(() => {
    const combined = { ...syllabusData };
    
    // Merge database topics
    Object.entries(dbSyllabusData).forEach(([subjectKey, topics]) => {
      if (combined[subjectKey]) {
        const existingTopics = combined[subjectKey];
        // Only append topics that do not exist yet in local data
        const newTopics = topics.filter(t => !existingTopics.some(et => et.topic.toLowerCase() === t.topic.toLowerCase()));
        combined[subjectKey] = [...existingTopics, ...newTopics];
      } else {
        combined[subjectKey] = topics;
      }
    });
    
    return combined;
  }, [dbSyllabusData]);

  // Dynamically group syllabus keys based on user selection
  const availableSyllabusKeys = useMemo(() => {
    return Object.keys(combinedSyllabusData).filter(key => {
      if (examType === 'JAMB') {
        return key.startsWith('JAMB');
      } else {
        return !key.startsWith('JAMB');
      }
    });
  }, [examType, combinedSyllabusData]);

  const filteredSyllabusKeys = useMemo(() => {
    if (!subjectSearch) return availableSyllabusKeys;
    return availableSyllabusKeys.filter(k => 
      k.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [availableSyllabusKeys, subjectSearch]);

  // Handle subject toggle
  const toggleSubject = (subjectKey: string) => {
    if (selectedSubjects.includes(subjectKey)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjectKey));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectKey]);
    }
  };

  // Generate completely unique, personalized study curriculum for this user
  const handleGeneratePlan = () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject to generate your study plan.');
      return;
    }

    // Dynamic Seed based on user profile email, name, selected options, and custom additions
    // This strictly ensures that no two profile study schedules can look identical
    const profileUniqueSeed = `${user?.id || 'guest'}-${user?.email || 'anon'}-${examType}-${selectedSubjects.join('-')}-${customSeedAddition || 'alpha'}`;
    const generatedTasks: StudyTask[] = [];

    // Map intensity to days and duration
    const daysToSchedule = intensity === 'casual' ? ['Mon', 'Wed', 'Fri'] : intensity === 'standard' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : daysOfWeek;
    const sessionDuration = intensity === 'casual' ? '30 mins' : intensity === 'standard' ? '45 mins' : '60 mins';

    // Loop through selected subjects, fetch their official modules from syllabus knowledge base, shuffle uniquely, and assign
    let taskCounter = 1;
    selectedSubjects.forEach(subjectKey => {
      const rawTopics = combinedSyllabusData[subjectKey] || [];
      if (rawTopics.length === 0) return;

      // Unique shuffle of official topics using the student's personal profile seed
      const studentPersonalTopics = shuffleWithSeed(rawTopics, `${profileUniqueSeed}-${subjectKey}`);

      // Distribute student topics over their weekly study sessions
      studentPersonalTopics.forEach((topicObj, index) => {
        const targetDay = daysToSchedule[index % daysToSchedule.length];
        const priorityVal: 'high' | 'medium' | 'low' = index % 3 === 0 ? 'high' : index % 3 === 1 ? 'medium' : 'low';
        
        generatedTasks.push({
          id: `task_${taskCounter++}_${subjectKey}`,
          subject: subjectKey.replace('JAMB ', ''),
          topic: topicObj.topic,
          duration: sessionDuration,
          priority: priorityVal,
          objectives: topicObj.objectives || ['Review core definitions', 'Apply concepts to sample questions'],
          completedObjectives: [],
          status: 'pending',
          day: targetDay
        });
      });
    });

    const newPlan: UserStudyPlan = {
      examType,
      subjects: selectedSubjects,
      intensity,
      preference,
      tasks: generatedTasks,
      seed: profileUniqueSeed,
      createdAt: new Date().toISOString()
    };

    if (user) {
      localStorage.setItem(`study_plan_${user.id}`, JSON.stringify(newPlan));
    }
    setCurrentPlan(newPlan);
    toast.success('Your fully customized, seeded AI Study Plan is live!');
  };

  const handleResetPlan = () => {
    if (window.confirm('Are you sure you want to discard this study plan? All checked progress will be reset.')) {
      if (user) {
        localStorage.removeItem(`study_plan_${user.id}`);
      }
      setCurrentPlan(null);
      setSelectedSubjects([]);
      toast.success('Study planner reset. Ready for custom generation.');
    }
  };

  // Toggle objective completed within a specific task
  const handleToggleObjective = (taskId: string, obj: string) => {
    if (!currentPlan) return;

    const updatedTasks = currentPlan.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleted = t.completedObjectives.includes(obj);
        const nextCompleted = isCompleted 
          ? t.completedObjectives.filter(o => o !== obj)
          : [...t.completedObjectives, obj];
        
        const isTaskFinished = nextCompleted.length === t.objectives.length;

        // Reward points when objective gets checked
        if (!isCompleted) {
          toast.success(`Objective achieved! +15 XP rewarded.`);
        }

        return {
          ...t,
          completedObjectives: nextCompleted,
          status: isTaskFinished ? 'completed' as const : 'pending' as const
        };
      }
      return t;
    });

    const updatedPlan = { ...currentPlan, tasks: updatedTasks };
    setCurrentPlan(updatedPlan);
    if (user) {
      localStorage.setItem(`study_plan_${user.id}`, JSON.stringify(updatedPlan));
    }
  };

  // Calculate metrics
  const activeDayTasks = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.tasks.filter(t => t.day === selectedDay);
  }, [currentPlan, selectedDay]);

  const progressPercentage = useMemo(() => {
    if (!currentPlan || currentPlan.tasks.length === 0) return 0;
    const totalObjectives = currentPlan.tasks.reduce((sum, t) => sum + t.objectives.length, 0);
    const completedObjectives = currentPlan.tasks.reduce((sum, t) => sum + t.completedObjectives.length, 0);
    return Math.round((completedObjectives / totalObjectives) * 100) || 0;
  }, [currentPlan]);

  const dailyStatus = useMemo(() => {
    if (!currentPlan) return {};
    const status: Record<string, { completed: number; total: number }> = {};
    daysOfWeek.forEach(day => {
      const dayTasks = currentPlan.tasks.filter(t => t.day === day);
      const completed = dayTasks.filter(t => t.status === 'completed').length;
      status[day] = { completed, total: dayTasks.length };
    });
    return status;
  }, [currentPlan]);

  // AI assistant recommendations based on selected subject profile
  const aiCoachAdvice = useMemo(() => {
    if (!currentPlan) return '';
    const studentInitials = user?.name ? user.name.split(' ')[0] : 'Scholar';
    if (progressPercentage === 0) {
      return `Welcome, ${studentInitials}! I have constructed your curriculum layout. Start on ${selectedDay}'s schedule, focus especially on the first objective, and use the ${currentPlan.preference} technique.`;
    } else if (progressPercentage < 50) {
      return `Solid work, ${studentInitials}! You have checked off multiple modules. Your JABM/WAEC readiness is trending upwards. Tackle a high priority task next!`;
    } else {
      return `Incredible velocity, ${studentInitials}! Your dedication is phenomenal. You are now 65% closer to perfect exam synchronization.`;
    }
  }, [currentPlan, progressPercentage, user, selectedDay]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500/30">
      <AnimatePresence mode="wait">
        {!currentPlan ? (
          // SETUP WIZARD VIEW
          <motion.div
            key="planner-wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-4xl mx-auto px-4 py-12"
          >
            <div className="text-center mb-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.15em]">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Seeded Curriculum Customization
              </div>
              <h1 className="text-4xl font-black tracking-tight uppercase">AI Study Plan Engine</h1>
              <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                Select your academic targets to dynamically construct your personal syllabus roadmap. Our seeding engine isolated to your student ID ensures your study layout remains uniquely yours.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Wizard Parameters Panel */}
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-zinc-900 border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                      1. Choose Exam Framework
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-3 gap-3">
                    {(['JAMB', 'WAEC', 'NECO'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setExamType(type);
                          setSelectedSubjects([]);
                        }}
                        className={`py-4 rounded-xl font-black text-sm uppercase tracking-wider border transition-all cursor-pointer ${
                          examType === type 
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400' 
                            : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <CardHeader className="border-b border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        2. Choose Subject Focus ({selectedSubjects.length} selected)
                      </CardTitle>
                      {isDbLoading ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold bg-cyan-950/45 border border-cyan-500/20 px-2 py-0.5 rounded-full w-fit animate-pulse">
                          <Database className="w-3 h-3 animate-spin" /> Fetching Supabase knowledge...
                        </div>
                      ) : dbSyllabusCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/45 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                          <Database className="w-3 h-3" /> Live Supabase Connection: {dbSyllabusCount} dynamic topics active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold bg-amber-950/45 border border-amber-500/20 px-2 py-0.5 rounded-full w-fit">
                          <AlertCircle className="w-3 h-3" /> Supabase empty/offline: using local cached modules
                        </div>
                      )}
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                      <Input
                        type="text"
                        placeholder="Search subjects..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        className="bg-zinc-950 border-white/5 text-xs text-white rounded-lg pl-8 h-8 py-0 focus-visible:ring-cyan-500/30"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                      {filteredSyllabusKeys.map(subjectKey => {
                        const isSelected = selectedSubjects.includes(subjectKey);
                        const cleanName = subjectKey.replace('JAMB ', '');
                        const hasDbTopics = combinedSyllabusData[subjectKey]?.some((t: any) => t.isFromDb);
                        return (
                          <button
                            key={subjectKey}
                            onClick={() => toggleSubject(subjectKey)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400' 
                                : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span className="text-xs font-bold uppercase tracking-wide truncate max-w-[80%] flex items-center gap-1.5">
                              {cleanName}
                              {hasDbTopics && (
                                <span className="text-[9px] font-extrabold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-1 py-0.2 rounded scale-90" title="This subject contains topics loaded live from Supabase 'knowledge_base'">
                                  DB
                                </span>
                              )}
                            </span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-zinc-700'
                            }`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-black stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                      {filteredSyllabusKeys.length === 0 && (
                        <div className="text-center py-8 text-zinc-500 text-xs">
                          No matching syllabus topics found for "{subjectSearch}"
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Parameters sidebar */}
              <div className="space-y-6">
                <Card className="bg-zinc-900 border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      3. Plan Intensity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 block">Commitment Tier</label>
                      <div className="space-y-2">
                        {[
                          { key: 'casual', label: 'Casual', desc: '3 sessions/week' },
                          { key: 'standard', label: 'Standard', desc: '5 sessions/week' },
                          { key: 'intensive', label: 'Intensive', desc: 'Daily focus' }
                        ].map(tier => (
                          <button
                            key={tier.key}
                            onClick={() => setIntensity(tier.key as any)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              intensity === tier.key 
                                ? 'bg-purple-950/30 border-purple-500/50 text-purple-400' 
                                : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-black uppercase">{tier.label}</span>
                            <span className="text-[10px] opacity-70">{tier.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 block">Tactical Method</label>
                      <select
                        value={preference}
                        onChange={(e) => setPreference(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 text-xs font-black uppercase text-zinc-300 focus:outline-none"
                      >
                        <option value="Pomodoro">Pomodoro Technique</option>
                        <option value="Active Recall">Active Recall Drills</option>
                        <option value="Spaced Repetition">Spaced Repetition Cycle</option>
                        <option value="Feynman">Feynman Explanation Method</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 block">Custom Seed Modifier (Optional)</label>
                      <Input
                        type="text"
                        placeholder="e.g. term_3_focus"
                        value={customSeedAddition}
                        onChange={(e) => setCustomSeedAddition(e.target.value)}
                        className="bg-zinc-950 border-white/5 text-xs text-white rounded-xl focus-visible:ring-purple-500/30"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleGeneratePlan}
                  className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl py-6 shadow-lg shadow-cyan-500/10 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Initiate Study Planner
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          // MAIN PLANNER ACTIVE VIEW
          <motion.div
            key="planner-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-zinc-950 overflow-hidden"
          >
            {/* MOBILE NAVIGATION TABS */}
            <div className="flex lg:hidden border-b border-white/5 bg-zinc-900/40 p-2 gap-2 shrink-0">
              <button
                onClick={() => setMobileTab('calendar')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                  mobileTab === 'calendar'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                    : 'bg-transparent border-transparent text-zinc-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </button>
              <button
                onClick={() => setMobileTab('focus')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                  mobileTab === 'focus'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400'
                    : 'bg-transparent border-transparent text-zinc-400'
                }`}
              >
                <Brain className="w-3.5 h-3.5" /> {selectedDay}'s Focus
              </button>
            </div>

            {/* WEEKLY TIMELINE ASIDE */}
            <aside className={`w-full lg:w-80 border-r border-white/10 p-6 flex-col justify-between shrink-0 bg-zinc-950/80 z-20 overflow-y-auto no-scrollbar ${
              mobileTab === 'calendar' ? 'flex' : 'hidden lg:flex'
            }`}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Weekly Schedule
                  </h2>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {currentPlan.examType} Focus
                  </span>
                </div>

                <div className="space-y-2.5">
                  {daysOfWeek.map(day => {
                    const status = dailyStatus[day] || { completed: 0, total: 0 };
                    const isSelected = selectedDay === day;
                    const isFullyDone = status.total > 0 && status.completed === status.total;

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setSelectedDay(day);
                          setMobileTab('focus');
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                          isSelected 
                            ? 'bg-zinc-900 border-cyan-500/50 shadow-lg shadow-cyan-500/5' 
                            : 'bg-zinc-950/40 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black uppercase tracking-wider transition-colors ${
                            isSelected ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-white'
                          }`}>
                            {day}
                          </span>
                          {status.total > 0 && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {status.completed}/{status.total} Done
                            </span>
                          )}
                        </div>

                        {status.total === 0 ? (
                          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Rest</span>
                        ) : isFullyDone ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                    Isolated Profile Seed Mode
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl font-mono text-[9px] text-zinc-500 break-all select-all">
                  SEED_KEY: {currentPlan.seed}
                </div>
                <Button
                  onClick={handleResetPlan}
                  variant="outline"
                  size="sm"
                  className="w-full border-white/5 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 text-zinc-400 text-xs font-black uppercase tracking-wider py-4 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset study plan
                </Button>
              </div>
            </aside>

            {/* MAIN TASKS BOARD AREA */}
            <main className={`flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex-col justify-between ${
              mobileTab === 'focus' ? 'flex' : 'hidden lg:flex'
            }`}>
              <div className="space-y-6">
                {/* Header Metrics Panel */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                      {selectedDay}'s Focus Terminal
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>Target: {currentPlan.examType}</span>
                      <span>•</span>
                      <span>Tactics: {currentPlan.preference}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                    <div className="space-y-1 flex-1 sm:flex-none">
                      <div className="flex justify-between text-xs font-black uppercase tracking-wider text-zinc-400 mb-1">
                        <span>Readiness</span>
                        <span className="text-cyan-400">{progressPercentage}%</span>
                      </div>
                      <div className="h-2 bg-zinc-950 border border-white/5 rounded-full overflow-hidden w-full sm:w-40">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" 
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </header>

                {/* Day's specific topics list */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest">
                      Active Curriculum Objectives ({activeDayTasks.length} modules)
                    </h3>
                  </div>

                  <div className="grid gap-3.5">
                    {activeDayTasks.map((task) => {
                      const isExpanded = expandedTaskId === task.id;
                      const completedCount = task.completedObjectives.length;
                      const totalCount = task.objectives.length;
                      const isTaskCompleted = task.status === 'completed';

                      return (
                        <div 
                          key={task.id} 
                          className={`bg-zinc-900 border transition-all rounded-2xl overflow-hidden group ${
                            isTaskCompleted 
                              ? 'border-emerald-500/20 bg-emerald-950/5' 
                              : isExpanded 
                                ? 'border-cyan-500/30' 
                                : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Task Summary Banner */}
                          <div 
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="p-5 flex items-center justify-between cursor-pointer"
                          >
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 bg-zinc-950 border border-white/10 text-[9px] font-black uppercase tracking-widest rounded text-cyan-400">
                                  {task.subject}
                                </span>
                                {task.priority === 'high' && (
                                  <span className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" /> High priority
                                  </span>
                                )}
                              </div>
                              <h4 className="font-black text-base text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors">
                                {task.topic}
                              </h4>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" /> {task.duration}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {completedCount}/{totalCount}
                                </span>
                                {isTaskCompleted ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
                                    {Math.round((completedCount/totalCount)*100)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Module Objectives List */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden bg-zinc-950/40 border-t border-white/5"
                              >
                                <div className="p-5 space-y-3.5">
                                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Official Syllabus Learning Objectives:
                                  </div>
                                  <div className="space-y-2">
                                    {task.objectives.map((obj, i) => {
                                      const isObjDone = task.completedObjectives.includes(obj);
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => handleToggleObjective(task.id, obj)}
                                          className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            isObjDone 
                                              ? 'bg-emerald-950/10 border-emerald-500/20 text-zinc-300 line-through' 
                                              : 'bg-zinc-900 border-white/5 text-zinc-200 hover:border-white/10'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                                            isObjDone ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'
                                          }`}>
                                            {isObjDone && <CheckCircle className="w-3 h-3 text-black stroke-[3]" />}
                                          </div>
                                          <span className="text-xs leading-relaxed font-medium">
                                            {obj}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    {activeDayTasks.length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-3xl">
                        <Bookmark className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                        <h4 className="text-sm font-black uppercase text-zinc-400">Rest Day Selected</h4>
                        <p className="text-xs text-zinc-500 mt-1">Take this day to do practice exams in the exam arena or review achievements.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Bottom Coach suggestion banner */}
              <footer className="mt-8 pt-6 border-t border-white/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase text-purple-400">Tutor Chuks AI Advisory</h5>
                      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xl">
                        {aiCoachAdvice}
                      </p>
                    </div>
                  </div>
                </div>
              </footer>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
