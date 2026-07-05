import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { 
  Brain, 
  Trophy, 
  Flame, 
  ChevronUp, 
  ChevronDown, 
  Award, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Star, 
  Users, 
  Medal, 
  Search,
  BookOpen,
  TrendingUp,
  Info
} from 'lucide-react';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  level: number;
  rank: string;
  school_id?: string;
  wins?: number;
  badges?: any;
}

export default function Leaderboard() {
  const { user, setUser } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number>(12);
  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overall' | 'weekly' | 'subject'>('overall');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Fallback African Scholars Seed Data (JAMB/WAEC Candidates)
  const defaultScholars: LeaderboardUser[] = [
    { id: 'sc-1', name: 'Babajide Alabi', points: 4120, level: 12, rank: 'Diamond Scholar', school_id: 'Kings College, Lagos', wins: 24, badges: ['Perfect Score', '7-Day Streak'] },
    { id: 'sc-2', name: 'Amina Yusuf', points: 3850, level: 10, rank: 'Diamond Scholar', school_id: 'Queens College, Yaba', wins: 19, badges: ['Curious Mind', 'Science Guru'] },
    { id: 'sc-3', name: 'Chidi Nwachukwu', points: 3410, level: 9, rank: 'Diamond Scholar', school_id: 'Federal Govt Academy, Suleja', wins: 15, badges: ['Speed Solver'] },
    { id: 'sc-4', name: 'Kwame Mensah', points: 2980, level: 8, rank: 'Gold Scholar', school_id: 'Achimota School, Accra', wins: 12, badges: ['First Exam'] },
    { id: 'sc-5', name: 'Ngozi Okafor', points: 2650, level: 7, rank: 'Gold Scholar', school_id: 'Loyola Jesuit College, Abuja', wins: 11 },
    { id: 'sc-6', name: 'Efua Hanson', points: 2150, level: 6, rank: 'Gold Scholar', school_id: 'Wesley Girls, Cape Coast', wins: 8 },
    { id: 'sc-7', name: 'Fatima Bello', points: 1820, level: 5, rank: 'Gold Scholar', school_id: 'Govt College, Kaduna', wins: 6 },
    { id: 'sc-8', name: 'Tobi Adebayo', points: 1450, level: 4, rank: 'Silver Scholar', school_id: 'Corona Secondary, Agbara', wins: 5 },
    { id: 'sc-9', name: 'Zainab Umar', points: 1100, level: 3, rank: 'Silver Scholar', school_id: 'Capital Science Academy', wins: 3 },
    { id: 'sc-10', name: 'Olumide Bakare', points: 890, level: 2, rank: 'Bronze Scholar', school_id: 'Lagos Model College', wins: 2 }
  ];

  // Subject-specific leaderboard seed map
  const subjectTopScholars: Record<string, LeaderboardUser[]> = {
    'Mathematics': [
      { id: 'sub-m1', name: 'Chidi Nwachukwu', points: 1980, level: 9, rank: 'Diamond Scholar' },
      { id: 'sub-m2', name: 'Babajide Alabi', points: 1750, level: 12, rank: 'Diamond Scholar' },
      { id: 'sub-m3', name: 'Emeka Obi', points: 1540, level: 8, rank: 'Gold Scholar' },
    ],
    'Physics': [
      { id: 'sub-p1', name: 'Amina Yusuf', points: 1840, level: 10, rank: 'Diamond Scholar' },
      { id: 'sub-p2', name: 'Tunde Bakare', points: 1620, level: 7, rank: 'Gold Scholar' },
      { id: 'sub-p3', name: 'Ngozi Okafor', points: 1390, level: 7, rank: 'Gold Scholar' },
    ],
    'Chemistry': [
      { id: 'sub-c1', name: 'Babajide Alabi', points: 1910, level: 12, rank: 'Diamond Scholar' },
      { id: 'sub-c2', name: 'Amina Yusuf', points: 1780, level: 10, rank: 'Diamond Scholar' },
      { id: 'sub-c3', name: 'Zainab Umar', points: 1250, level: 3, rank: 'Silver Scholar' },
    ],
    'Biology': [
      { id: 'sub-b1', name: 'Efua Hanson', points: 1650, level: 6, rank: 'Gold Scholar' },
      { id: 'sub-b2', name: 'Fatima Bello', points: 1590, level: 5, rank: 'Gold Scholar' },
      { id: 'sub-b3', name: 'Chioma Ajunwa', points: 1310, level: 4, rank: 'Silver Scholar' },
    ]
  };

  // Sync / Fetch data from Supabase or proxy endpoints
  const fetchLeaderboardData = async () => {
    setIsSyncing(true);
    try {
      let queriedUsers: LeaderboardUser[] = [];
      let currentPoints = user?.points ?? 0;

      // 1. Fetch user profile points directly from DB if available to get the freshest live score
      if (supabase && user && user.id && user.id !== '1') {
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('points')
            .eq('id', user.id)
            .single();

          if (!profileErr && profile) {
            currentPoints = Number(profile.points ?? 0);
            if (user.points !== currentPoints) {
              // Sync points to store state
              setUser({ ...user, points: currentPoints });
            }
          } else {
            // Try fallback table 'users'
            const { data: authUser, error: authUserErr } = await supabase
              .from('users')
              .select('points')
              .eq('id', user.id)
              .single();
            if (!authUserErr && authUser) {
              currentPoints = Number(authUser.points ?? 0);
              setUser({ ...user, points: currentPoints });
            }
          }
        } catch (sbProfileErr) {
          console.warn('Failed to fetch user fresh points:', sbProfileErr);
        }
      }

      setCurrentUserPoints(currentPoints);

      // 2. Fetch Leaderboard from custom proxy route or direct Supabase tables
      let fetchedFromSupabase = false;
      if (supabase) {
        try {
          // Try user_profiles table first
          const { data: profileList, error: profileErr } = await supabase
            .from('user_profiles')
            .select('id, name, points, level, rank, school_id, wins, badges')
            .order('points', { ascending: false })
            .limit(30);

          if (!profileErr && profileList && profileList.length > 0) {
            queriedUsers = profileList.map((p: any) => ({
              id: p.id,
              name: p.name || 'Anonymous Scholar',
              points: Number(p.points ?? 0),
              level: Number(p.level ?? 1),
              rank: p.rank || 'Bronze Scholar',
              school_id: p.school_id,
              wins: p.wins,
              badges: p.badges
            }));
            fetchedFromSupabase = true;
          } else {
            // Try alternative table 'users'
            const { data: userList, error: userErr } = await supabase
              .from('users')
              .select('id, name, points, role, badges')
              .order('points', { ascending: false })
              .limit(30);

            if (!userErr && userList && userList.length > 0) {
              queriedUsers = userList.map((u: any) => ({
                id: u.id,
                name: u.name || 'Student Candidate',
                points: Number(u.points ?? 0),
                level: Math.floor(Number(u.points ?? 0) / 400) + 1,
                rank: u.role === 'admin' ? 'Educator Pro' : 'Academy Cadet',
                badges: u.badges
              }));
              fetchedFromSupabase = true;
            }
          }
        } catch (dbErr) {
          console.warn('Direct Supabase leaderboard fetch error:', dbErr);
        }
      }

      if (!fetchedFromSupabase) {
        // Try standard proxy GET endpoint
        try {
          const res = await fetch('/api/leaderboard');
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              queriedUsers = list.map((item: any) => ({
                id: item.id || `l-${Math.random()}`,
                name: item.name || 'Candidate Scholar',
                points: Number(item.points ?? 0),
                level: Number(item.level ?? 1),
                rank: item.rank || 'Bronze Scholar',
                school_id: item.school_id,
                wins: item.wins,
                badges: item.badges
              }));
            }
          }
        } catch (apiErr) {
          console.error('API proxy leaderboard query failed:', apiErr);
        }
      }

      // 3. Process Rank Position of Logged-In User
      if (user && user.id) {
        // Check if user is in the queried list
        const listIndex = queriedUsers.findIndex(u => u.id === user.id);
        if (listIndex !== -1) {
          setCurrentUserRank(listIndex + 1);
        } else if (supabase) {
          // If user is outside the top 30 list, query their exact count rank
          try {
            let rankTable = 'user_profiles';
            const { error: testErr } = await supabase.from('user_profiles').select('id').limit(1);
            if (testErr) rankTable = 'users';

            const { count, error: countErr } = await supabase
              .from(rankTable)
              .select('*', { count: 'exact', head: true })
              .gt('points', currentPoints);

            if (!countErr && typeof count === 'number') {
              setCurrentUserRank(count + 1);
            } else {
              setCurrentUserRank(12); // Default fallback
            }
          } catch (rErr) {
            setCurrentUserRank(12);
          }
        } else {
          setCurrentUserRank(12);
        }
      }

      setLeaderboard(queriedUsers);
    } catch (globalErr) {
      console.error('Unified leaderboard load error:', globalErr);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run initial query on mount or when auth user switches
  useEffect(() => {
    fetchLeaderboardData();
  }, [user]);

  // Merge loaded database items with static fallbacks if db lists are entirely empty
  const activeLeaderboard = useMemo(() => {
    if (leaderboard.length > 0) {
      // Ensure current user is in the visual array for a flawless UX if logged in
      const hasMe = leaderboard.some(u => u.id === user?.id);
      if (!hasMe && user && currentUserPoints > 0) {
        const meItem: LeaderboardUser = {
          id: user.id,
          name: `${user.name} (You)`,
          points: currentUserPoints,
          level: user.level || 3,
          rank: currentUserPoints >= 3000 ? 'Diamond Scholar' : currentUserPoints >= 1500 ? 'Gold Scholar' : 'Silver Scholar',
          school_id: user.school_id || 'Self Study Student'
        };
        const list = [...leaderboard, meItem];
        return list.sort((a, b) => b.points - a.points);
      }
      return leaderboard;
    }
    
    // Default list injection containing local user
    const list = [...defaultScholars];
    if (user) {
      const meIndex = list.findIndex(u => u.id === user.id);
      if (meIndex === -1) {
        list.push({
          id: user.id,
          name: `${user.name} (You)`,
          points: currentUserPoints || 1500,
          level: user.level || 5,
          rank: 'Gold Scholar',
          school_id: user.school_id || 'Lagos High'
        });
      }
    }
    return list.sort((a, b) => b.points - a.points);
  }, [leaderboard, user, currentUserPoints]);

  // Podium Positions (1st, 2nd, 3rd)
  const podiumScholars = useMemo(() => {
    if (activeTab === 'subject') {
      return subjectTopScholars[selectedSubject] || [];
    }
    
    if (activeTab === 'weekly') {
      // Create a nice variation of general leaderboard scores
      return activeLeaderboard.slice(0, 3).map((item, idx) => ({
        ...item,
        points: Math.round(item.points * 0.25) + (idx === 0 ? 120 : idx === 1 ? 80 : 40)
      }));
    }

    return activeLeaderboard.slice(0, 3);
  }, [activeLeaderboard, activeTab, selectedSubject]);

  // List of remainder scholars
  const remainderScholars = useMemo(() => {
    const list = activeTab === 'subject' 
      ? (subjectTopScholars[selectedSubject]?.slice(3) || []) 
      : activeLeaderboard.slice(3);

    // Apply text search filtering dynamically
    if (searchQuery.trim().length > 0) {
      return list.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.school_id && u.school_id.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return list;
  }, [activeLeaderboard, activeTab, selectedSubject, searchQuery]);

  // Call server-side API or provide heuristic fallback for AI Coaching insight
  const fetchLeaderboardAICoachInsight = async () => {
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const topThree = podiumScholars.map(s => ({ name: s.name, points: s.points }));
      const response = await fetch('/api/ai/leaderboard-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: currentUserRank,
          points: currentUserPoints || (user?.points ?? 0),
          topUsers: topThree,
          activeChallenge: activeTab === 'weekly' ? 'WAEC/JAMB Weekly Speed Sprint' : `Subject Dominance (${selectedSubject})`
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

    // Heuristic Fallback
    setTimeout(() => {
      let advice = '';
      if (currentUserRank <= 3) {
        advice = `🌟 **Elite Status Achieved!** Holding position #${currentUserRank} is an exceptional feat. Defend your throne by maintaining a daily 15-question sprint in Chemistry or Physics!`;
      } else if (currentUserRank <= 10) {
        advice = `🔥 **Stellar position!** You are currently in the Top 10 at Rank #${currentUserRank}. Solve one targeted mock exam in WAEC Mathematics tonight to override #${currentUserRank - 1} and reach the podium!`;
      } else {
        const pointsDiff = podiumScholars[2] ? (podiumScholars[2].points - (currentUserPoints || 1500)) : 400;
        advice = `📈 **Podium within sight!** You are currently Rank #${currentUserRank} with ${currentUserPoints || 1500} XP. You need approximately **${Math.max(pointsDiff, 100)} more XP** to breach the top 3. Double your streak multiplier now!`;
      }
      setAiInsight(advice);
      setIsAiLoading(false);
    }, 1200);
  };

  // Run AI Insight generation when user variables or tabs switch
  useEffect(() => {
    fetchLeaderboardAICoachInsight();
  }, [currentUserRank, currentUserPoints, activeTab, selectedSubject]);

  // Gamification: Simulates gaining XP instantly inside live database for direct interactive review!
  const handleSimulateGainXP = async () => {
    if (!user) return;
    setIsSyncing(true);
    const addedXP = 150;
    const nextPoints = (currentUserPoints || user.points || 0) + addedXP;

    // Direct Supabase upsert for genuine state persistence!
    if (supabase && user.id && user.id !== '1') {
      try {
        let profileTable = 'user_profiles';
        // Test which table exists
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
        console.warn('Failed to persist simulated points to Supabase:', err);
      }
    }

    // Refresh states
    setCurrentUserPoints(nextPoints);
    setUser({
      ...user,
      points: nextPoints,
      level: Math.floor(nextPoints / 400) + 1
    });

    // Refresh entire leaderboard dynamically
    await fetchLeaderboardData();
  };

  // User League Calculation
  const leagueTier = useMemo(() => {
    const pts = currentUserPoints || (user?.points ?? 0);
    if (pts >= 3000) return { name: 'Diamond Scholar League', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/20' };
    if (pts >= 1500) return { name: 'Gold Scholar League', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/20' };
    if (pts >= 500) return { name: 'Silver Scholar League', color: 'text-zinc-300 bg-zinc-900 border-white/5' };
    return { name: 'Bronze Scholar League', color: 'text-orange-400 bg-orange-950/40 border-orange-500/20' };
  }, [currentUserPoints, user]);

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-zinc-950 text-white min-h-screen font-sans">
      
      {/* Header and Sync Indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Academic Leaderboard</h1>
          </div>
          <p className="text-zinc-400 text-sm flex items-center gap-1.5 flex-wrap">
            {user ? (
              <>
                <Users className="w-4 h-4 text-cyan-400" />
                Live national competition active. Competing as <span className="text-zinc-200 font-bold">{user.name}</span>
                {leaderboard.length > 0 ? (
                  <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                    Live Postgres Sync
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold bg-amber-950/50 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px]">
                    Showing Elite Contenders
                  </span>
                )}
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-amber-500" />
                Showing guest arena stats — log in to sync your score!
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            variant="outline" 
            onClick={fetchLeaderboardData}
            disabled={isSyncing}
            className="rounded-xl border-white/10 bg-zinc-900/60 hover:bg-zinc-900 hover:border-white/20 text-zinc-300 gap-2 h-10 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Leaderboard
          </Button>

          {user && (
            <Button 
              onClick={handleSimulateGainXP}
              disabled={isSyncing}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-black uppercase tracking-wider text-[11px] gap-2 shadow-lg shadow-cyan-950/50 h-10"
            >
              <Zap className="w-3.5 h-3.5 fill-black animate-bounce" />
              Gain +150 XP Boost
            </Button>
          )}
        </div>
      </div>

      {/* Top Rank Hero Banner */}
      <Card className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-purple-950/60 border border-purple-500/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-zinc-500 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Your Current Academic Standing
            </h2>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl sm:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
                #{currentUserRank}
              </p>
              <span className="text-zinc-400 text-xs font-bold">out of thousands nationwide</span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              You currently have <span className="text-cyan-400 font-bold">{currentUserPoints || (user?.points ?? 0)} cumulative points</span> across all exams.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-white/5 rounded-2xl min-w-[140px] shadow-md">
              <div className="p-2.5 bg-orange-950/50 border border-orange-500/20 rounded-xl">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">Active Streak</p>
                <p className="font-extrabold text-sm text-zinc-100">12 Days Active</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-4 border rounded-2xl min-w-[160px] shadow-md ${leagueTier.color}`}>
              <div className="p-2.5 bg-zinc-950/80 rounded-xl">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">Competition Tier</p>
                <p className="font-extrabold text-xs text-zinc-100">{leagueTier.name.split(' ')[0]} League</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Leaderboard Interactive Tabs Selector */}
      <div className="flex justify-between items-center gap-4 border-b border-white/5 pb-2 flex-wrap">
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => { setActiveTab('overall'); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'overall' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Overall Scholars
          </button>
          <button
            onClick={() => { setActiveTab('weekly'); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'weekly' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Weekly Challenge
          </button>
          <button
            onClick={() => { setActiveTab('subject'); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'subject' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Subject Masters
          </button>
        </div>

        {/* Dynamic subject select dropdown shown only in Subject Masters tab */}
        {activeTab === 'subject' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        )}
      </div>

      {/* Podium Visualization Cards (Top 3 Scholars) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        <AnimatePresence mode="wait">
          {podiumScholars.map((scholar, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;
            
            // Layout Order: 2nd place on left, 1st in center, 3rd on right
            const positionOrder = isFirst ? 'order-1 md:order-2' : isSecond ? 'order-2 md:order-1' : 'order-3';
            const themeColor = isFirst 
              ? 'from-amber-400 to-yellow-600 shadow-yellow-950/30' 
              : isSecond 
                ? 'from-zinc-300 to-zinc-500 shadow-zinc-950/30' 
                : 'from-amber-600 to-orange-800 shadow-orange-950/30';
            
            const badgeIcon = isFirst ? '👑' : isSecond ? '🥈' : '🥉';

            return (
              <motion.div
                key={scholar.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`${positionOrder} w-full`}
              >
                <Card className={`relative overflow-hidden bg-zinc-900 border-white/5 rounded-3xl p-6 text-center shadow-xl group transition-all duration-300 hover:border-white/10 ${
                  isFirst ? 'md:py-10 border-cyan-500/20 shadow-cyan-950/10' : ''
                }`}>
                  {/* Decorative glow top corner */}
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${themeColor} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-all`} />

                  {/* Place Badge Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-2xl font-black bg-gradient-to-br ${themeColor} text-black border-4 border-zinc-900 shadow-lg shadow-black/40`}>
                      {badgeIcon}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-black text-base text-zinc-100 truncate group-hover:text-cyan-400 transition-colors">
                      {scholar.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold truncate">
                      {scholar.school_id || 'Top Tier Academic Academy'}
                    </p>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1 bg-zinc-950 border border-white/5 px-4 py-1.5 rounded-full shadow-inner">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-mono text-sm font-black text-cyan-400">{scholar.points} XP</span>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-center gap-1 text-[9px] text-zinc-400 font-semibold uppercase">
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-white/5">
                      LVL {scholar.level || 5}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-white/5">
                      {scholar.rank.replace(' Scholar', '')}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Main Leaderboard Search & Rest List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        
        {/* Left Column: Remaining Leaderboard Contenders (8 Span) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-zinc-900/40 border-white/5 rounded-3xl overflow-hidden shadow-xl">
            
            <CardHeader className="border-b border-white/5 bg-zinc-950/40 pb-5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-white">Full Arena Contenders</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Search and explore students pushing boundaries in the national arena</CardDescription>
              </div>

              {/* Dynamic search query input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Filter student or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-cyan-500/30 placeholder-zinc-600 transition-all"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {remainderScholars.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Search className="w-8 h-8 text-zinc-600" />
                  <p className="text-xs font-semibold">No scholars match your search filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] bg-zinc-950/20">
                        <th className="py-4 px-6 text-center w-16">Rank</th>
                        <th className="py-4 px-6">Scholar Student</th>
                        <th className="py-4 px-6">Primary Institution</th>
                        <th className="py-4 px-6 text-center">Score Accuracy</th>
                        <th className="py-4 px-6 text-center">Competition Level</th>
                        <th className="py-4 px-6 text-right">Accumulated XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {remainderScholars.map((scholar, idx) => {
                        const rankNumber = activeTab === 'subject' ? idx + 4 : activeLeaderboard.indexOf(scholar) + 1;
                        const isLoggedUser = user && user.id === scholar.id;
                        
                        return (
                          <tr 
                            key={scholar.id} 
                            className={`hover:bg-zinc-900/30 transition-all font-medium ${
                              isLoggedUser ? 'bg-cyan-950/10 border-l-2 border-l-cyan-500' : ''
                            }`}
                          >
                            <td className="py-4 px-6 text-center font-black text-zinc-400 text-sm">
                              #{rankNumber}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full font-black text-xs flex items-center justify-center bg-zinc-900 text-zinc-300 border border-white/5 ${
                                  isLoggedUser ? 'bg-cyan-950/50 border-cyan-500/20 text-cyan-400' : ''
                                }`}>
                                  {scholar.name.charAt(0)}
                                </div>
                                <div>
                                  <span className={`font-bold block truncate max-w-[150px] ${
                                    isLoggedUser ? 'text-cyan-400 font-black' : 'text-zinc-200'
                                  }`}>
                                    {scholar.name}
                                  </span>
                                  {isLoggedUser && (
                                    <span className="text-[8px] bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 px-1 py-0.2 rounded font-extrabold uppercase">
                                      Your Profile
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-zinc-400 truncate max-w-[180px]" title={scholar.school_id}>
                              {scholar.school_id || 'Direct Candidate'}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="font-extrabold text-xs text-zinc-300 flex items-center justify-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                {scholar.wins ? `${scholar.wins * 3 + 45}%` : '78%'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-zinc-950 border border-white/5 text-zinc-300 uppercase">
                                LVL {scholar.level || 5}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="text-cyan-400 font-mono font-black text-sm flex items-center justify-end gap-1">
                                <Zap className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                                {scholar.points}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

          </Card>
        </div>

        {/* Right Column: AI Insights & Weekly Challenge Box (4 Span) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* AI Coach Competitive Insight */}
          <Card className="bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border-purple-500/20 rounded-3xl relative overflow-hidden shadow-xl p-6 flex flex-col justify-between h-fit min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-950/50 border border-purple-500/30 rounded-xl">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-purple-100">AI Competitor Analyst</h3>
                </div>
                <Button 
                  onClick={fetchLeaderboardAICoachInsight}
                  disabled={isAiLoading}
                  size="icon"
                  variant="ghost"
                  className="rounded-lg h-8 w-8 hover:bg-purple-950/40 text-purple-300"
                  title="Refresh competitor coaching tip"
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
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing rankings...
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
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Actionable tip tailored to your rank
              </p>
            </div>
          </Card>

          {/* Weekly Interactive Challenge Highlight Card */}
          <Card className="bg-zinc-900/40 border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 bg-zinc-950/40 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <Medal className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide text-zinc-100">Weekly Speed Sprint</h4>
                <p className="text-[10px] text-zinc-500">Solve mock tests under 30 minutes to claim rewards</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                  <span>Syllabus Target:</span>
                  <span className="text-zinc-200">Math & Physics Formulas</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                  <span>Bonus Reward:</span>
                  <span className="text-amber-400 font-extrabold">+500 bonus XP</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                  <span>Time Remaining:</span>
                  <span className="text-rose-400 font-extrabold">2 Days, 5 Hours</span>
                </div>
              </div>

              {/* Progress Bar of Challenge */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-baseline text-[10px] font-bold">
                  <span className="text-zinc-500 uppercase">Your Challenge Progress</span>
                  <span className="text-cyan-400">3 / 5 completed</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full w-3/5" />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => { setActiveTab('weekly'); }}
                  className="w-full rounded-xl bg-zinc-950 border border-white/5 hover:bg-zinc-900 hover:border-white/10 text-xs font-bold text-zinc-200 h-10"
                >
                  View Challenge Participants
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
