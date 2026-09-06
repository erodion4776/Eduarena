import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { 
  Brain, 
  TrendingUp, 
  Award, 
  Zap, 
  RefreshCw, 
  Flame, 
  CheckCircle, 
  Database, 
  HelpCircle, 
  AlertCircle, 
  BookOpen, 
  Star, 
  Sparkles,
  Play
} from 'lucide-react';

interface CombinedResult {
  id: string;
  source: 'practice' | 'exam';
  subject: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  createdAt: string;
}

interface TopicMasteryItem {
  id: string;
  topic_name: string;
  mastery_score: number;
}

export default function Performance() {
  const { user } = useAuthStore();
  const [results, setResults] = useState<CombinedResult[]>([]);
  const [masteryList, setMasteryList] = useState<TopicMasteryItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'bar' | 'radar'>('bar');
  const [showDemo, setShowDemo] = useState<boolean>(false);
  
  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Fallback / Seed Data if database is completely empty
  const defaultMastery: TopicMasteryItem[] = [
    { id: 'm1', topic_name: 'Electrolysis & Electrochemistry', mastery_score: 88 },
    { id: 'm2', topic_name: 'Newtonian Mechanics', mastery_score: 52 },
    { id: 'm3', topic_name: 'Algebraic Fractions & Surds', mastery_score: 75 },
    { id: 'm4', topic_name: 'Cellular Respiration & Krebs Cycle', mastery_score: 41 },
    { id: 'm5', topic_name: 'Structure of Atom & Periodic Table', mastery_score: 90 },
    { id: 'm6', topic_name: 'Gravitational & Electric Fields', mastery_score: 64 },
  ];

  const defaultResults: CombinedResult[] = [
    { id: 'dr1', source: 'practice', subject: 'JAMB Chemistry', score: 85, totalQuestions: 15, xpEarned: 120, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'dr2', source: 'exam', subject: 'JAMB Physics', score: 58, totalQuestions: 40, xpEarned: 200, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'dr3', source: 'practice', subject: 'JAMB Biology', score: 72, totalQuestions: 20, xpEarned: 95, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'dr4', source: 'exam', subject: 'JAMB Mathematics', score: 90, totalQuestions: 40, xpEarned: 350, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  // Load All Progress metrics from direct Supabase and proxy APIs
  const fetchProgressData = async () => {
    setIsSyncing(true);
    try {
      let combined: CombinedResult[] = [];
      let masteryData: TopicMasteryItem[] = [];

      // 1. Fetch practice results (directly from proxy API to auto-fallback to local JSON if offline)
      let practiceResultsFetched = false;
      if (supabase && user && user.id && user.id !== '1') {
        try {
          const { data: practiceData, error: practiceErr } = await supabase
            .from('practice_results')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!practiceErr && practiceData) {
            practiceData.forEach((item: any) => {
              combined.push({
                id: item.id,
                source: 'practice',
                subject: item.subject || 'Mixed',
                score: Number(item.score ?? 0),
                totalQuestions: Number(item.total_questions ?? 0),
                xpEarned: Number(item.xp_earned ?? 0),
                createdAt: item.created_at || new Date().toISOString()
              });
            });
            practiceResultsFetched = true;
          }
        } catch (sbPracticeErr) {
          console.warn('Direct Supabase practice_results fetch failed:', sbPracticeErr);
        }
      }

      if (!practiceResultsFetched) {
        try {
          const res = await fetch('/api/practice/session/results');
          if (res.ok) {
            const body = await res.json();
            const items = body.results || [];
            // If logged in, filter results by user_id to display the exact right data
            const filteredItems = (user && user.id && user.id !== '1')
              ? items.filter((item: any) => item.user_id === user.id)
              : items;

            filteredItems.forEach((item: any) => {
              combined.push({
                id: item.id || `pr-${Math.random()}`,
                source: 'practice',
                subject: item.subject || 'Mixed',
                score: Number(item.score ?? 0),
                totalQuestions: Number(item.total_questions ?? 0),
                xpEarned: Number(item.xp_earned ?? 0),
                createdAt: item.created_at || new Date().toISOString()
              });
            });
          }
        } catch (err) {
          console.warn('Practice results API proxy fetch failed:', err);
        }
      }

      // 2. Query direct Supabase if available for Exam Results and Mastery
      if (supabase) {
        try {
          // Fetch Exam Results (scoped to current user if authorized)
          let examQuery = supabase.from('exam_results').select('*');
          if (user && user.id && user.id !== '1') {
            examQuery = examQuery.eq('user_id', user.id);
          }
          const { data: examData, error: examErr } = await examQuery.order('created_at', { ascending: false });

          if (!examErr && examData) {
            examData.forEach((item: any) => {
              combined.push({
                id: item.id,
                source: 'exam',
                subject: item.subject_name || item.subject || 'Exam Assessment',
                score: Number(item.score ?? 0),
                totalQuestions: Number(item.total_questions ?? 0),
                xpEarned: Number(item.xp_earned ?? 150),
                createdAt: item.created_at || new Date().toISOString()
              });
            });
          }

          // Fetch Topic Mastery levels
          let masteryQuery = supabase.from('topic_mastery').select('*');
          if (user && user.id && user.id !== '1') {
            masteryQuery = masteryQuery.eq('user_id', user.id);
          }
          const { data: dbMastery, error: masteryErr } = await masteryQuery;
          if (!masteryErr && dbMastery && dbMastery.length > 0) {
            masteryData = dbMastery.map((item: any) => ({
              id: item.id,
              topic_name: item.topic_name,
              mastery_score: Number(item.mastery_score ?? 0)
            }));
          }
        } catch (sbErr) {
          console.error('Direct Supabase performance queries failed:', sbErr);
        }
      }

      // Sort chronological results descending
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setResults(combined);
      setMasteryList(masteryData);
    } catch (globalErr) {
      console.error('Failed to parse progress details:', globalErr);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on mount or user profile switch
  useEffect(() => {
    fetchProgressData();
  }, [user]);

  // Combine fetched database records with realistic initial seed arrays if empty
  const activeResults = useMemo(() => {
    if (results.length > 0) return results;
    return showDemo ? defaultResults : [];
  }, [results, showDemo]);

  const activeMastery = useMemo(() => {
    if (masteryList.length > 0) return masteryList;
    return showDemo ? defaultMastery : [];
  }, [masteryList, showDemo]);

  // Dynamic Metrics Aggregators
  const stats = useMemo(() => {
    if (activeResults.length === 0) return { avgScore: 0, totalQuestions: 0, totalExams: 0, readiness: 0, dominance: 'None' };
    
    const sum = activeResults.reduce((acc, r) => acc + r.score, 0);
    const avgScore = Math.round(sum / activeResults.length);
    const totalQuestions = activeResults.reduce((acc, r) => acc + r.totalQuestions, 0);
    const totalExams = activeResults.length;

    // Calculate dynamic readiness score (weighted average of score & experience)
    const consistencyBonus = Math.min(totalExams * 5, 20); // Max 20% consistency bonus
    const readiness = Math.min(Math.round(avgScore * 0.8 + consistencyBonus), 100);

    // Identify Subject Dominance (the highest scoring subject)
    const subjectScores: Record<string, { total: number; count: number }> = {};
    activeResults.forEach(r => {
      const sub = r.subject.replace(/^(JAMB|WAEC)\s+/i, '').trim();
      if (!subjectScores[sub]) {
        subjectScores[sub] = { total: 0, count: 0 };
      }
      subjectScores[sub].total += r.score;
      subjectScores[sub].count += 1;
    });

    let bestSubject = 'N/A';
    let highestAvg = 0;
    Object.entries(subjectScores).forEach(([sub, data]) => {
      const avg = data.total / data.count;
      if (avg > highestAvg) {
        highestAvg = avg;
        bestSubject = sub;
      }
    });

    return {
      avgScore,
      totalQuestions,
      totalExams,
      readiness,
      dominance: bestSubject
    };
  }, [activeResults]);

  // Format dataset for Recharts Subject performance bar & radar
  const subjectChartData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    activeResults.forEach(r => {
      const name = r.subject.replace(/^(JAMB|WAEC)\s+/i, '').trim();
      if (!map[name]) map[name] = { total: 0, count: 0 };
      map[name].total += r.score;
      map[name].count += 1;
    });

    return Object.entries(map).map(([name, d]) => ({
      name,
      score: Math.round(d.total / d.count),
      fullMark: 100
    }));
  }, [activeResults]);

  // Format dataset for Area trend chart
  const trendChartData = useMemo(() => {
    // Reverse chronological order to display left-to-right
    const copy = [...activeResults].reverse();
    return copy.map((r, i) => ({
      index: i + 1,
      name: `Sess ${i + 1}`,
      score: r.score,
      subject: r.subject.replace(/^(JAMB|WAEC)\s+/i, '').trim(),
      date: new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [activeResults]);

  // Request high-quality Personalized AI Analysis from Server Endpoint (with heuristic client-side fallback)
  const generateAICoachInsight = async () => {
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const response = await fetch('/api/ai/performance-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          history: activeResults,
          mastery: activeMastery
        })
      });

      if (response.ok) {
        const body = await response.json();
        if (body.insight) {
          setAiInsight(body.insight);
          setIsAiLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI analysis API failed, falling back to local heuristic model:', err);
    }

    // Heuristic Fallback Engine if API or key is not available
    setTimeout(() => {
      const weakTopics = activeMastery.filter(m => m.mastery_score < 65).map(m => m.topic_name);
      const strongTopics = activeMastery.filter(m => m.mastery_score >= 80).map(m => m.topic_name);
      
      let analysisText = `Based on your **${stats.totalExams} completed practice sets**, your academic readiness stands at **${stats.readiness}%**.\n\n`;
      
      if (strongTopics.length > 0) {
        analysisText += `🌟 **Outstanding Strengths**: You are demonstrating exceptional mastery in concepts like **${strongTopics[0]}** (average score is over 80%). Maintain this excellence!\n\n`;
      }
      
      if (weakTopics.length > 0) {
        analysisText += `⚠️ **High Priority Weakness**: Focus your immediate reviews on **${weakTopics[0]}** where your average understanding is currently **${activeMastery.find(m => m.topic_name === weakTopics[0])?.mastery_score || 50}%**.\n\n`;
      } else {
        analysisText += `⚠️ **Core Focus recommendation**: Spend time practicing advanced formulas in **Newtonian Mechanics** to push past your current boundaries.\n\n`;
      }

      analysisText += `📝 **Personalized 3-Step Action Plan**:\n`;
      analysisText += `1. **Target the weak areas**: Take a 15-question isolated topic practice session on **${weakTopics[0] || 'Newtonian Mechanics'}**.\n`;
      analysisText += `2. **Review the Syllabus Objectives**: Use the Study Planner tab to read the key syllabus requirements for your selected subjects.\n`;
      analysisText += `3. **Increase test volume**: Complete at least one mock exam in **${stats.dominance !== 'None' ? stats.dominance : 'Physics'}** this week to consolidate your timing pacing.`;

      setAiInsight(analysisText);
      setIsAiLoading(false);
    }, 1200);
  };

  // Generate Insight on initial load
  useEffect(() => {
    if (activeResults.length > 0) {
      generateAICoachInsight();
    } else {
      setAiInsight(`👋 **Welcome to Edvenia!**

You do not have any practice sessions or mock exam results recorded in your database yet.

💡 **How to populate this dashboard**:
1. Go to the **Exam Arena** or **AI Tutor** tabs to solve practice questions.
2. Click the **"Simulate Practice Session"** button above to instantly write a realistic test score into your live database.
3. Toggle the **"Preview with Demo Data"** switch in the header to explore the charts, curriculum mastery meters, and detailed coaching metrics!`);
    }
  }, [activeResults]);

  // Live Simulated Practice Session Injector (Lets students interact and update metrics instantly!)
  const handleSimulatePractice = async () => {
    setIsSyncing(true);
    const subjectsList = ['JAMB Mathematics', 'JAMB Physics', 'JAMB Chemistry', 'JAMB Biology'];
    const randomSubject = subjectsList[Math.floor(Math.random() * subjectsList.length)];
    const randomScore = Math.floor(Math.random() * 41) + 60; // 60% to 100%
    const totalQuestions = Math.floor(Math.random() * 15) + 10; // 10 to 25
    const xpEarned = Math.round(randomScore * 1.5 + 50);

    const newResult: CombinedResult = {
      id: `sim-${Date.now()}`,
      source: Math.random() > 0.4 ? 'practice' : 'exam',
      subject: randomSubject,
      score: randomScore,
      totalQuestions,
      xpEarned,
      createdAt: new Date().toISOString()
    };

    // If Supabase is connected, insert the simulated result into the database for real persistence!
    if (supabase) {
      try {
        await supabase
          .from('practice_results')
          .insert({
            user_id: user?.id || 'anonymous',
            session_id: `sim-sess-${Date.now()}`,
            subject: randomSubject,
            score: randomScore,
            total_questions: totalQuestions,
            xp_earned: xpEarned,
            metadata: { simulation: true, examType: 'JAMB' },
            created_at: new Date().toISOString()
          });

        // Also update topic mastery score randomly for an active topic in that subject
        const matchMastery = activeMastery.find(m => m.topic_name.toLowerCase().includes(randomSubject.split(' ').pop()?.toLowerCase() || ''));
        if (matchMastery) {
          const newMasteryScore = Math.min(Math.max(matchMastery.mastery_score + Math.floor(Math.random() * 15) - 5, 30), 100);
          await supabase
            .from('topic_mastery')
            .upsert({
              user_id: user?.id || 'anonymous',
              topic_name: matchMastery.topic_name,
              mastery_score: newMasteryScore
            });
        }
      } catch (err) {
        console.warn('Failed to insert simulated result into Supabase:', err);
      }
    }

    // Add locally to visual UI immediate state
    setResults(prev => [newResult, ...prev]);
    setIsSyncing(false);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-zinc-950 text-white min-h-screen font-sans">
      
      {/* Dynamic Connection Indicator & Sync Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Performance Analytics</h1>
          </div>
          <p className="text-zinc-400 text-sm flex items-center gap-1.5 flex-wrap">
            {user ? (
              <>
                <Database className="w-4 h-4 text-cyan-400" />
                Logged in as <span className="text-zinc-200 font-semibold">{user.email}</span>
                {results.length > 0 ? (
                  <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                    Live Supabase Sync Active
                  </span>
                ) : showDemo ? (
                  <span className="text-amber-400 font-bold bg-amber-950/50 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px]">
                    Showing Demonstration Template
                  </span>
                ) : (
                  <span className="text-zinc-400 font-bold bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-full text-[10px]">
                    No Practice Sessions Recorded Yet
                  </span>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Local Guest Profile — Progress will persist locally
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {results.length === 0 && (
            <Button
              variant="outline"
              onClick={() => setShowDemo(!showDemo)}
              className={`rounded-xl border border-dashed text-xs font-bold gap-2 h-10 ${
                showDemo 
                  ? 'border-amber-500/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/30' 
                  : 'border-white/10 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {showDemo ? 'Hide Demo Data' : 'Preview Demo Data'}
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={fetchProgressData}
            disabled={isSyncing}
            className="rounded-xl border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/20 text-zinc-300 gap-2 h-10 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Progress
          </Button>

          <Button 
            onClick={handleSimulatePractice}
            disabled={isSyncing}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-black uppercase tracking-wider text-[11px] gap-2 shadow-lg shadow-cyan-950/50 h-10"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            Simulate Practice Session
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI 1: Avg Score */}
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Average Mock Score</span>
              <div className="p-2 bg-cyan-950/40 border border-cyan-500/20 rounded-xl">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-white">{stats.avgScore}%</span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium">
              Average across all {stats.totalExams} sessions
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Exam Readiness */}
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Exam Readiness</span>
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-emerald-400">{stats.readiness}%</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.readiness}%` }}
                />
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400">
                {stats.readiness >= 85 ? 'Elite' : stats.readiness >= 70 ? 'Ready' : 'Developing'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Practice Count */}
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-500" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Completed Sessions</span>
              <div className="p-2 bg-amber-950/40 border border-amber-500/20 rounded-xl">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-white">{stats.totalExams}</span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium">
              Total of {stats.totalQuestions} exam-grade questions solved
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Dominant Subject */}
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl relative overflow-hidden group shadow-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all duration-500" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Subject Dominance</span>
              <div className="p-2 bg-purple-950/40 border border-purple-500/20 rounded-xl">
                <Star className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-purple-300 truncate max-w-full">
                {stats.dominance}
              </span>
            </div>
            <div className="mt-3 text-[10px] text-zinc-400 font-medium">
              Highest average accuracy across your curriculum
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Subject Performance Chart (8 Grid Span) */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="bg-zinc-900/40 border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/5 bg-zinc-950/40 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-white">Subject Performance Balance</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Compare average scores across all registered subjects</CardDescription>
              </div>
              <div className="flex rounded-xl bg-zinc-950 p-1 border border-white/5">
                <button
                  onClick={() => setActiveChartTab('bar')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${
                    activeChartTab === 'bar' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  onClick={() => setActiveChartTab('radar')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${
                    activeChartTab === 'radar' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Radar Grid
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 h-[340px]">
              {subjectChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <HelpCircle className="w-8 h-8 animate-pulse text-zinc-600" />
                  <p className="text-xs font-semibold">Not enough practice data to draw chart balance</p>
                </div>
              ) : activeChartTab === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#71717a" 
                      fontSize={11}
                      fontWeight="bold"
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={11}
                      fontWeight="bold"
                      domain={[0, 100]} 
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                      labelClassName="font-black text-xs text-white"
                      itemStyle={{ color: '#22d3ee', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="score" fill="url(#cyanTealGradient)" radius={[6, 6, 0, 0]}>
                      <defs>
                        <linearGradient id="cyanTealGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0f766e" />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectChartData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 9 }} />
                    <Radar 
                      name="Accuracy Average" 
                      dataKey="score" 
                      stroke="#06b6d4" 
                      fill="#06b6d4" 
                      fillOpacity={0.25} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Area Performance Score History Tracker */}
          <Card className="bg-zinc-900/40 border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/5 bg-zinc-950/40 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-white">Performance Score Timeline</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Review consistency trends over your last completed exams and study sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-[260px]">
              {trendChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <TrendingUp className="w-8 h-8 text-zinc-600" />
                  <p className="text-xs">Timeline trend chart requires at least two sessions</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717a" 
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={10} 
                      fontWeight="bold"
                      domain={[0, 100]} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
                              <p className="text-[10px] text-zinc-500 font-bold mb-0.5">{data.date}</p>
                              <p className="text-xs font-black text-white uppercase">{data.subject}</p>
                              <p className="text-sm font-black text-cyan-400 mt-1">Score: {data.score}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#areaGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Insights & Topic Mastery List (4 Grid Span) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Real-time AI Coach Performance Insight Card */}
          <Card className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border-purple-500/20 rounded-2xl relative overflow-hidden shadow-xl p-6 flex flex-col justify-between h-fit min-h-[340px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-950/50 border border-purple-500/30 rounded-xl">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-purple-100">AI Performance Analyst</h3>
                </div>
                <Button 
                  onClick={generateAICoachInsight}
                  disabled={isAiLoading}
                  size="icon"
                  variant="ghost"
                  className="rounded-lg h-8 w-8 hover:bg-purple-950/40 text-purple-300"
                  title="Regenerate recommendation notes"
                >
                  <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-pulse text-purple-400' : ''}`} />
                </Button>
              </div>

              {isAiLoading ? (
                <div className="space-y-3 py-6">
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-3/4" />
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-full" />
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-5/6" />
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-2/3" />
                  <div className="flex items-center gap-2 text-xs text-purple-300 mt-2 font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deep analysis active...
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line prose prose-invert font-medium">
                  {aiInsight.split('\n\n').map((para, i) => {
                    // Quick parsing of bullet list
                    if (para.includes('1. ') || para.includes('* ')) {
                      return (
                        <div key={i} className="space-y-2 mt-3 bg-zinc-950/30 border border-white/5 rounded-xl p-3">
                          {para.split('\n').map((line, j) => (
                            <p key={j} className="m-0 text-[11px] leading-relaxed text-zinc-300" dangerouslySetInnerHTML={{
                              __html: line
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em class="text-purple-300 font-semibold">$1</em>')
                            }} />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <p key={i} className="mb-3" dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="text-purple-300 font-semibold">$1</em>')
                      }} />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-purple-500/10 pt-4 mt-6">
              <p className="text-[10px] text-purple-400/80 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Fully integrated with active student database
              </p>
            </div>
          </Card>

          {/* Detailed Curriculum Topic Mastery progress bars */}
          <Card className="bg-zinc-900/40 border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/5 bg-zinc-950/40 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-white">Curriculum Topic Mastery</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Live strength and development points calculated from test records</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-5">
                {activeMastery.map((item) => {
                  const isStruggling = item.mastery_score < 60;
                  const isElite = item.mastery_score >= 85;
                  
                  return (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-[11px] font-bold text-zinc-300 truncate max-w-[70%]" title={item.topic_name}>
                          {item.topic_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            isElite 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' 
                              : isStruggling 
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' 
                                : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/20'
                          }`}>
                            {item.mastery_score}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isElite 
                              ? 'bg-emerald-400' 
                              : isStruggling 
                                ? 'bg-rose-500' 
                                : 'bg-cyan-500'
                          }`}
                          style={{ width: `${item.mastery_score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Footer / Interactive Session Logs */}
      <Card className="bg-zinc-900/40 border-white/5 rounded-2xl overflow-hidden shadow-xl mt-8">
        <CardHeader className="border-b border-white/5 bg-zinc-950/40 pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-wider text-white">Recent Sessions & Exam Log</CardTitle>
          <CardDescription className="text-xs text-zinc-500">Chronological history of your completed mock examinations and practice workouts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] bg-zinc-950/20">
                  <th className="py-3.5 px-6">Source / Type</th>
                  <th className="py-3.5 px-6">Subject / Focus</th>
                  <th className="py-3.5 px-6 text-center">Score Accuracy</th>
                  <th className="py-3.5 px-6 text-center">Questions</th>
                  <th className="py-3.5 px-6 text-center">XP Reward</th>
                  <th className="py-3.5 px-6 text-right">Completion Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeResults.map((r) => {
                  const isPractice = r.source === 'practice';
                  const dateText = new Date(r.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={r.id} className="hover:bg-zinc-900/20 transition-all font-medium">
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isPractice 
                            ? 'bg-blue-950/60 text-blue-400 border-blue-500/20' 
                            : 'bg-purple-950/60 text-purple-400 border-purple-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isPractice ? 'bg-blue-400' : 'bg-purple-400'}`} />
                          {r.source}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-200">
                        {r.subject}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`font-black text-sm ${
                          r.score >= 80 
                            ? 'text-emerald-400' 
                            : r.score >= 60 
                              ? 'text-cyan-400' 
                              : 'text-rose-400'
                        }`}>
                          {r.score}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-400">
                        {r.totalQuestions}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-amber-400 font-extrabold flex items-center justify-center gap-0.5 text-[11px]">
                          <Zap className="w-3 h-3 fill-amber-400" />
                          +{r.xpEarned}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-zinc-500 font-mono text-[10px]">
                        {dateText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
