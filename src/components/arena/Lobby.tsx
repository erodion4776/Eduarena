import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Swords, Users, Trophy, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  name: string;
  school: string;
  level: number;
  isOnline: boolean;
  rank?: string;
  wins?: number;
  losses?: number;
}

interface LobbyProps {
  onChallenge: (user: User) => void;
  currentUser: any;
  socket: any;
}

export default function Lobby({ onChallenge, currentUser, socket }: LobbyProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  const fetchLobby = () => {
    fetch('/api/arena/lobby')
      .then(res => res.json())
      .then(data => setUsers(data.filter((u: any) => u.id !== currentUser?.id)));
  };

  useEffect(() => {
    fetchLobby();

    socket.on("lobby_update", fetchLobby);

    return () => {
      socket.off("lobby_update", fetchLobby);
    };
  }, [currentUser, socket]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.school.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <Input 
            placeholder="Search rivals or schools..." 
            className="pl-12 py-6 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-arena-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-arena-primary/20 rounded-xl border border-arena-primary/30">
            <Users className="text-arena-primary w-4 h-4" />
            <span className="text-xs font-black text-white">{users.length} ONLINE</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-arena-secondary/20 rounded-xl border border-arena-secondary/30">
            <Trophy className="text-arena-secondary w-4 h-4" />
            <span className="text-xs font-black text-white">RANK #42</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="arena-card border-none shadow-xl rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-white/10">
                    <AvatarFallback className="bg-white/5 text-xl font-black">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-arena-card rounded-full" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-white text-lg">{user.name}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user.school}</p>
                  <Badge className="mt-1 bg-arena-secondary/20 text-arena-secondary border-none text-[10px] font-black">
                    {user.rank}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-arena-neon font-black text-xl">LVL {user.level}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">SCHOLAR</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">WINS</div>
                  <div className="font-black text-white">{user.wins}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">LOSSES</div>
                  <div className="font-black text-white">{user.losses}</div>
                </div>
              </div>

              <Button 
                onClick={() => onChallenge(user)}
                className="w-full py-6 bg-arena-primary hover:bg-arena-primary/80 text-white font-black rounded-xl gap-2 group-hover:arena-glow transition-all"
              >
                <Swords className="w-5 h-5" /> CHALLENGE
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
