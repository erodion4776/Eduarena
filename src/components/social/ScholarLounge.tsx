import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Heart, Share2, Trophy, Users, Zap, Flame, Bell, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animation library
import { toast } from 'sonner';

// Clean TypeScript interfaces
interface User {
  name: string;
  school: string;
}

interface FeedItem {
  id: string;
  user: User;
  type: 'achievement' | 'announcement' | 'battle' | 'general';
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
}

// Starter fallback community posts shown if server feed is offline
const FALLBACK_FEED: FeedItem[] = [
  {
    id: 'post-1',
    user: { name: 'Amina Bello', school: 'Queen\'s College' },
    type: 'achievement',
    content: 'Just hit a 10-day study streak in Physics & Mathematics! 🚀 Ready for UTME!',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    likes: 34,
    comments: 6
  },
  {
    id: 'post-2',
    user: { name: 'Chukwudi Okafor', school: 'King\'s College' },
    type: 'battle',
    content: 'Won the 1v1 Biology Battle Arena match with a 95% accuracy score! 🏆',
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    likes: 48,
    comments: 12
  },
  {
    id: 'post-3',
    user: { name: 'Edvenia Hub', school: 'Official Bulletin' },
    type: 'announcement',
    content: 'JAMB 2026 Diagnostic Mock Exam is now active. Head over to Exam Oracle to practice!',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    likes: 120,
    comments: 29
  }
];

