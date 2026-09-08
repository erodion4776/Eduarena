import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion'; // Standard student-friendly animation library
import { Terminal, Shield, Database, Layers, RefreshCw } from 'lucide-react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/src/lib/supabase';
import { alocIngestionService } from '@/src/lib/alocIngestionService';
import { toast } from 'sonner';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'terminal';
}

/**
 * Helper utility: Interruptible delay that respects cancellation (AbortSignal).
 * If the student clicks "HALT", this immediately breaks waiting delays.
 */
function interruptibleDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timerId = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timerId);
      reject(new DOMException('Harvest stopped by user.', 'AbortError'));
    }, { once: true });
  });
}

export default function DataHarvester() {
  // --- STATE MANAGEMENT ---
  const [token, setToken] = useState('ALOC-b77ef1b2396263a9ee7a');
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState('english, mathematics, biology, physics, chemistry');
  const [exam, setExam] = useState('jamb');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [exhaustMode, setExhaustMode] = useState(true);
  const [cloudSync, setCloudSync] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncedQuestions, setSyncedQuestions] = useState<any[]>([]);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [depletionProgress, setDepletionProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // References for terminal auto-scrolling, unique log IDs, and abort signals
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const logCounterRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef(0);

  // Parse comma-separated subjects into a clean array
  const subjectsInQueue = useMemo(() => 
    subject.split(',').map((s) => s.trim()).filter(Boolean), 
  [subject]);

  // --- LOG STREAM HANDLER ---
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: ++logCounterRef.current,
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ].slice(-100)); // Keep the last 100 entries for smooth UI performance
  }, []);

  // Auto-scroll terminal log down as new entries arrive
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- HARVEST TIMER COUNTER ---
  useEffect(() => {
    if (!isHarvesting) {
      setElapsedSeconds(0);
      return;
    }
    startTimeRef.current = performance.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((performance.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isHarvesting]);

  // --- FETCH QUESTIONS FROM CLOUD DATABASE ---
  const fetchSyncedQuestions = async () => {
    try {
      addLog('Connecting to Supabase cloud repository...', 'info');
      const res = await alocIngestionService.fetchAllQuestions();
      setSyncedQuestions(res.data || []);
      addLog(`Sync Complete: Retrieved ${res.data?.length || 0} questions from cloud vault.`, 'success');
      toast.success("Cloud Manifest Loaded", {
        description: `Found ${res.data?.length || 0} stored questions in database.`
      });
    } catch (err: any) {
      addLog(`Sync Error: ${err.message || 'Could not connect to cloud'}`, 'error');
    }
  };

  // --- MAIN HARVEST WORKFLOW ---
  const startHarvest = async () => {
    if (!token.trim()) {
      addLog('Error: Missing API Access Token', 'error');
      toast.error("Please enter an API Token to proceed.");
      return;
    }

    // Set up a new cancellation controller for this run
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setIsHarvesting(true);
    setLogs([]);
    addLog(`Starting Ingestion Engine (${subjectsInQueue.length} subjects in queue)...`, 'info');

    let db: any = null;

    try {
      addLog('Initializing browser-side SQL engine (WebAssembly)...', 'info');
      
      // Load SQLite WASM binary for in-browser database compilation
      const wasmRes = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/sql-wasm.wasm', { signal });
      if (!wasmRes.ok) throw new Error('Could not load sql-wasm.wasm engine');
      const wasmBinary = await wasmRes.arrayBuffer();

      const SQL = await initSqlJs({ wasmBinary });
      db = new SQL.Database();
      
      // Create questions table schema
      db.run(`CREATE TABLE questions (
        id INTEGER PRIMARY KEY, 
        aloc_id INTEGER,
        subject TEXT, 
        question_text TEXT, 
        option_a TEXT, 
        option_b TEXT, 
        option_c TEXT, 
        option_d TEXT, 
        answer TEXT, 
        explanation TEXT, 
        image_url TEXT,
        exam_year TEXT
      )`);

      const zip = new JSZip();

      // Iterate through all subjects in the queue
      for (let sIdx = 0; sIdx < subjectsInQueue.length; sIdx++) {
        if (signal.aborted) break;
        
        setCurrentSubIdx(sIdx);
        setDepletionProgress(0);
        const currentSub = subjectsInQueue[sIdx];
        
        addLog(`>> Processing Subject: [${currentSub.toUpperCase()}]`, 'terminal');
        
        const seenIds = new Set<number>();
        let duplicateStreak = 0;
        const MAX_DUPE_LIMIT = 25;
        let successCount = 0;
        const iterations = exhaustMode ? 10000 : count;

        for (let i = 0; i < iterations; i++) {
          if (signal.aborted) break;

          try {
            const url = `/api/aloc/q/1?subject=${currentSub.toLowerCase()}&type=${exam.toLowerCase()}`;
            const response = await fetch(url, {
              headers: { 
                'Accept': 'application/json', 
                'AccessToken': token.trim() 
              },
              signal,
            });

            if (!response.ok) {
              if (response.status === 429) {
                addLog('Rate limit reached (429): Pausing for 10s...', 'warning');
                await interruptibleDelay(10000, signal);
                continue;
              }
              const errText = await response.text();
              addLog(`API Notice (${response.status}): ${errText.slice(0, 50)}`, 'error');
              break;
            }

            const data = await response.json();
            if (!data || !data.data) {
              addLog(`Empty payload received for ${currentSub}`, 'warning');
              continue;
            }
            const q = data.data;

            // Handle duplicate detection for exhaustive coverage
            if (seenIds.has(q.id)) {
              duplicateStreak++;
              const progress = (duplicateStreak / MAX_DUPE_LIMIT) * 100;
              setDepletionProgress(progress);
              
              if (exhaustMode && duplicateStreak >= MAX_DUPE_LIMIT) {
                addLog(`Subject [${currentSub.toUpperCase()}] questions complete. Moving to next subject...`, 'success');
                break;
              }
              continue;
            }

            seenIds.add(q.id);
            duplicateStreak = 0;
            setDepletionProgress(0);

            let cloudImageUrl = '';
            
            // Cloud asset sync if enabled
            if (q.image && cloudSync && supabase) {
              try {
                const imgController = new AbortController();
                const imgTimer = setTimeout(() => imgController.abort(), 10000);

                try {
                  const imgRes = await fetch(q.image, { signal: imgController.signal });
                  if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    const path = `questions/${currentSub}/${q.id}.png`;
                    const { error: uploadError } = await supabase.storage
                      .from('question_assets')
                      .upload(path, blob, { upsert: true });

                    if (!uploadError) {
                      const { data: { publicUrl } } = supabase.storage.from('question_assets').getPublicUrl(path);
                      cloudImageUrl = publicUrl;
                    }
                  }
                } finally {
                  clearTimeout(imgTimer);
                }
              } catch {
                // Silently bypass asset fetch failures
              }
            }

            // Cloud Data Sync if Supabase is connected
            if (cloudSync && supabase) {
              try {
                const syncRes = await alocIngestionService.ingestQuestion(q, currentSub, exam);
                if (syncRes.status === 'skipped') {
                  addLog(`Cloud Sync: Question [${q.id}] already present (skipped)`, 'info');
                } else {
                  addLog(`Cloud Sync Success [${q.id}]: Saved with AI vector embeddings ✓`, 'success');
                }
              } catch {
                // Fallback direct upsert
                await supabase.from('global_questions_vault').upsert({
                  id: q.id,
                  subject: currentSub.toLowerCase(),
                  exam_type: exam.toLowerCase(),
                  question_data: q
                }, { onConflict: 'id' });
              }
            }

            // Save question to local SQLite in-memory database
            db.run(
              `INSERT INTO questions (aloc_id, subject, question_text, option_a, option_b, option_c, option_d, answer, explanation, image_url, exam_year) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, 
              [
                q.id, 
                currentSub, 
                q.question, 
                q.option?.a ?? '', 
                q.option?.b ?? '', 
                q.option?.c ?? '', 
                q.option?.d ?? '', 
                q.answer, 
                q.solution || '', 
                cloudImageUrl || q.image || '', 
                q.examyear
              ]
            );

            successCount++;
            if (successCount % 5 === 0) {
              addLog(`Saved ${successCount} questions for [${currentSub}]`, 'success');
            }
            
            // Non-blocking randomized polite delay between API calls
            const isLastItem = sIdx === subjectsInQueue.length - 1 && i === iterations - 1;
            if (!isLastItem) {
              await interruptibleDelay(600 + Math.random() * 600, signal);
            }
          } catch (err: any) {
            if (err.name === 'AbortError') break;
            addLog(`Notice: ${err.message}`, 'error');
            await interruptibleDelay(2000, signal).catch(() => {});
          }
        }
      }

      // Export SQLite binary to ZIP package and download to browser
      const dbExport = db.export();
      zip.file('cbt_master_vault.db', dbExport);
      const pkg = await zip.generateAsync({ type: 'blob' });
      saveAs(pkg, `cbt_exam_archive_${Date.now()}.zip`);
      
      addLog('Ingestion complete! Your SQLite database archive download is ready.', 'success');
      toast.success("Download Ready!", {
        description: "Your compiled database package has been generated."
      });

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addLog(`Error during harvest: ${err.message}`, 'error');
      } else {
        addLog('Harvesting process paused by user.', 'warning');
      }
    } finally {
      db?.close(); // Clean up memory allocation for WebAssembly database
      setIsHarvesting(false);
      setDepletionProgress(0);
    }
  };

  const handleHalt = () => {
    abortRef.current?.abort(); // Cancel active network requests & timers immediately
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00FF41] font-mono p-4 md:p-8 relative selection:bg-[#00FF41] selection:text-black">
      
      {/* Retro Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,2px_100%] opacity-30" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* Top Header */}
        <header className="border-b-2 border-[#00FF41]/20 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className={`p-2 border-2 ${isHarvesting ? 'border-red-500 animate-pulse bg-red-500/10' : 'border-[#00FF41] bg-[#00FF41]/10'}`}>
                <Terminal className={`w-8 h-8 ${isHarvesting ? 'text-red-500' : 'text-[#00FF41]'}`} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic tracking-tight uppercase whitespace-nowrap">
                  Archive_Harvester <span className="text-white">v2.0</span>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                   <Badge variant="outline" className="border-[#00FF41]/40 text-[#00FF41] rounded-none text-[8px] tracking-widest font-black uppercase">
                     Database Pipeline Active
                   </Badge>
                   {isHarvesting && (
                     <span className="text-[10px] text-red-500 font-black animate-pulse">
                       [ HARVEST IN PROGRESS ]
                     </span>
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-sm">
             <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 opacity-60">
                <span>Subject Queue</span>
                <span>{isHarvesting ? currentSubIdx + 1 : 0} / {subjectsInQueue.length}</span>
             </div>
             <div className="flex gap-1">
                {subjectsInQueue.map((s, i) => (
                   <div 
                     key={s + i} 
                     className={`h-1.5 flex-1 border ${
                       i < currentSubIdx 
                         ? 'bg-[#00FF41] border-[#00FF41]' 
                         : i === currentSubIdx && isHarvesting 
                         ? 'bg-[#00FF41] animate-pulse border-[#00FF41]' 
                         : 'border-[#00FF41]/20'
                     }`} 
                   />
                ))}
             </div>
          </div>
        </header>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Left Controls Card */}
           <div className="lg:col-span-8 space-y-6">
              <div className="bg-black border border-[#00FF41]/30 p-6 md:p-8 space-y-8 relative shadow-[0_0_40px_rgba(0,255,65,0.05)]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                             <Shield className="w-3 h-3" /> API Access Key
                          </label>
                          <Input 
                            type="password" 
                            placeholder="Enter API token..."
                            className="bg-transparent border-[#00FF41]/30 h-12 text-[#00FF41] focus-visible:ring-[#00FF41] rounded-none font-mono text-base"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                             <Layers className="w-3 h-3" /> Subject List (Comma Separated)
                          </label>
                          <Input 
                            placeholder="english, math, biology..."
                            className="bg-transparent border-[#00FF41]/30 h-12 text-white focus-visible:ring-[#00FF41] rounded-none font-mono text-sm"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                          />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase opacity-60">Exam Body</label>
                             <select 
                               value={exam} 
                               onChange={(e) => setExam(e.target.value)} 
                               className="w-full h-12 bg-black border border-[#00FF41]/30 text-[#00FF41] font-bold text-xs rounded-none px-2 outline-none"
                             >
                                <option value="jamb">JAMB (UTME)</option>
                                <option value="waec">WAEC (SSCE)</option>
                                <option value="neco">NECO</option>
                             </select>
                          </div>

                          <div className={`space-y-2 transition-all ${exhaustMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                             <label className="text-[9px] font-black uppercase opacity-60">Count Limit</label>
                             <Input 
                                type="number" 
                                min={1}
                                className="h-12 bg-black border-[#00FF41]/30 text-[#00FF41] rounded-none font-bold" 
                                value={count} 
                                onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <label className={`flex flex-col gap-1.5 p-3 border transition-all cursor-pointer ${
                            exhaustMode ? 'bg-[#00FF41]/10 border-[#00FF41]' : 'border-[#00FF41]/20 opacity-50'
                          }`}>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase">Exhaustive Mode</span>
                                <Checkbox 
                                  checked={exhaustMode} 
                                  onCheckedChange={(v) => setExhaustMode(v as boolean)} 
                                  className="border-[#00FF41] data-[state=checked]:bg-[#00FF41] data-[state=checked]:text-black" 
                                />
                             </div>
                             <span className="text-[8px] opacity-60">Harvest until duplicate threshold.</span>
                          </label>

                          <label className={`flex flex-col gap-1.5 p-3 border transition-all cursor-pointer ${
                            cloudSync ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-[#00FF41]/20 opacity-50'
                          }`}>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase">Supabase Sync</span>
                                <Checkbox 
                                  checked={cloudSync} 
                                  onCheckedChange={(v) => setCloudSync(v as boolean)} 
                                  className="border-cyan-500 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black" 
                                />
                             </div>
                             <span className="text-[8px] opacity-60">Mirror to cloud database.</span>
                          </label>
                       </div>
                    </div>

                 </div>

                 {/* Action Buttons */}
                 <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                       <Button 
                         onClick={startHarvest} 
                         disabled={isHarvesting} 
                         className="flex-1 h-16 bg-[#00FF41] text-black font-black text-xl italic tracking-tight rounded-none hover:bg-black hover:text-[#00FF41] border-2 border-[#00FF41] disabled:opacity-30 cursor-pointer"
                       >
                         {isHarvesting ? 'HARVESTING DATA LIVE...' : 'START HARVEST ENGINE'}
                       </Button>

                       {isHarvesting && (
                         <Button 
                           onClick={handleHalt} 
                           className="h-16 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-none cursor-pointer"
                         >
                           STOP
                         </Button>
                       )}
                    </div>

                    {cloudSync && (
                       <Button
                         onClick={fetchSyncedQuestions}
                         variant="outline"
                         className="w-full h-10 border-[#00FF41]/30 text-[#00FF41] bg-transparent rounded-none font-bold text-xs uppercase tracking-widest hover:bg-[#00FF41]/10"
                       >
                         <Database className="w-3.5 h-3.5 mr-2" />
                         Check Cloud Manifest ({syncedQuestions.length} items synced)
                       </Button>
                    )}
                 </div>
              </div>
           </div>

           {/* Right Status Panel */}
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-black border border-[#00FF41]/30 p-6 flex flex-col space-y-6">
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4 border-b border-[#00FF41]/10 pb-2">
                      Subject Progress
                    </h3>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[9px] font-bold uppercase px-1">
                          <span className="opacity-60">Active: {subjectsInQueue[currentSubIdx] || 'None'}</span>
                          <span className={depletionProgress > 80 ? 'text-red-500 animate-pulse font-bold' : 'text-[#00FF41]'}>
                            {Math.round(depletionProgress)}% Complete
                          </span>
                       </div>
                       
                       <div className="h-4 bg-black border border-[#00FF41]/40 p-0.5">
                          <motion.div 
                            animate={{ width: `${depletionProgress}%` }} 
                            className={`h-full ${depletionProgress > 80 ? 'bg-red-500' : 'bg-[#00FF41]'}`} 
                          />
                       </div>
                       <p className="text-[8px] text-center opacity-40 uppercase pt-1">
                         Auto-switches to next subject upon completion.
                       </p>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-[#00FF41]/10 pb-2">
                      System Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { k: 'Status', v: isHarvesting ? 'Streaming' : 'Ready' },
                         { k: 'Format', v: 'SQLite (.db)' },
                         { k: 'Database', v: 'WASM In-Memory' },
                         { k: 'Packaging', v: 'ZIP Blob' }
                       ].map((s) => (
                          <div key={s.k} className="p-3 bg-[#00FF41]/5 border border-[#00FF41]/20">
                             <div className="text-[8px] font-bold opacity-40 uppercase mb-1">{s.k}</div>
                             <div className="text-[10px] font-bold">{s.v}</div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Live Terminal Log View */}
        <div className="bg-black border-2 border-[#00FF41] rounded-none h-[400px] relative flex flex-col shadow-[inset_0_0_30px_rgba(0,255,65,0.1)]">
           <div className="bg-[#00FF41] text-black px-4 py-1.5 flex justify-between items-center font-bold text-[10px] uppercase">
              <div className="flex items-center gap-2">
                 <RefreshCw className={`w-3 h-3 ${isHarvesting ? 'animate-spin' : ''}`} /> Console Diagnostic Stream
              </div>
              <div className="flex gap-4">
                 <span className="animate-pulse">● Active Log</span>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs space-y-1">
              {logs.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-30 uppercase tracking-widest text-xs">
                  Ready. Click Start Harvest to begin.
                </div>
              )}

              {logs.map((log) => (
                 <div key={log.id} className="flex gap-3 leading-relaxed">
                    <span className="opacity-30 select-none shrink-0">[{log.timestamp}]</span>
                    <span className={`
                       ${log.type === 'error' ? 'text-rose-400 font-bold' : ''}
                       ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                       ${log.type === 'warning' ? 'text-yellow-400' : ''}
                       ${log.type === 'terminal' ? 'text-white font-bold bg-[#00FF41]/10 px-1.5' : 'text-[#00FF41]'}
                    `}>
                       {log.message}
                    </span>
                 </div>
              ))}
              <div ref={terminalEndRef} />
           </div>
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center text-[10px] font-bold uppercase opacity-40 border-t border-[#00FF41]/20 pt-4 pb-8">
            <span>Client-Side SQLite Engine</span>
            <span>Elapsed Time: {elapsedSeconds}s</span>
            <span>Security: Secure Local Sandbox</span>
        </footer>

      </div>
    </div>
  );
}
