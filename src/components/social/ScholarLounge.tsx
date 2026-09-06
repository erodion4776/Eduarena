import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Heart, Share2, Trophy, Users, Zap, Flame, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ScholarLounge() {
  const [feed, setFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch('/api/social/feed');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setFeed(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch feed', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'announcement': return <Bell className="w-4 h-4 text-blue-500" />;
      case 'battle': return <Zap className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Scholar Lounge</h1>
          <p className="text-slate-500 font-medium">Connect, compete, and celebrate with the Edvenia community.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl border-2 gap-2">
            <Users className="w-4 h-4" /> Find Friends
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl gap-2">
            <Share2 className="w-4 h-4" /> Share Achievement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <AnimatePresence mode="popLayout">
            {feed.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden group hover:shadow-2xl hover:shadow-slate-300/50 transition-all">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="w-12 h-12 border-2 border-slate-100">
                        <AvatarFallback className="bg-slate-100 font-black text-slate-600">
                          {item.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-black text-slate-900">{item.user.name}</span>
                            <span className="text-slate-400 text-xs font-bold uppercase ml-2 tracking-widest">
                              {item.user.school}
                            </span>
                          </div>
                          <span className="text-slate-400 text-xs font-medium">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                          <div className="p-2 bg-white rounded-xl shadow-sm">
                            {getIcon(item.type)}
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed">
                            {item.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                          <button className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors font-bold text-sm">
                            <Heart className="w-4 h-4" /> 24
                          </button>
                          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors font-bold text-sm">
                            <MessageSquare className="w-4 h-4" /> 8
                          </button>
                          <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <Badge className="bg-white/20 text-white border-none font-black">TOP SCHOLARS</Badge>
              <h3 className="text-2xl font-black leading-tight">Follow the <br /> Grandmasters</h3>
              <div className="space-y-3">
                {[
                  { name: "Eze_Maths", points: "12.5k", level: 24 },
                  { name: "Chidi_Bio", points: "11.2k", level: 22 },
                  { name: "Tunde_Phys", points: "9.8k", level: 20 }
                ].map(scholar => (
                  <div key={scholar.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                        {scholar.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-black">{scholar.name}</div>
                        <div className="text-[10px] font-bold opacity-70 uppercase">LVL {scholar.level}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-white font-black text-xs hover:bg-white/20">FOLLOW</Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] p-6 space-y-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Flame className="text-orange-500" /> Trending Topics
            </h3>
            <div className="space-y-2">
              {[
                { tag: "#JAMB2026", posts: "1.2k" },
                { tag: "#MathsBattle", posts: "850" },
                { tag: "#ScholarStreak", posts: "420" }
              ].map(topic => (
                <div key={topic.tag} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                  <span className="font-bold text-blue-600">{topic.tag}</span>
                  <span className="text-xs font-bold text-slate-400">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
