import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Shield, Star, Flame, Zap, Ghost, Crown, Heart } from 'lucide-react';
import { motion } from 'motion/react';

const SHOP_ITEMS = [
  { id: 'streak_freeze', name: 'Streak Freeze', price: 500, icon: <Flame className="w-8 h-8 text-orange-500" />, description: 'Protects your streak if you miss a day.' },
  { id: 'double_xp', name: 'Double XP', price: 1000, icon: <Zap className="w-8 h-8 text-yellow-500" />, description: 'Earn 2x points for 24 hours.' },
  { id: 'shield', name: 'Arena Shield', price: 750, icon: <Shield className="w-8 h-8 text-blue-500" />, description: 'Prevents point loss in one battle defeat.' }
];

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch('/api/user/inventory');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setInventory(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch inventory', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const buyItem = async (item: any) => {
    try {
      const res = await fetch('/api/economy/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, price: item.price })
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        alert(`Successfully bought ${item.name}!`);
        // Refresh inventory
        const invRes = await fetch('/api/user/inventory');
        if (invRes.ok && invRes.headers.get('content-type')?.includes('application/json')) {
          const invData = await invRes.json();
          setInventory(Array.isArray(invData) ? invData : []);
        }
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(data.error || 'Failed to buy item');
        } catch {
          alert(text || 'Server error occurred');
        }
      }
    } catch (e) {
      console.error('Buy item failed', e);
      alert('Network error occurred');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Scholar Vault</h1>
          <p className="text-slate-500 font-medium">Your collection of badges, items, and achievements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase flex items-center gap-2">
              <Trophy className="text-yellow-500" /> My Badges
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { name: 'Early Bird', icon: <Star />, color: 'bg-yellow-100 text-yellow-600' },
                { name: 'Math Whiz', icon: <Zap />, color: 'bg-blue-100 text-blue-600' },
                { name: 'Arena King', icon: <Crown />, color: 'bg-purple-100 text-purple-600' },
                { name: 'Social Star', icon: <Heart />, color: 'bg-red-100 text-red-600' }
              ].map((badge, i) => (
                <motion.div 
                  key={badge.name}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className={`w-20 h-20 rounded-[24px] ${badge.color} flex items-center justify-center shadow-lg`}>
                    {React.cloneElement(badge.icon as React.ReactElement<any>, { className: "w-10 h-10" })}
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest text-slate-500">{badge.name}</span>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase flex items-center gap-2">
              <Ghost className="text-slate-400" /> My Inventory
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!Array.isArray(inventory) || inventory.length === 0) ? (
                <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold">
                  Your vault is empty. Visit the shop to gear up!
                </div>
              ) : (
                inventory.map((item) => {
                  const shopItem = SHOP_ITEMS.find(s => s.id === item.item_id);
                  return (
                    <Card key={item.id} className="border-none shadow-lg rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        {shopItem?.icon}
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{shopItem?.name}</div>
                        <div className="text-xs text-slate-400 font-medium">Acquired {new Date(item.timestamp).toLocaleDateString()}</div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] p-8 space-y-8">
            <h2 className="text-2xl font-black italic uppercase text-slate-900">Scholar Shop</h2>
            <div className="space-y-6">
              {SHOP_ITEMS.map((item) => (
                <div key={item.id} className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-slate-900">{item.name}</div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl py-6 gap-2"
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

function Coins({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}
