import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Shield, Star, Flame, Zap, Ghost, Crown, Heart, Coins } from 'lucide-react';
import { motion } from 'framer-motion'; // Standard student-friendly animations package
import { toast } from 'sonner';

// Pre-defined Catalog of available Power-Up Shop items
const SHOP_ITEMS = [
  { 
    id: 'streak_freeze', 
    name: 'Streak Freeze', 
    price: 500, 
    icon: <Flame className="w-8 h-8 text-orange-500" />, 
    description: 'Protects your streak if you miss a day.' 
  },
  { 
    id: 'double_xp', 
    name: 'Double XP Boost', 
    price: 1000, 
    icon: <Zap className="w-8 h-8 text-yellow-500" />, 
    description: 'Earn 2x score points on quizzes for 24 hours.' 
  },
  { 
    id: 'shield', 
    name: 'Arena Shield', 
    price: 750, 
    icon: <Shield className="w-8 h-8 text-blue-500" />, 
    description: 'Prevents point losses during one arena defeat.' 
  }
];

export default function Inventory() {
  // --- STATE MANAGEMENT ---
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH USER INVENTORY ---
  const loadUserInventory = async () => {
    try {
      const res = await fetch('/api/user/inventory');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
      }
    } catch {
      // Safe fallback: Keep inventory empty without throwing console errors
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserInventory();
  }, []);

  // --- PURCHASE POWER-UP ITEM ---
  const buyItem = async (item: any) => {
    try {
      const res = await fetch('/api/economy/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, price: item.price })
      });

      if (res.ok) {
        toast.success(`Success! Purchased ${item.name}!`, {
          description: "This item has been sent directly to your Vault."
        });
        // Reload items to reflect purchase updates
        loadUserInventory();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          toast.warning(data.error || "Could not complete purchase", {
            description: "Check your coin balance to make sure you have enough gold."
          });
        } catch {
          toast.error("Transaction Error", {
            description: "Your school coin balance was not charged. Please try again."
          });
        }
      }
    } catch (e) {
      toast.error("Network issue detected", {
        description: "Please check your internet connection and try again."
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12 animate-in slide-in-from-bottom duration-300 font-sans">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Scholar Vault</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">
            Your personal collection of study badges, acquired booster items, and achievements.
          </p>
        </div>
      </div>

      {/* Main Grid: Inventory (Left) vs Shop (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          
          {/* SECTION 1: BADGES ACQUIRED */}
          <section className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black italic uppercase flex items-center gap-2 text-slate-800">
              <Trophy className="text-yellow-500 w-6 h-6" /> My Achievements
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { name: 'Early Bird', icon: <Star />, color: 'bg-yellow-100 text-yellow-600 shadow-yellow-100/50' },
                { name: 'Math Whiz', icon: <Zap />, color: 'bg-blue-100 text-blue-600 shadow-blue-100/50' },
                { name: 'Arena King', icon: <Crown />, color: 'bg-purple-100 text-purple-600 shadow-purple-100/50' },
                { name: 'Social Star', icon: <Heart />, color: 'bg-rose-100 text-rose-600 shadow-rose-100/50' }
              ].map((badge, i) => (
                <motion.div 
                  key={badge.name}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div className={`w-20 h-20 rounded-[24px] ${badge.color} flex items-center justify-center shadow-md`}>
                    {React.cloneElement(badge.icon, { className: "w-10 h-10" })}
                  </div>
                  <span className="font-bold text-xs uppercase tracking-widest text-slate-500">
                    {badge.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>

          {/* SECTION 2: CURRENT USER INVENTORY */}
          <section className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black italic uppercase flex items-center gap-2 text-slate-800">
              <Ghost className="text-slate-400 w-6 h-6" /> Inventory Items
            </h2>

            {isLoading ? (
              <div className="p-12 text-center bg-slate-100/50 rounded-3xl">
                <p className="text-slate-400 font-medium animate-pulse">Opening vault boxes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-sm bg-white">
                    Your vault is currently empty. Visit the Scholar Shop to gear up!
                  </div>
                ) : (
                  inventory.map((item) => {
                    const shopItem = SHOP_ITEMS.find((s) => s.id === item.item_id);
                    return (
                      <Card key={item.id} className="border-slate-100 shadow-sm rounded-2xl p-4 flex items-center gap-4 bg-white hover:shadow-md transition-all">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          {shopItem?.icon || <Star className="w-8 h-8 text-slate-400" />}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm md:text-base">
                            {shopItem?.name || "Acquired Item"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            Unlocks: {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "Active"}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>

        {/* SECTION 3: THE SHOP PANEL */}
        <div className="space-y-8">
          <Card className="border-slate-100 shadow-2xl rounded-[40px] p-6 md:p-8 space-y-8 bg-white">
            <div className="space-y-1">
              <h2 className="text-2xl font-black italic uppercase text-slate-900 flex items-center gap-2">
                <Coins className="w-6 h-6 text-yellow-500 fill-current" /> Scholar Shop
              </h2>
              <p className="text-slate-400 text-xs font-medium">Use coins earned from study quizzes to buy boosters.</p>
            </div>

            <div className="space-y-6">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className="p-4 rounded-3xl border border-slate-100 space-y-4 hover:border-slate-200 transition-colors bg-slate-50/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl border border-slate-100 shrink-0">
                      {item.icon}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="font-black text-slate-950 text-sm leading-snug">{item.name}</div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-black rounded-xl py-6 gap-2 border-none transition-all"
                    onClick={() => buyItem(item)}
                  >
                    BUY FOR {item.price} <Coins className="w-4 h-4 text-yellow-400" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