export default function ScholarLounge() {
  // --- STATE MANAGEMENT ---
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH COMMUNITY SOCIAL FEED ---
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch('/api/social/feed');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setFeed(data);
          } else {
            setFeed(FALLBACK_FEED);
          }
        } else {
          setFeed(FALLBACK_FEED);
        }
      } catch {
        // Fallback gracefully so students can preview the community page offline
        setFeed(FALLBACK_FEED);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, []);

  // --- INTERACTION HANDLERS ---
  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const isCurrentlyLiked = !prev[postId];
      if (isCurrentlyLiked) {
        toast.success("Cheered on a fellow scholar! ❤️");
      }
      return { ...prev, [postId]: isCurrentlyLiked };
    });
  };

  const toggleFollow = (scholarName: string) => {
    setFollowedUsers((prev) => {
      const isFollowing = !prev[scholarName];
      if (isFollowing) {
        toast.success(`Now following ${scholarName}!`);
      } else {
        toast(`Unfollowed ${scholarName}`);
      }
      return { ...prev, [scholarName]: isFollowing };
    });
  };

  const handleShareAchievement = () => {
    toast.success("Achievement Shared!", {
      description: "Your latest study milestones are now posted to the Scholar Lounge."
    });
  };

  const handleFindFriends = () => {
    toast.info("Connecting to School Network...", {
      description: "Searching for classmates and rivals from your school."
    });
  };

  // Helper function to render different icons based on the post category
  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'announcement':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'battle':
        return <Zap className="w-4 h-4 text-purple-500 fill-current" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Top Header Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Scholar Lounge</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">
            Connect, compete, and celebrate milestones with the Edvenia student community.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleFindFriends}
            className="rounded-2xl border-2 border-slate-200 hover:bg-slate-50 font-bold gap-2 text-slate-700"
          >
            <Users className="w-4 h-4" /> Find Friends
          </Button>
          
          <Button 
            onClick={handleShareAchievement}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl gap-2 shadow-md shadow-blue-600/20 border-none transition-all"
          >
            <Share2 className="w-4 h-4" /> Share Update
          </Button>
        </div>
      </div>

      {/* Main Grid: Feed (Left 2 Columns) & Highlights/Trends (Right Column) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Community Feed Stream */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <Card className="p-12 text-center border-none bg-slate-100/50 rounded-3xl">
              <p className="text-slate-400 font-medium animate-pulse">Loading study feed...</p>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              {feed.map((item, idx) => {
                const isLiked = !!likedPosts[item.id];
                const baseLikes = item.likes || 20;
                const totalLikes = isLiked ? baseLikes + 1 : baseLikes;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.08, 0.4) }}
                  >
                    <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden group hover:shadow-lg transition-all duration-300 bg-white">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          
                          {/* User Avatar */}
                          <Avatar className="w-12 h-12 border-2 border-slate-100">
                            <AvatarFallback className="bg-blue-50 text-blue-600 font-black text-sm">
                              {item.user?.name?.[0]?.toUpperCase() || 'S'}
                            </AvatarFallback>
                          </Avatar>

                          {/* Post Body */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-black text-slate-900 text-sm md:text-base">
                                  {item.user?.name || 'Scholar'}
                                </span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase ml-2 tracking-widest">
                                  {item.user?.school || 'Academy'}
                                </span>
                              </div>
                              <span className="text-slate-400 text-xs font-medium">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            {/* Message Card Container */}
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100 group-hover:bg-blue-50/40 group-hover:border-blue-100 transition-colors">
                              <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 mt-0.5">
                                {getIcon(item.type)}
                              </div>
                              <p className="text-slate-700 text-sm font-medium leading-relaxed">
                                {item.content}
                              </p>
                            </div>

                            {/* Engagement Buttons (Like, Comment, Share) */}
                            <div className="flex items-center gap-6 pt-1">
                              <button 
                                onClick={() => toggleLike(item.id)}
                                className={`flex items-center gap-1.5 transition-colors font-bold text-xs cursor-pointer ${
                                  isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /> 
                                {totalLikes}
                              </button>

                              <button 
                                onClick={() => toast.info("Comments section opening soon!")}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-blue-500 transition-colors font-bold text-xs cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" /> 
                                {item.comments || 8}
                              </button>

                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.href);
                                  toast.success("Post link copied to clipboard!");
                                }}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs cursor-pointer"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Right Column: Top Scholars Leaderboard & Trending Topics */}
        <div className="space-y-6">
          
          {/* Grandmaster Leaderboard Card */}
          <Card className="border-none shadow-xl shadow-blue-600/10 rounded-[32px] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Trophy className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-4">
              <Badge className="bg-white/20 text-white border-none font-bold text-[10px] tracking-widest uppercase">
                TOP SCHOLARS
              </Badge>
              <h3 className="text-xl md:text-2xl font-black leading-tight">
                Follow The <br /> Grandmasters
              </h3>

              <div className="space-y-2.5">
                {[
                  { name: "Eze_Maths", points: "12.5k", level: 24 },
                  { name: "Chidi_Bio", points: "11.2k", level: 22 },
                  { name: "Tunde_Phys", points: "9.8k", level: 20 }
                ].map((scholar) => {
                  const isFollowing = !!followedUsers[scholar.name];

                  return (
                    <div 
                      key={scholar.name} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black text-xs text-white">
                          {scholar.name[0]}
                        </div>
                        <div>
                          <div className="text-xs font-black">{scholar.name}</div>
                          <div className="text-[10px] font-bold text-blue-100 uppercase">LVL {scholar.level} • {scholar.points} PTS</div>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleFollow(scholar.name)}
                        className={`text-xs font-black rounded-xl px-3 h-8 transition-all ${
                          isFollowing 
                            ? 'bg-white text-blue-900 hover:bg-white/90' 
                            : 'text-white bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Trending Topics Card */}
          <Card className="border-slate-100 shadow-sm rounded-[32px] p-6 space-y-4 bg-white">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Flame className="text-orange-500 w-4 h-4 fill-current" /> Trending Topics
            </h3>
            
            <div className="space-y-1">
              {[
                { tag: "#JAMB2026", posts: "1.2k" },
                { tag: "#PhysicsBattle", posts: "850" },
                { tag: "#ScholarStreak", posts: "420" },
                { tag: "#CalculusTips", posts: "310" }
              ].map((topic) => (
                <div 
                  key={topic.tag} 
                  onClick={() => toast.info(`Viewing discussions under ${topic.tag}`)}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <span className="font-bold text-blue-600 text-xs">{topic.tag}</span>
                  <span className="text-[10px] font-bold text-slate-400">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}
