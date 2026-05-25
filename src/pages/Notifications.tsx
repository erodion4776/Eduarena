import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/useAuthStore';
import { 
  Bell, 
  Brain, 
  FileEdit, 
  Target, 
  Trophy, 
  Swords, 
  Settings, 
  CircleAlert, 
  Clock, 
  Check, 
  Sparkles, 
  Trash2, 
  BellOff 
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ai' | 'exam' | 'study' | 'gamification' | 'leaderboard' | 'system';
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
  action_link?: string;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [generating, setGenerating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        // Mock fallback if supabase is not initialized
        setNotifications(getMockNotifications());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setNotifications(data);
      } else {
        // If absolutely empty, populate default ones
        const defaults = getMockNotifications();
        // Try inserting standard mocks for active visual experience
        if (user) {
          const insertedMocks = defaults.map(d => ({
            ...d,
            id: undefined, // Let db generate uuid
            user_id: user.id
          }));
          const { data: insertedData } = await supabase
            .from('notifications')
            .insert(insertedMocks)
            .select();
          if (insertedData) {
            setNotifications(insertedData);
          } else {
            setNotifications(defaults);
          }
        } else {
          setNotifications(defaults);
        }
      }
    } catch (err) {
      console.error(err);
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      if (!supabase) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
    try {
      if (!supabase || !user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification cleared');
    try {
      if (!supabase) return;
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerAIEngine = async () => {
    setGenerating(true);
    try {
      const summary = {
        name: user?.name || "Student",
        level: user?.level || 1,
        points: user?.points || 120,
        streak: 7,
        weakTopics: ['Electrolysis', 'Photosynthesis', 'Quadratic Equations'],
        targetExams: ['JAMB 2024', 'WAEC 2024']
      };

      const res = await fetch('/api/ai/notifications/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ performanceSummary: summary })
      });
      const resData = await res.json();
      
      if (resData.success && Array.isArray(resData.notifications)) {
        const newItems = resData.notifications;
        
        if (supabase && user) {
          // Store actual AI notifications in DB
          const toInsert = newItems.map((n: any) => ({
            user_id: user.id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority,
            action_link: n.action_link,
            is_read: false
          }));
          
          const { data: inserted, error } = await supabase
            .from('notifications')
            .insert(toInsert)
            .select();

          if (inserted) {
            setNotifications(prev => [...inserted, ...prev]);
          } else {
            console.error(error);
          }
        } else {
          // Frontend-only generation fallback
          const handledNew = newItems.map((n: any, idx: number) => ({
            ...n,
            id: `ai-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            is_read: false
          }));
          setNotifications(prev => [...handledNew, ...prev]);
        }
        
        toast.success("AI Alert Engine synthesized 4 dynamic notifications!");
      } else {
        toast.error("Cloud tutor is busy. Please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not run the AI Alert Engine.");
    } finally {
      setGenerating(false);
    }
  };

  const getMockNotifications = (): NotificationItem[] => {
    return [
      {
        id: 'mock-1',
        title: 'Weak Topic Detected',
        message: 'Your average accuracy in Physics: Electricity is at 45%. We highly recommend reviewing Electrolysis and circuits.',
        type: 'ai',
        priority: 'high',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        action_link: '/tutor'
      },
      {
        id: 'mock-2',
        title: 'JAMB Timed Mock Live',
        message: 'The full syllabus interactive JAMB Mock session is now unlocked for you. Complete this simulation within 45 mins.',
        type: 'exam',
        priority: 'high',
        is_read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        action_link: '/arena'
      },
      {
        id: 'mock-3',
        title: 'Algebra Review Session',
        message: 'Scheduled reminder: Time for your 30-minute Mathematics review on Quadratic Equations and roots analysis.',
        type: 'study',
        priority: 'medium',
        is_read: false,
        created_at: new Date(Date.now() - 14400000).toISOString(),
        action_link: '/planner'
      },
      {
        id: 'mock-4',
        title: 'Gold League Rivalry Sparked',
        message: 'Your rival Ayo just gained 120 XP today and surpassed you in Chemistry! Take a quick drill to claim your position back.',
        type: 'gamification',
        priority: 'medium',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        action_link: '/leaderboard'
      }
    ];
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'exam': return <FileEdit className="w-5 h-5 text-cyan-400" />;
      case 'study': return <Target className="w-5 h-5 text-emerald-400" />;
      case 'gamification': return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'leaderboard': return <Swords className="w-5 h-5 text-orange-400" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border-white/5';
    }
  };

  const getFilteredNotifications = () => {
    if (selectedFilter === 'all') return notifications;
    if (selectedFilter === 'ai') return notifications.filter(n => n.type === 'ai');
    if (selectedFilter === 'exam') return notifications.filter(n => n.type === 'exam');
    if (selectedFilter === 'study') return notifications.filter(n => n.type === 'study');
    if (selectedFilter === 'rewards') return notifications.filter(n => n.type === 'gamification');
    if (selectedFilter === 'leaderboard') return notifications.filter(n => n.type === 'leaderboard');
    return notifications;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-950 text-white min-h-screen">
      
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Bell className="w-8 h-8 text-cyan-400 animate-bounce" /> Smart Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-full animate-pulse">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm mt-1">Get real-time feedback, AI-powered insights, study schedule alerts and competitive rankings.</p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button 
            onClick={triggerAIEngine} 
            disabled={generating}
            className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold px-5 py-6 shadow-[0_0_20px_rgba(147,51,234,0.3)] border border-purple-400/20"
          >
            <Sparkles className={`w-5 h-5 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? "Triggering AI Coach..." : "Run AI Alert Engine"}
          </Button>

          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead} 
              className="rounded-2xl border-white/10 hover:bg-zinc-800 px-4 py-6"
            >
              <Check className="w-4 h-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Category system */}
      <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto border-b border-white/5">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'ai', label: '🧠 AI Learn' },
          { key: 'exam', label: '🧪 Exams' },
          { key: 'study', label: '📅 Study Timetable' },
          { key: 'rewards', label: '🏆 Rewards' },
          { key: 'leaderboard', label: '⚔️ Leaderboard' }
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setSelectedFilter(filter.key)}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-full transition-all duration-300 ${
              selectedFilter === filter.key
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Notifications main stack */}
      <div className="max-w-4xl space-y-4">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 space-y-3">
            <div className="w-10 h-10 border-t-2 border-cyan-500 border-solid rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Re-indexing alert history...</p>
          </div>
        ) : getFilteredNotifications().length === 0 ? (
          <Card className="bg-zinc-900/80 border-white/5 p-12 text-center space-y-4 rounded-3xl">
            <BellOff className="w-12 h-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-zinc-300">Clean Slate!</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto mt-1">
                You have no pending alerts under this category. Click "Run AI Alert Engine" to request smart recommendations from your personal AI Coach.
              </p>
            </div>
            <Button onClick={triggerAIEngine} variant="secondary" className="rounded-xl mt-2">
              Generate Notifications
            </Button>
          </Card>
        ) : (
          getFilteredNotifications().map((notif, idx) => (
            <motion.div
              key={notif.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={`relative transition-all duration-300 p-5 md:p-6 rounded-3xl border border-white/5 shadow-xl glassmorphism-card ${
                notif.is_read 
                  ? 'bg-zinc-900/40 opacity-70 border-white/5' 
                  : 'bg-zinc-900 border-white/10 hover:border-cyan-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
              }`}>
                
                {/* Unread glow indicator */}
                {!notif.is_read && (
                  <div className="absolute top-6 left-0 w-1.5 h-10 bg-cyan-400 rounded-r-full" />
                )}

                <div className="flex items-start gap-4">
                  {/* Category based emblem */}
                  <div className={`p-4 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center relative`}>
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base md:text-lg text-white">{notif.title}</h3>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getPriorityColor(notif.priority)}`}>
                          {notif.priority}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-xs flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-zinc-300 text-sm md:text-base leading-relaxed">{notif.message}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {notif.action_link && (
                        <Button
                          onClick={() => {
                            markAsRead(notif.id);
                            navigate(notif.action_link || '#');
                          }}
                          className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black rounded-xl text-xs px-4 py-2"
                        >
                          {notif.type === 'ai' ? '🤖 Consult AI Tutor' : 
                           notif.type === 'exam' ? '🧪 Launch Mock' : 
                           notif.type === 'study' ? '📅 Open Planner' : 
                           notif.type === 'leaderboard' ? '⚔️ Challenge' : '⚡ Complete Drill'}
                        </Button>
                      )}

                      {!notif.is_read && (
                        <Button
                          variant="ghost"
                          onClick={() => markAsRead(notif.id)}
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl text-xs px-3"
                        >
                          Mark read
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => deleteNotification(notif.id)}
                        className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs p-2 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

              </Card>
            </motion.div>
          ))
        )}
      </div>

    </div>
  );
}
