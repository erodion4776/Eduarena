import React from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import QuestionFactory from '@/src/components/admin/QuestionFactory';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">Access Denied</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              Archival Protocol Restricted. You do not have the clearance required to access the Question Factory.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase tracking-widest gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="font-black text-xs uppercase tracking-widest gap-2 hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Dashboard
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archival Engineer</span>
            <span className="text-sm font-black italic uppercase">{user.name}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black">
            {user.name[0]}
          </div>
        </div>
      </div>
      <QuestionFactory />
    </div>
  );
}
