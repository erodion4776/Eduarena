import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Database, Cpu, ServerCrash, UploadCloud, CheckCircle2, ChevronRight, Lock, Command, Terminal, Sparkles, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { create } from 'zustand';
import { ragService } from '@/src/lib/ragService';
import { aiRouter } from '@/src/lib/aiRouter';
import { questionImportService } from '@/src/lib/questionImportService';

interface AdminArenaState {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const useAdminArenaStore = create<AdminArenaState>((set) => ({
  isUnlocked: false,
  unlock: () => set({ isUnlocked: true }),
  lock: () => set({ isUnlocked: false }),
}));

export default function AdminArena() {
  const navigate = useNavigate();
  const { isUnlocked, unlock } = useAdminArenaStore();
  const [passcode, setPasscode] = useState('');
  const [isShake, setIsShake] = useState(false);

  // RAG State
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSubject, setUploadSubject] = useState('Biology');
  const [uploadTopic, setUploadTopic] = useState('General');
  
  // Bulk Importer State
  const [importProgress, setImportProgress] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Simulator State
  const [simQuery, setSimQuery] = useState('');
  const [simResults, setSimResults] = useState<{ role: 'user' | 'ai'; text: string; provider?: string }[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'ARENA2026') {
      unlock();
    } else {
      setPasscode('');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress([]);
    
    try {
      await ragService.processPDF(file, uploadSubject, uploadTopic, (msg) => {
        setUploadProgress(prev => [...prev, msg]);
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error("JSON file must contain an array of objects.");
        }

        await ragService.processJSON(data, (msg) => {
          setImportProgress(prev => [...prev, msg]);
        });
      } catch (err: any) {
        console.error(err);
        setImportProgress(prev => [...prev, `ERROR: ${err.message}`]);
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setImportProgress(prev => [...prev, "ERROR: Failed to read file."]);
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const downloadSampleJson = () => {
    const sample = [
      {
        "subject_name": "English",
        "topic_name": "Passage A",
        "question_content": "In the passage, the author's main purpose is to?",
        "options": [
          "Entertain the reader",
          "Inform about science",
          "Persuade the audience",
          "Describe a journey"
        ],
        "correct_answer": "Persuade the audience",
        "explanation": "The author uses persuasive language throughout.",
        "difficulty_level": 2,
        "year": 2020,
        "exam_type": "JAMB",
        "aloc_id": "ENG-2020-001"
      }
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jamb_questions_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simQuery.trim()) return;

    const query = simQuery;
    setSimQuery('');
    setSimResults(prev => [...prev, { role: 'user', text: query }]);
    setIsSimulating(true);

    try {
      const context = await ragService.retrieveContext(query);
      const res = await aiRouter.askTutorChuks(query, simResults.filter(r => r.role !== 'ai').map(r => ({ sender: 'student', text: r.text })));
      
      setSimResults(prev => [...prev, { 
        role: 'ai', 
        text: res.answer,
        provider: res.provider
      }]);
    } catch (error) {
       console.error("Simulation error", error);
    } finally {
       setIsSimulating(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono selection:bg-rose-500/30 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-900/10 via-slate-950 to-black pointer-events-none" />
        
        <motion.div 
          animate={isShake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-sm p-8 bg-black/40 backdrop-blur-xl border border-rose-900/30 rounded-3xl shadow-[0_0_50px_rgba(225,29,72,0.1)]"
        >
          <div className="flex flex-col items-center justify-center mb-8 text-rose-500">
            <div className="w-16 h-16 bg-rose-950/50 rounded-2xl border border-rose-800/50 flex items-center justify-center mb-4 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-[0.3em]">Arena Command</h1>
            <p className="text-rose-500/60 text-xs mt-2 uppercase tracking-widest">Restricted Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="ENTER PASSCODE"
                className="bg-slate-900/50 border-rose-900/30 text-white pl-12 h-14 rounded-xl text-center uppercase tracking-[0.3em] font-bold focus-visible:ring-rose-500/50 placeholder:text-slate-600"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all">
              Initialize
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
       <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-rose-900/5 rounded-full blur-[150px] mix-blend-screen" />
         <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-cyan-900/5 rounded-full blur-[150px] mix-blend-screen" />
       </div>

      {/* Top Navigation */}
      <div className="h-16 border-b border-white/5 bg-black/50 backdrop-blur-2xl flex items-center justify-between px-6 sticky top-0 z-50">
         <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-zinc-500 hover:text-white transition-colors"
              title="Return to HQ"
            >
               <LayoutDashboard className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 text-white divider-l pl-6 border-l border-white/10">
               <Command className="w-5 h-5 text-rose-500" />
               <h1 className="font-black tracking-[0.2em] uppercase text-sm">Arena Command</h1>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <Button 
               variant="outline" 
               className="border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20 uppercase tracking-widest text-xs font-bold"
               onClick={() => window.open('/admin/harvester', '_blank')}
            >
               Open Data Harvester
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-emerald-400 text-xs font-black uppercase tracking-widest font-mono">System Online</span>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Neural Feeder */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
           
           <section className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none" />
             
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <Database className="w-5 h-5 text-rose-400" />
               <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">Neural Feeder <span className="text-slate-500">(PDF Ingestion)</span></h2>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Subject</label>
                 <Input 
                   value={uploadSubject} 
                   onChange={(e) => setUploadSubject(e.target.value)} 
                   placeholder="e.g. Biology"
                   className="bg-black/40 border-white/10 text-white"
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Topic</label>
                 <Input 
                   value={uploadTopic} 
                   onChange={(e) => setUploadTopic(e.target.value)} 
                   placeholder="e.g. Photosynthesis"
                   className="bg-black/40 border-white/10 text-white"
                 />
               </div>
             </div>

             <div 
               className="border-2 border-dashed border-rose-900/50 hover:border-rose-500/50 bg-black/40 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden"
               onClick={() => fileInputRef.current?.click()}
             >
                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <UploadCloud className="w-16 h-16 text-rose-500/50 group-hover:text-rose-400 mb-6 transition-colors" />
                <h3 className="text-xl font-bold text-white mb-2">Deploy Knowledge Architecture</h3>
                <p className="text-slate-500 text-sm font-medium text-center max-w-md">
                   Drag & drop official JAMB syllabus PDFs or approved textbooks. Max 50MB per file.
                </p>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
             </div>

             {/* Upload Terminal */}
             <AnimatePresence>
               {(uploadProgress.length > 0 || isUploading) && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   className="mt-6 bg-black border border-white/10 rounded-xl p-4 font-mono text-sm overflow-hidden"
                 >
                    <div className="flex items-center gap-2 text-slate-500 mb-3 border-b border-white/5 pb-2">
                       <Terminal className="w-4 h-4" /> <span className="uppercase tracking-widest text-xs font-bold">Ingestion Log</span>
                    </div>
                    <div className="space-y-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                       {uploadProgress.map((msg, i) => (
                         <motion.div 
                           initial={{ x: -10, opacity: 0 }}
                           animate={{ x: 0, opacity: 1 }}
                           key={i} 
                           className={`flex items-start gap-2 ${msg.includes('COMPLETE') ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
                         >
                           <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                           {msg}
                         </motion.div>
                       ))}
                       {isUploading && (
                         <div className="flex items-center gap-2 text-rose-400 animate-pulse mt-2">
                           <div className="w-1.5 h-3 bg-rose-500" /> Processing...
                         </div>
                       )}
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </section>

           {/* Bulk Question Importer */}
           <section className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-8">
             <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <Database className="w-5 h-5 text-emerald-400" />
               <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">CBT Database Feeder <span className="text-slate-500">(Bulk JSON)</span></h2>
             </div>
             <div className="border-2 border-dashed border-emerald-900/50 hover:border-emerald-500/50 bg-black/40 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden" onClick={() => jsonInputRef.current?.click()}>
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <UploadCloud className="w-16 h-16 text-emerald-500/50 group-hover:text-emerald-400 mb-6 transition-colors" />
                <h3 className="text-xl font-bold text-white mb-2">Import Past Questions</h3>
                <p className="text-slate-500 text-sm font-medium text-center max-w-md mb-2">
                   Upload a JSON file containing an array of past questions. Automatically chunks and inserts into the database.
                </p>
                <button type="button" onClick={(e: any) => { e.stopPropagation(); downloadSampleJson(); }} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-widest relative z-20 underline pb-1 cursor-pointer">
                   Download Sample JSON Format
                </button>
                <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />
             </div>
             <AnimatePresence>
               {(importProgress.length > 0 || isImporting) && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 bg-black border border-white/10 rounded-xl p-4 font-mono text-sm overflow-hidden">
                    <div className="flex items-center gap-2 text-slate-500 mb-3 border-b border-white/5 pb-2">
                       <Terminal className="w-4 h-4" /> <span className="uppercase tracking-widest text-xs font-bold">Import Log</span>
                    </div>
                    <div className="space-y-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                       {importProgress.map((msg, i) => (
                         <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={i} className={`flex items-start gap-2 ${msg.includes('COMPLETE') ? 'text-emerald-400 font-bold' : msg.includes('ERROR') ? 'text-rose-500 font-bold' : 'text-slate-300'}`}>
                           <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${msg.includes('ERROR') ? 'text-rose-500' : 'text-emerald-500'}`} />
                           {msg}
                         </motion.div>
                       ))}
                       {isImporting && (
                         <div className="flex items-center gap-2 text-emerald-400 animate-pulse mt-2">
                           <div className="w-1.5 h-3 bg-emerald-500" /> Processing Batch...
                         </div>
                       )}
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </section>

           {/* RAG Simulator */}
           <section className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
             
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <Cpu className="w-5 h-5 text-cyan-400" />
               <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">RAG Simulator Tester</h2>
             </div>

             <div className="h-80 bg-black/60 rounded-2xl border border-white/5 mb-6 overflow-y-auto p-6 space-y-6">
                {simResults.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-sm uppercase tracking-widest">
                     Awaiting Test Queries
                  </div>
                ) : (
                  simResults.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-rose-900/40 border border-rose-500/30 text-rose-100 rounded-tr-none' 
                          : 'bg-cyan-900/20 border border-cyan-500/30 text-cyan-50 rounded-tl-none'
                      }`}>
                         {msg.role === 'ai' && msg.provider && (
                           <div className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70 mb-2 border-b border-cyan-500/20 pb-2 flex justify-between">
                             <span>Tutor Chuks</span>
                             <span>Node: {msg.provider}</span>
                           </div>
                         )}
                         <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))
                )}
                {isSimulating && (
                  <div className="flex items-center gap-2 text-cyan-500 font-mono text-sm font-bold bg-cyan-950/30 w-fit px-4 py-2 rounded-xl border border-cyan-500/20">
                     <Sparkles className="w-4 h-4 animate-spin flex-shrink-0" />
                     Orchestrating AI Pipeline...
                  </div>
                )}
             </div>

             <form onSubmit={handleSimulate} className="flex gap-3">
               <Input 
                 value={simQuery}
                 onChange={(e) => setSimQuery(e.target.value)}
                 placeholder="Test a student query..."
                 className="flex-1 bg-black/40 border-white/10 h-14 rounded-xl text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50"
                 disabled={isSimulating}
               />
               <Button type="submit" disabled={isSimulating || !simQuery.trim()} className="h-14 px-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                 Execute
               </Button>
             </form>
           </section>

        </div>

        {/* Right Column: Node Monitor */}
        <div className="col-span-1 space-y-6">
           <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <ServerCrash className="w-4 h-4" /> AI Node Status
              </h2>

              <div className="space-y-4 font-mono">
                 {/* Gemini Node */}
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div>
                       <div className="text-white font-bold text-sm">Google Gemini</div>
                       <div className="text-slate-500 text-xs mt-1">gemini-2.5-flash</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-emerald-400 text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Primary
                       </span>
                       <span className="text-slate-500 text-[10px]">142ms</span>
                    </div>
                 </div>

                 {/* Grok Node */}
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div>
                       <div className="text-white font-bold text-sm">xAI Grok</div>
                       <div className="text-slate-500 text-xs mt-1">grok-beta</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-amber-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" /> Standby 1
                       </span>
                    </div>
                 </div>

                 {/* Hugging Face Node */}
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div>
                       <div className="text-white font-bold text-sm">Hugging Face</div>
                       <div className="text-slate-500 text-xs mt-1">Mistral-7B</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-600" /> Standby 2
                       </span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-rose-950/40 to-black rounded-3xl p-6 border border-rose-900/30">
              <h3 className="text-rose-400 font-bold uppercase tracking-widest text-xs mb-3">System Warnings</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                 AI Failover is highly volatile. If node capacity is overloaded, queries resolve to Simulated Success (Fallback 3) to maintain uninterrupted frontend UI.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
