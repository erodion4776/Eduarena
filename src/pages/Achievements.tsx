import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Award, 
  Zap, 
  BookOpen, 
  Brain, 
  Flame, 
  Star, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Info,
  BadgeAlert,
  HelpCircle
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'Academic' | 'AI Learning' | 'Consistency' | 'Performance';
  xp_reward: number;
  isUnlocked?: boolean;
  progress?: number;
  unlocked_at?: string | null;
}

export default function Achievements() {
  const { user, setUser } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // AI Coach Insights
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Fallback default achievements list matching sql/init.sql seed
  const defaultAchievements: Achievement[] = [
    { id: 'ac-1', title: 'First Exam Completed', description: 'Complete your very first practice CBT test.', category: 'Academic', xp_reward: 100 },
    { id: 'ac-2', title: 'Perfect Score Master', description: 'Get a flawless 100% score on any topic test.', category: 'Academic', xp_reward: 300 },
    { id: 'ac-3', title: 'Curious Mind', description: 'Inquire with the AI Tutor 10 times during practice.', category: 'AI Learning', xp_reward: 150 },
    { id: 'ac-4', title: 'Consistency King', description: 'Maintain a study streak of 7 active days.', category: 'Consistency', xp_reward: 250 },
    { id: 'ac-5', title: 'Speed Solver Champion', description: 'Complete a full WAEC or JAMB exam under 30 minutes.', category: 'Performance', xp_reward: 200 },
    { id: 'ac-6', title: 'Subject Champion', description: 'Pass tests of 5 different subjects.', category: 'Academic', xp_reward: 250 }
  ];

  // Map category to styles/colors
  const categoryMeta: Record<string, { color: string; bg: string; border: string; icon: any }> = {
    'Academic': { color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-500/20', icon: Award },
    'AI Learning': { color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-500/20', icon: Brain },
    'Consistency': { color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-500/20', icon: Flame },
    'Performance': { color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-500/20', icon: Zap }
  };

  const getCategoryMeta = (cat: string) => {
    return categoryMeta[cat] || { color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-white/5', icon: Trophy };
  };

  // Fetch Achievements from database or fallback to presets
  const fetchAchievementsData = async () => {
    setIsSyncing(true);
    try {
      let dbAchievements: Achievement[] = [];
      let dbUnlockedIds: string[] = [];

      // 1. Fetch available achievements
      if (supabase) {
        try {
          const { data, error } = await supabase.from('achievements').select('*');
          if (!error && data && data.length > 0) {
            dbAchievements = data as Achievement[];
          }
        } catch (dbErr) {
          console.warn('Direct Achievements select failed:', dbErr);
        }
      }

      // If db is empty/unavailable, use defaults
      if (dbAchievements.length === 0) {
        dbAchievements = [...defaultAchievements];
      }

      // 2. Fetch user's unlocked milestones
      if (supabase && user && user.id && user.id !== '1') {
        try {
          const { data: unlocked, error: unlockedErr } = await supabase
            .from('user_achievements')
            .select('achievement_id, progress')
            .eq('user_id', user.id);

          if (!unlockedErr && unlocked) {
            dbUnlockedIds = unlocked.map((u: any) => u.achievement_id);
          }
        } catch (sbUnlockedErr) {
          console.warn('Failed to retrieve user unlocked achievements:', sbUnlockedErr);
        }
      }

      setUnlockedIds(dbUnlockedIds);
      
      // Merge status flags
      const merged = dbAchievements.map(ach => {
        const isUnlocked = dbUnlockedIds.includes(ach.id);
        return {
          ...ach,
          isUnlocked,
          progress: isUnlocked ? 100 : 0
        };
      });

      setAchievements(merged);
    } catch (globalErr) {
      console.error('Unified achievements query error:', globalErr);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on mount or when user changes
  useEffect(() => {
    fetchAchievementsData();
  }, [user]);

  // Dynamically Filtered Achievements
  const filteredAchievements = useMemo(() => {
    return achievements.filter(ach => {
      const matchStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'unlocked' 
          ? ach.isUnlocked 
          : !ach.isUnlocked;

      const matchCategory = categoryFilter === 'all' 
        ? true 
        : ach.category === categoryFilter;

      return matchStatus && matchCategory;
    });
  }, [achievements, statusFilter, categoryFilter]);

  // Aggregate values
  const totalCount = achievements.length || 6;
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100) || 0;
  
  const totalXpGained = useMemo(() => {
    return achievements
      .filter(a => a.isUnlocked)
      .reduce((sum, current) => sum + current.xp_reward, 0);
  }, [achievements]);

  // Fetch AI Coaching Insight on milestones
  const fetchAchievementsAIInsight = async () => {
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const unlockedList = achievements.filter(a => a.isUnlocked).map(a => a.title);
      const lockedList = achievements.filter(a => !a.isUnlocked).map(a => a.title);

      const response = await fetch('/.netlify/functions/achievements-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unlockedCount,
          totalCount,
          totalXp: user?.points ?? 1200,
          unlockedList,
          lockedList
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
      console.warn('AI achievements analyst failed, using heuristic fallback:', err);
    }

    // Heuristic Fallback
    setTimeout(() => {
      let advice = '';
      if (unlockedCount === 0) {
        advice = `👋 **Let's kickstart your academic milestone track!** Complete your first practice test in the Exam Arena to unlock **First Exam Completed** and gain your first 100 XP bonus.`;
      } else if (unlockedCount === totalCount) {
        advice = `👑 **Ultimate Achievement Unlocked!** You have fully cleared all academic milestones and conquered the leaderboard metrics. Continue taking custom practice quizzes to sustain your dominance.`;
      } else {
        const nextTarget = achievements.find(a => !a.isUnlocked);
        advice = `⚡ **Spectacular learning momentum!** You have conquered ${unlockedCount} out of ${totalCount} milestones. Focus on unlocking the **${nextTarget?.title ?? 'Perfect Score Master'}** badge next to secure an instant boost of +${nextTarget?.xp_reward ?? 250} XP.`;
      }
      setAiInsight(advice);
      setIsAiLoading(false);
    }, 1200);
  };

  // Trigger AI advice when active milestones state alters
  useEffect(() => {
    if (achievements.length > 0) {
      fetchAchievementsAIInsight();
    }
  }, [unlockedCount, achievements.length]);

  // Simulates unlocking a specific locked achievement inside Postgres live
  const handleSimulateUnlock = async (achievementId: string, rewardXp: number) => {
    if (!user) return;
    setIsSyncing(true);

    const nextPoints = (user.points || 0) + rewardXp;

    if (supabase && user.id && user.id !== '1') {
      try {
        // 1. Insert/Upsert user_achievements record
        await supabase
          .from('user_achievements')
          .upsert({
            user_id: user.id,
            achievement_id: achievementId,
            progress: 100,
            unlocked_at: new Date().toISOString()
          }, { onConflict: 'user_id,achievement_id' });

        // 2. Refresh points on user/profiles
        let profileTable = 'user_profiles';
        const { error: testErr } = await supabase.from('user_profiles').select('id').limit(1);
        if (testErr) profileTable = 'users';

        if (profileTable === 'user_profiles') {
          await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              name: user.name,
              email: user.email,
              points: nextPoints,
              level: Math.floor(nextPoints / 400) + 1,
              updated_at: new Date().toISOString()
            });
        } else {
          await supabase
            .from('users')
            .update({ points: nextPoints })
            .eq('id', user.id);
        }
      } catch (err) {
        console.warn('Failed to record achievement to database:', err);
      }
    }

    // Sync to store state
    setUser({
      ...user,
      points: nextPoints,
      level: Math.floor(nextPoints / 400) + 1
    });

    // Reload list
    await fetchAchievementsData();
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-zinc-950 text-white min-h-screen font-sans">
      
      {/* Header section with live sync */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Academic Milestones</h1>
          </div>
          <p className="text-zinc-400 text-sm flex items-center gap-1.5 flex-wrap">
            {user ? (
              <>
                <Award className="w-4 h-4 text-cyan-400" />
                Competency rewards tracker active for student <span className="text-zinc-200 font-bold">{user.name}</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                  Supabase Persistent Sync
                </span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-amber-500" />
                Guest mode — sign in to save your milestone progress!
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            onClick={fetchAchievementsData}
            disabled={isSyncing}
            className="rounded-xl border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/20 text-zinc-300 gap-2 h-10 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Progress
          </Button>
        </div>
      </div>

      {/* Hero Achievement metrics summary card */}
      <Card className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-purple-950/60 border border-purple-500/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Unlocked Stats & Progress Bar */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-zinc-500 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Competency Completion Status
            </h2>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <p className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {unlockedCount} <span className="text-zinc-500 text-2xl font-bold">/ {totalCount}</span>
                </p>
                <p className="text-cyan-400 font-extrabold text-sm">{completionPercentage}% Unlocked</p>
              </div>
              <div className="w-full bg-zinc-950 border border-white/5 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-teal-400 rounded-full transition-all duration-700"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-zinc-400 text-xs font-medium">
              You have secured <span className="text-cyan-400 font-bold">+{totalXpGained} XP</span> in milestone reward bonuses. Earn more by finishing WAEC syllabus goals!
            </p>
          </div>

          {/* Core Info Badges Grid */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3.5 bg-zinc-900/40 border border-white/5 rounded-2xl shadow-md">
              <Flame className="w-7 h-7 text-orange-400 mx-auto mb-1" />
              <p className="font-black text-lg text-zinc-100">12 Days</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Study Streak</p>
            </div>
            <div className="text-center p-3.5 bg-zinc-900/40 border border-white/5 rounded-2xl shadow-md">
              <Award className="w-7 h-7 text-yellow-400 mx-auto mb-1" />
              <p className="font-black text-lg text-zinc-100">Level {user?.level ?? 5}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Current Tier</p>
            </div>
            <div className="text-center p-3.5 bg-zinc-900/40 border border-white/5 rounded-2xl shadow-md animate-pulse">
              <Sparkles className="w-7 h-7 text-cyan-400 mx-auto mb-1" />
              <p className="font-black text-lg text-zinc-100">{user?.points ?? 1200}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total XP</p>
            </div>
          </div>

        </div>
      </Card>

      {/* Interactive Status & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        
        {/* Status Filters */}
        <div className="flex bg-zinc-900/85 p-1 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Badges
          </button>
          <button
            onClick={() => setStatusFilter('unlocked')}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              statusFilter === 'unlocked' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Unlocked
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              statusFilter === 'locked' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Locked
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-1">Category:</span>
          {['all', 'Academic', 'AI Learning', 'Consistency', 'Performance'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                categoryFilter === cat 
                  ? 'bg-zinc-800 border-cyan-500/30 text-cyan-400' 
                  : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat === 'all' ? 'Show All' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        
        {/* Left Column: Milestones Showcase List (8 Span) */}
        <div className="lg:col-span-8 space-y-6">
          {filteredAchievements.length === 0 ? (
            <div className="p-16 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <BadgeAlert className="w-10 h-10 text-zinc-600 animate-bounce" />
              <div>
                <p className="text-sm font-bold text-zinc-300">No Milestones Found</p>
                <p className="text-xs text-zinc-500 mt-1">Adjust your filters to display matching academic badges</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredAchievements.map((ach, idx) => {
                  const meta = getCategoryMeta(ach.category);
                  const IconComp = meta.icon;

                  return (
                    <motion.div
                      key={ach.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className={`relative overflow-hidden bg-zinc-900/40 border transition-all duration-300 rounded-3xl p-6 group ${
                        ach.isUnlocked 
                          ? 'border-cyan-500/20 shadow-cyan-950/5' 
                          : 'border-white/5 hover:border-white/10 opacity-70'
                      }`}>
                        {/* Status absolute top marker */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                          {ach.isUnlocked ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Unlocked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-500 bg-zinc-950 border border-white/5 px-2.5 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>

                        {/* Category Badge Icon and Meta */}
                        <div className="flex gap-4">
                          <div className={`p-3 rounded-2xl h-12 w-12 flex items-center justify-center border shrink-0 ${meta.bg} ${meta.border} ${meta.color}`}>
                            <IconComp className="w-6 h-6" />
                          </div>

                          <div className="space-y-1 pr-16">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${meta.color}`}>
                              {ach.category}
                            </span>
                            <h4 className="font-extrabold text-base text-zinc-100 group-hover:text-cyan-400 transition-colors">
                              {ach.title}
                            </h4>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-400 mt-4 leading-relaxed font-medium">
                          {ach.description}
                        </p>

                        {/* Progress Bar indicator */}
                        <div className="mt-6 space-y-1.5">
                          <div className="flex justify-between items-baseline text-[10px] font-bold">
                            <span className="text-zinc-500 uppercase">Milestone Progress</span>
                            <span className={ach.isUnlocked ? 'text-emerald-400' : 'text-zinc-400'}>
                              {ach.isUnlocked ? '100%' : '0%'}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-950 border border-white/5 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                ach.isUnlocked ? 'bg-emerald-400' : 'bg-zinc-800'
                              }`} 
                              style={{ width: ach.isUnlocked ? '100%' : '0%' }}
                            />
                          </div>
                        </div>

                        {/* Reward XP block and simulation trigger */}
                        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1 bg-zinc-950 border border-white/5 px-3 py-1 rounded-full">
                            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                            <span className="font-mono text-xs font-black text-cyan-400">+{ach.xp_reward} XP Reward</span>
                          </div>

                          {/* Quick simulate complete button if logged in and locked */}
                          {!ach.isUnlocked && user && (
                            <Button
                              onClick={() => handleSimulateUnlock(ach.id, ach.xp_reward)}
                              disabled={isSyncing}
                              size="sm"
                              className="rounded-xl bg-zinc-800 hover:bg-cyan-500 hover:text-black border border-white/5 text-[10px] font-black uppercase h-8 transition-all px-3"
                            >
                              Simulate Earn
                            </Button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column: AI Competitor Insight & Level Ladder (4 Span) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* AI Coach Milestones Strategic Insight Card */}
          <Card className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border-purple-500/20 rounded-3xl relative overflow-hidden shadow-xl p-6 flex flex-col justify-between h-fit min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-950/50 border border-purple-500/30 rounded-xl">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-purple-100">AI Competency Coach</h3>
                </div>
                <Button 
                  onClick={fetchAchievementsAIInsight}
                  disabled={isAiLoading}
                  size="icon"
                  variant="ghost"
                  className="rounded-lg h-8 w-8 hover:bg-purple-950/40 text-purple-300"
                  title="Recalculate study milestones suggestion"
                >
                  <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-pulse text-purple-400' : ''}`} />
                </Button>
              </div>

              {isAiLoading ? (
                <div className="space-y-3 py-6">
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-3/4" />
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-full" />
                  <div className="h-4 bg-purple-950/40 rounded-md animate-pulse w-5/6" />
                  <div className="flex items-center gap-2 text-xs text-purple-300 mt-2 font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Assessing performance logs...
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{
                  __html: aiInsight
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="text-purple-300 font-bold">$1</em>')
                }} />
              )}
            </div>

            <div className="border-t border-purple-500/10 pt-4 mt-6">
              <p className="text-[10px] text-purple-400/80 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Actionable tip tailored to your locked badges
              </p>
            </div>
          </Card>

          {/* Gamified Level Progress/Roadmap Card */}
          <Card className="bg-zinc-900/40 border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 bg-zinc-950/40 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide text-zinc-100">Scholar Level Roadmap</h4>
                <p className="text-[10px] text-zinc-500">Reach higher leagues and unlock special privileges</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="relative border-l border-zinc-800 pl-4 space-y-6 text-xs">
                
                {/* Level 4 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-cyan-400 border border-zinc-950" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-200">💎 Diamond Scholar League</p>
                    <p className="text-[10px] text-cyan-400 font-mono font-bold">Requirement: 3,000+ XP</p>
                  </div>
                </div>

                {/* Level 3 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-yellow-400 border border-zinc-950" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-200">🥇 Gold Scholar League</p>
                    <p className="text-[10px] text-yellow-400 font-mono font-bold">Requirement: 1,500 - 2,999 XP</p>
                  </div>
                </div>

                {/* Level 2 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-zinc-400 border border-zinc-950" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-200">🥈 Silver Scholar League</p>
                    <p className="text-[10px] text-zinc-400 font-mono font-bold">Requirement: 500 - 1,499 XP</p>
                  </div>
                </div>

                {/* Level 1 */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-orange-400 border border-zinc-950" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-200">🥉 Bronze Scholar League</p>
                    <p className="text-[10px] text-orange-400 font-mono font-bold">Requirement: 0 - 499 XP</p>
                  </div>
                </div>

              </div>

              <div className="bg-zinc-950/50 rounded-2xl border border-white/5 p-4 space-y-2 text-center">
                <HelpCircle className="w-5 h-5 text-zinc-500 mx-auto" />
                <p className="text-[10px] font-bold text-zinc-400">XP rewards apply directly to your national ranking standings. Climb leagues to stand out!</p>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
