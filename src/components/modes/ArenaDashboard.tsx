import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Swords, Flame, Sparkles } from 'lucide-react';
import socket from '@/src/lib/socket';
import Lobby from '../arena/Lobby';
import BattleRoom from '../arena/BattleRoom';
import { toast } from 'sonner';
import { generatePredictionInsight } from '@/src/services/geminiService';

export default function ArenaDashboard() {
  // --- USER AUTH & STATE ---
  const { user } = useAuthStore();
  const [view, setView] = useState<'lobby' | 'battle'>('lobby');
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);

  // --- ACCEPT CHALLENGE HANDLER ---
  const handleAcceptChallenge = useCallback((challenge: any) => {
    if (!socket || !user) return;

    socket.emit("accept_challenge", { 
      battleId: challenge.battleId, 
      player1: challenge.fromUser,
      player2: { 
        id: user.id, 
        name: user.name, 
        school: user.school_id || 'Academy', 
        level: user.level ?? 1 
      },
      battleSource: challenge.battleSource
    });
    setIncomingChallenge(null);
  }, [user]);

  // --- REAL-TIME MATCHMAKING LISTENERS ---
  useEffect(() => {
    if (!socket || !user) return;

    // Register active student with the matchmaking server
    socket.emit("register_user", user.id);

    // Listen for incoming 1v1 battle invites from other students
    socket.on("battle_invite", (data: any) => {
      setIncomingChallenge(data);

      toast.custom((t) => (
        <div className="bg-slate-900 border-2 border-cyan-500 p-6 rounded-3xl shadow-2xl flex flex-col gap-4 min-w-[340px] text-white animate-in slide-in-from-right-full">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
              <Swords className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-black text-lg italic uppercase text-cyan-300">Battle Request!</h3>
              <p className="text-slate-300 text-sm font-medium">
                <span className="text-white font-bold">{data.fromUser?.name || 'A rival scholar'}</span> challenged you on <span className="text-cyan-400 font-bold">{data.battleSource || 'General Revision'}</span>!
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              size="sm" 
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-xl py-5"
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
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/10 font-bold rounded-xl py-5"
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

    // Automatically transition to the arena room when both players are connected
    socket.on("battle_started", (battle: any) => {
      setActiveBattle(battle);
      setView('battle');
    });

    return () => {
      socket.off("battle_invite");
      socket.off("battle_started");
    };
  }, [user, handleAcceptChallenge]);

  // --- SEND CHALLENGE TO ANOTHER USER ---
  const handleChallenge = (targetUser: any) => {
    if (!socket || !user) return;

    socket.emit("challenge_user", { 
      targetUserId: targetUser.id, 
      fromUser: { 
        id: user.id, 
        name: user.name, 
        school: user.school_id || 'Academy', 
        level: user.level ?? 1 
      },
      battleSource: targetUser.battleSource
    });

    toast.success("Challenge Dispatched!", {
      description: `Waiting for ${targetUser.name} to accept...`,
    });
  };

  // --- COMPLETE BATTLE & AI REVIEW ---
  const handleBattleComplete = async (results: any) => {
    setActiveBattle(null);
    setView('lobby');
    
    // Provide AI insights if the student wants to review missed questions
    if (results?.winnerId !== user?.id) {
      toast.info("Study Buddy Tutor", {
        description: "Reviewing match questions to generate personalized tips...",
      });

      try {
        const insight = await generatePredictionInsight('Combat Subject', [results]);
        if (insight?.correction_breakdown) {
          toast.success("Tutor Tip Ready!", {
            description: insight.correction_breakdown.slice(0, 120) + "...",
          });
        }
      } catch {
        // Safe silent fallback - keeps the student experience smooth
      }
    }
  };

  // --- PRACTICE AGAINST AI BOSS ---
  const handleAIChallenge = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          if (socket && user) {
            socket.emit("challenge_ai", { 
              fromUser: { 
                id: user.id, 
                name: user.name, 
                school: user.school_id || 'Academy', 
                level: user.level ?? 1 
              } 
            });
          }
          resolve(true);
        }, 1200);
      }),
      {
        loading: 'Connecting with AI Study Master...',
        success: 'The AI Master has entered the arena! Get ready!',
        error: 'Unable to connect to AI Master right now. Please try again in a moment.',
      }
    );
  };

  const userLevel = user?.level ?? 1;

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-12 font-sans text-white selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Arena Top Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-8">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="p-3 bg-cyan-500 rounded-2xl shadow-lg shadow-cyan-500/20">
                <Swords className="w-8 h-8 text-slate-950" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
                Battle <span className="text-cyan-400">Arena</span>
              </h1>
              
              {/* Unlockable Boss Battle Button */}
              {userLevel >= 5 && (
                <Button 
                  onClick={handleAIChallenge}
                  className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black rounded-2xl gap-2 px-6 py-5 shadow-lg shadow-red-500/20 border-none transition-transform hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" /> CHALLENGE AI BOSS
                </Button>
              )}
            </div>
            
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
              Live Real-Time Academic Matchmaking
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex items-center gap-6 bg-slate-900/60 px-6 py-4 rounded-3xl border border-white/5">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arena Standing</div>
              <div className="text-2xl font-black text-white italic">#1,242</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Win Streak</div>
              <div className="text-2xl font-black text-amber-400 italic flex items-center justify-end gap-1.5">
                5 <Flame className="w-5 h-5 fill-current text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher: Live Battle Room vs Matchmaking Lobby */}
        {view === 'battle' && activeBattle ? (
          <BattleRoom 
            battleId={activeBattle.id}
            players={activeBattle.players || [user, { name: 'Opponent', score: 0 }]}
            questions={activeBattle.questions || []}
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
