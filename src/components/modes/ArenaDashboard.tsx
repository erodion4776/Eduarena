import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Swords, Zap, Timer, Users, Shield, Flame, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '@/src/lib/socket';
import Lobby from '../arena/Lobby';
import BattleRoom from '../arena/BattleRoom';
import { toast } from 'sonner';

export default function ArenaDashboard() {
  const { user } = useAuthStore();
  const [view, setView] = useState<'lobby' | 'battle' | 'derby'>('lobby');
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);

  useEffect(() => {
    if (user) {
      socket.emit("register_user", user.id);
    }

    socket.on("battle_invite", (data: any) => {
      setIncomingChallenge(data);
      toast.custom((t) => (
        <div className="bg-arena-card border-2 border-arena-primary p-6 rounded-[32px] shadow-2xl flex flex-col gap-4 min-w-[350px] animate-in slide-in-from-right-full">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-arena-primary/20 rounded-2xl">
              <Swords className="w-6 h-6 text-arena-primary" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg italic uppercase">Battle Request!</h3>
              <p className="text-slate-400 text-sm font-bold">
                <span className="text-white">{data.fromUser.name}</span> challenged you to a duel!
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              size="sm" 
              className="flex-1 bg-arena-primary hover:bg-arena-primary/80 text-white font-black rounded-xl"
              onClick={() => {
                handleAcceptChallenge(data);
                toast.dismiss(t);
              }}
            >
              ACCEPT
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-white/10 text-slate-400 hover:bg-white/5 font-black rounded-xl"
              onClick={() => {
                setIncomingChallenge(null);
                toast.dismiss(t);
              }}
            >
              DECLINE
            </Button>
          </div>
        </div>
      ), { duration: 15000 });
    });

    socket.on("battle_started", (battle: any) => {
      setActiveBattle(battle);
      setView('battle');
    });

    return () => {
      socket.off("battle_invite");
      socket.off("battle_started");
    };
  }, [user, toast]);

  const handleChallenge = (targetUser: any) => {
    socket.emit("challenge_user", { 
      targetUserId: targetUser.id, 
      fromUser: { id: user?.id, name: user?.name, school: user?.school_id, level: user?.level } 
    });
    toast.success("Challenge Sent!", {
      description: `Waiting for ${targetUser.name} to accept...`,
    });
  };

  const handleAcceptChallenge = (challenge: any) => {
    socket.emit("accept_challenge", { 
      battleId: challenge.battleId, 
      player1: challenge.fromUser,
      player2: { id: user?.id, name: user?.name, school: user?.school_id, level: user?.level }
    });
    setIncomingChallenge(null);
  };

  const handleBattleComplete = (results: any) => {
    setActiveBattle(null);
    setView('lobby');
  };

  return (
    <div className="min-h-screen mode-arena p-6 space-y-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Arena Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-arena-primary rounded-2xl arena-glow">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase">
                Battle <span className="arena-text-neon">Arena</span>
              </h1>
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">
              High-Stakes Academic Combat
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Arena Rank</div>
              <div className="text-3xl font-black text-white italic">#1,242</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-right">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Win Streak</div>
              <div className="text-3xl font-black text-arena-accent italic flex items-center gap-2">
                5 <Flame className="w-6 h-6 fill-current" />
              </div>
            </div>
          </div>
        </div>

        {view === 'battle' && activeBattle ? (
          <BattleRoom 
            battleId={activeBattle.id}
            players={activeBattle.players}
            questions={activeBattle.questions}
            socket={socket}
            onComplete={handleBattleComplete}
          />
        ) : (
          <Lobby onChallenge={handleChallenge} currentUser={user} socket={socket} />
        )}
      </div>
    </div>
  );
}
