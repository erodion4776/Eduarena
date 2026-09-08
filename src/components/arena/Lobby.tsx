import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Swords, Users, Trophy, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// TypeScript Definition for clean structure rules
interface User {
  id: string;
  name: string;
  school: string;
  level: number;
  isOnline: boolean;
  rank?: string;
  wins?: number;
  losses?: number;
  battleSource?: string;
}

interface LobbyProps {
  onChallenge: (user: User) => void;
  currentUser: any;
  socket: any;
}

export default function Lobby({ onChallenge, currentUser, socket }: LobbyProps) {
  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState("JAMB");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [years, setYears] = useState<number[]>([2024, 2023, 2022, 2021, 2020]); // Realistic fallbacks

  // --- FETCH AVAILABLE EXAM YEARS ---
  useEffect(() => {
    fetch('/api/oracle/years')
      .then((res) => {
        if (!res.ok) throw new Error("Could not load database years");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setYears(data);
        }
      })
      .catch((err) => {
        // Safe silent fallback to keep the app working offline or during server restarts
        console.log("Using local default exam years.");
      });
  }, []);

  // --- FETCH ONLINE USERS IN THE LOBBY ---
  const fetchLobby = () => {
    fetch('/api/arena/lobby')
      .then((res) => {
        if (!res.ok) throw new Error("Network response error");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          // Keep all online users except the current player
          setUsers(data.filter((u: any) => u.id !== currentUser?.id));
        }
      })
      .catch((err) => {
        console.log("Connecting to lobby database...");
      });
  };

  // --- REAL-TIME LOBBY UPDATES ---
  useEffect(() => {
    // Initial fetch of users
    fetchLobby();

    // If socket is not ready yet, wait
    if (!socket) return;

    // Listen to real-time events when users join or leave the lobby
    socket.on("lobby_update", fetchLobby);

    // Clean up socket listener when leaving this screen to prevent memory leaks
    return () => {
      socket.off("lobby_update", fetchLobby);
    };
  }, [currentUser, socket]);

  // --- SEARCH FILTER LOGIC ---
  const filteredUsers = users.filter((u) => {
    const userName = u.name?.toLowerCase() || "";
    const userSchool = u.school?.toLowerCase() || "";
    const query = search.toLowerCase();
    return userName.includes(query) || userSchool.includes(query);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Controls: Exam source selector & Search bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white/5 p-6 rounded-[32px] border border-white/10">
        <div className="space-y-2 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
            Exam Syllabus Source
          </label>
          <div className="flex flex-wrap gap-3">
            <select 
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 min-w-[120px]"
            >
              {['JAMB', 'WAEC', 'NECO'].map((ex) => (
                <option key={ex} value={ex} className="bg-slate-900">{ex}</option>
              ))}
            </select>
            
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500 min-w-[120px]"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-slate-900">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input to filter users */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <Input 
            placeholder="Search active rivals..." 
            className="pl-12 py-6 bg-white/10 border-white/10 text-white rounded-2xl focus:ring-cyan-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Online Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 font-medium">
            No opponents currently online in this category.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card 
              key={user.id} 
              className="bg-slate-900/50 border-slate-800 shadow-xl rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all duration-300"
            >
              <CardContent className="p-6 space-y-6">
                
                {/* User Info Header */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-white/10">
                      <AvatarFallback className="bg-white/5 text-xl font-black text-cyan-400">
                        {user.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Active online green dot */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-lg truncate">{user.name || "Scholar"}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate">
                      {user.school || "Academy Student"}
                    </p>
                    <Badge className="mt-1 bg-cyan-500/10 text-cyan-400 border-none text-[10px] font-bold">
                      {user.rank || "Challenger"}
                    </Badge>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="text-cyan-400 font-black text-lg">LVL {user.level || 1}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Rank</div>
                  </div>
                </div>

                {/* Wins & Losses Tracker */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WINS</div>
                    <div className="font-black text-emerald-400 text-lg">{user.wins ?? 0}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LOSSES</div>
                    <div className="font-black text-rose-400 text-lg">{user.losses ?? 0}</div>
                  </div>
                </div>

                {/* Challenge Action Button */}
                <Button 
                  onClick={() => onChallenge({ ...user, battleSource: `${selectedExam} ${selectedYear}` })}
                  className="w-full py-6 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-xl gap-2 transition-all shadow-md hover:shadow-cyan-500/20"
                >
                  <Swords className="w-5 h-5" /> START BATTLE
                </Button>
                
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
