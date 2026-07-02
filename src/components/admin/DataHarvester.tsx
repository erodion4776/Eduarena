import { alocIngestionService } from '@/src/lib/alocIngestionService';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Terminal, Shield, Database, Layers, Cloud, RefreshCw } from 'lucide-react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/src/lib/supabase';

interface LogEntry {
  id: number; // ✅ FIX 11: integer counter, not Math.random()
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'terminal';
}

/**
 * FIX 6 & 3: Interruptible delay that respects AbortSignal.
 * Resolves early when signal fires — HALT instantly unblocks waits.
 */
function interruptibleDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timerId = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timerId);
      reject(new DOMException('Harvest halted.', 'AbortError'));
    }, { once: true });
  });
}

export default function DataHarvester() {
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

  // FIX 8: Track elapsed time properly via interval
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const stopRequested = useRef(false);
  const logCounterRef = useRef(0); // FIX 11: monotonic ID
  const abortRef = useRef<AbortController | null>(null); // FIX 3
  const startTimeRef = useRef(0); // FIX 8

  const subjectsInQueue = useMemo(() => 
    subject.split(',').map(s => s.trim()).filter(Boolean), 
  [subject]);

  // ── FIX 7: stable addLog via useCallback ────────────────────────
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: ++logCounterRef.current,
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ].slice(-100)); // Keep last 100 logs for perf
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // FIX 8: Elapsed time counter — runs only while harvesting
  useEffect(() => {
    if (!isHarvesting) {
      setElapsedSeconds(0);
      return;
    }
    startTimeRef.current = performance.now();
    const interval = setInterval(() => {
      setElapsedSeconds(
        Math.floor((performance.now() - startTimeRef.current) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isHarvesting]);

  // ── fetchSyncedQuestions — FIX 4: wired to a button in the UI ───
  const fetchSyncedQuestions = async () => {
    try {
      addLog('FETCHING_SYNCED_QUESTIONS_FROM_SUPABASE...', 'info');
      const res = await alocIngestionService.fetchAllQuestions();
      setSyncedQuestions(res.data);
      addLog(`SYNC_SUCCESS: Fetched ${res.data.length} questions from Supabase.`, 'success');
    } catch (err: any) {
      addLog(`SYNC_ERROR: ${err.message}`, 'error');
    }
  };

  const startHarvest = async () => {
    if (!token.trim()) {
      addLog('FATAL: ACCESS TOKEN VOID', 'error');
      return;
    }

    // FIX 3: fresh AbortController per harvest run
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setIsHarvesting(true);
    stopRequested.current = false;
    setLogs([]);
    addLog(`INIT HARVEST PROTOCOL v2.0.2 [${subjectsInQueue.length} SUBJECTS IN QUEUE]`, 'info');
    
    // FIX 5: declare db outside try so finally can close it
    let db: any = null;

    try {
      addLog('BOOTING VIRTUAL SQL_ENGINE...', 'info');
      
      const wasmRes = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/sql-wasm.wasm', { signal });
      if (!wasmRes.ok) throw new Error('WASM_LOAD_FAILURE: CDN unreachable');
      const wasmBinary = await wasmRes.arrayBuffer();

      const SQL = await initSqlJs({
        wasmBinary
      });
      
      db = new SQL.Database();
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

      for (let sIdx = 0; sIdx < subjectsInQueue.length; sIdx++) {
        if (signal.aborted) break;
        
        setCurrentSubIdx(sIdx);
        setDepletionProgress(0);
        const currentSub = subjectsInQueue[sIdx];
        
        addLog(`>> PENETRATING NODE: [${currentSub.toUpperCase()}]`, 'terminal');
        
        const seenIds = new Set<number>();
        let duplicateStreak = 0;
        const MAX_DUPE_LIMIT = 25;
        let successCount = 0;
        let iterations = exhaustMode ? 10000 : count;

        for (let i = 0; i < iterations; i++) {
          if (signal.aborted) break;

          try {
            // Use the proxy endpoint with custom token delegation support to avoid CORS / quota block limits
            const url = `/api/aloc/q/1?subject=${currentSub.toLowerCase()}&type=${exam.toLowerCase()}`;
            const response = await fetch(url, {
              headers: { 
                'Accept': 'application/json', 
                'AccessToken': token.trim() 
              },
              signal, // FIX 3: fetch respects HALT signal
            });

            if (!response.ok) {
              if (response.status === 429) {
                addLog(`RATE_LIMIT (429): THROTTLING 10s`, 'warning');
                await interruptibleDelay(10000, signal); // FIX 6
                continue;
              }
              const errText = await response.text();
              addLog(`API_REJECT [${response.status}]: ${errText.slice(0, 50)}`, 'error');
              break;
            }

            const data = await response.json();
            if (!data || !data.data) {
                addLog(`EMPTY_PAYLOAD [${currentSub}]`, 'warning');
                continue;
            }
            const q = data.data;

            if (seenIds.has(q.id)) {
              duplicateStreak++;
              const progress = (duplicateStreak / MAX_DUPE_LIMIT) * 100;
              setDepletionProgress(progress);
              
              if (exhaustMode && duplicateStreak >= MAX_DUPE_LIMIT) {
                addLog(`[${currentSub.toUpperCase()}] DEPLETED. NEXT NODE...`, 'success');
                break;
              }
              continue;
            }

            seenIds.add(q.id);
            duplicateStreak = 0;
            setDepletionProgress(0);

            let cloudImageUrl = '';
            
            // Image -> Supabase Logic
            if (q.image && cloudSync && supabase) {
                try {
                    // FIX 9: image fetch with 10s timeout
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
                } catch (e: any) {
                    if (e.name !== 'AbortError') {
                        addLog(`IMAGE_SYNC_BLOCK: ${q.id}`, 'error');
                    }
                }
            }

            // Cloud Data Sync
            if (cloudSync && supabase) {
               try {
                  const syncRes = await alocIngestionService.ingestQuestion(q, currentSub, exam);
                  if (syncRes.status === 'skipped') {
                     addLog(`CLOUD_SYNC: Question [${q.id}] already exists (skipped)`, 'info');
                  } else {
                     addLog(`CLOUD_SYNC_SUCCESS [${q.id}]: Ingested with embeddings ✓`, 'success');
                  }
               } catch (syncError: any) {
                  // Fallback: direct upsert with correct schema (no embedding)
                  const rebuiltOptions = {
                     a: q.option?.a ?? '',
                     b: q.option?.b ?? '',
                     c: q.option?.c ?? '',
                     d: q.option?.d ?? '',
                     ...(q.option?.e ? { e: q.option.e } : {})
                  };

                  const { error: fallbackError } = await supabase.from('global_questions_vault').upsert({
                     id: q.id,
                     subject: currentSub.toLowerCase(),
                     exam_type: exam.toLowerCase(),
                     question_data: q
                  }, { onConflict: 'id' });

                  if (fallbackError) {
                     addLog(`CLOUD_SYNC_FAIL [${q.id}]: ${fallbackError.message}`, 'error');
                  } else {
                     addLog(`CLOUD_SYNC_SUCCESS [${q.id}]: Upserted without embedding ✓`, 'success');
                  }
               }
            }

            // Local DB Sync
            db.run(`INSERT INTO questions (aloc_id, subject, question_text, option_a, option_b, option_c, option_d, answer, explanation, image_url, exam_year) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, 
               [q.id, currentSub, q.question, q.option?.a ?? '', q.option?.b ?? '', q.option?.c ?? '', q.option?.d ?? '', q.answer, q.solution || '', cloudImageUrl || q.image || '', q.examyear]);

            successCount++;
            if (successCount % 5 === 0) addLog(`COMMITTED: ${successCount} NODES [${currentSub}]`, 'success');
            
            // FIX 12: skip delay on final item of final subject
            const isLastItem = sIdx === subjectsInQueue.length - 1 && i === iterations - 1;
            if (!isLastItem) {
               await interruptibleDelay(600 + Math.random() * 600, signal); // FIX 6
            }
          } catch (err: any) {
            if (err.name === 'AbortError') break; // clean exit on HALT
            addLog(`SCRAPE_EXCEPTION: ${err.message}`, 'error');
            await interruptibleDelay(2000, signal).catch(() => {}); // FIX 6
          }
        }
      }

      const dbExport = db.export();
      zip.file('cbt_master_vault.db', dbExport);
      const pkg = await zip.generateAsync({ type: 'blob' });
      saveAs(pkg, `extract_${Date.now()}.zip`);
      addLog('MASTER HARVEST COMPLETE. DOWNLOAD READY.', 'success');

    } catch (err: any) {
      if (err.name !== 'AbortError') {
         addLog(`FATAL_CRASH: ${err.message}`, 'error');
      } else {
         addLog('HARVEST HALTED BY OPERATOR.', 'warning');
      }
    } finally {
      db?.close(); // FIX 5: always close WASM DB to avoid memory leak
      setIsHarvesting(false);
      setDepletionProgress(0);
    }
  };

  const handleHalt = () => {
    stopRequested.current = true;
    abortRef.current?.abort(); // FIX 3: cancels fetch + all delays
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00FF41] font-mono p-4 md:p-8 relative selection:bg-[#00FF41] selection:text-black">
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,2px_100%] opacity-30" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <header className="border-b-2 border-[#00FF41]/20 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className={`p-2 border-2 ${isHarvesting ? 'border-red-500 animate-pulse bg-red-500/10' : 'border-[#00FF41] bg-[#00FF41]/10'}`}>
                <Terminal className={`w-8 h-8 ${isHarvesting ? 'text-red-500' : 'text-[#00FF41]'}`} />
              </div>
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase whitespace-nowrap">ALOC_Harvester <span className="text-white">v2.0.0</span></h1>
                <div className="flex items-center gap-3 mt-1">
                   <Badge variant="outline" className="border-[#00FF41]/40 text-[#00FF41] rounded-none text-[8px] tracking-widest font-black uppercase">Secure Shell Active</Badge>
                   {isHarvesting && <span className="text-[10px] text-red-500 font-black animate-pulse">[ HARVEST_ENGAGED ]</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-sm">
             <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 opacity-60">
                <span>Subject Pipeline</span>
                {/* FIX 10: only show count when harvesting */}
                <span>{isHarvesting ? currentSubIdx + 1 : 0} / {subjectsInQueue.length}</span>
             </div>
             <div className="flex gap-1">
                {subjectsInQueue.map((s, i) => (
                   <div key={s+i} className={`h-1.5 flex-1 border ${i < currentSubIdx ? 'bg-[#00FF41] border-[#00FF41]' : i === currentSubIdx && isHarvesting ? 'bg-[#00FF41] animate-pulse border-[#00FF41]' : 'border-[#00FF41]/20'}`} />
                ))}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           {/* Left Controls */}
           <div className="lg:col-span-8 space-y-6">
              <div className="bg-black border border-[#00FF41]/30 p-8 space-y-8 relative shadow-[0_0_40px_rgba(0,255,65,0.05)]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                             <Shield className="w-3 h-3" /> API_SECRET_GATEWAY
                          </label>
                          <Input 
                            type="password" 
                            placeholder="••••••••••••••••••••"
                            className="bg-transparent border-[#00FF41]/30 h-12 text-[#00FF41] focus-visible:ring-[#00FF41] rounded-none font-mono text-xl tracking-tighter"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                             <Layers className="w-3 h-3" /> SUBJECT_QUEUE_LOCATOR
                          </label>
                          <Input 
                            placeholder="english, math, biology..."
                            className="bg-transparent border-[#00FF41]/30 h-12 text-white focus-visible:ring-[#00FF41] rounded-none font-mono"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                          />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase opacity-40">SYSTEM_ROOT</label>
                             <select value={exam} onChange={e => setExam(e.target.value)} className="w-full h-12 bg-black border border-[#00FF41]/30 text-[#00FF41] font-black text-sm rounded-none px-2">
                                <option value="jamb">JAMB (UTME)</option>
                                <option value="waec">WAEC</option>
                             </select>
                          </div>
                          <div className={`space-y-2 transition-all duration-500 ${exhaustMode ? 'opacity-20 pointer-events-none scale-95' : 'opacity-100'}`}>
                             <label className="text-[9px] font-black uppercase opacity-40">STATIC_COUNT</label>
                             <Input 
                                type="number" 
                                min={1}
                                className="h-12 bg-black border-[#00FF41]/30 text-[#00FF41] rounded-none font-black" 
                                value={count} 
                                onChange={e => setCount(parseInt(e.target.value, 10) || 1)} // FIX 1
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <label className={`flex flex-col gap-2 p-4 border transition-all cursor-pointer ${exhaustMode ? 'bg-[#00FF41]/10 border-[#00FF41]' : 'border-[#00FF41]/20 opacity-40'}`}>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase">Exhaustive_Extra</span>
                                <Checkbox checked={exhaustMode} onCheckedChange={v => setExhaustMode(v as boolean)} className="border-[#00FF41] data-[state=checked]:bg-[#00FF41] data-[state=checked]:text-black" />
                             </div>
                             <span className="text-[8px] opacity-60">Search until node depletion.</span>
                          </label>
                          <label className={`flex flex-col gap-2 p-4 border transition-all cursor-pointer ${cloudSync ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-[#00FF41]/20 opacity-40'}`}>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase">Supabase_Sync</span>
                                <Checkbox checked={cloudSync} onCheckedChange={v => setCloudSync(v as boolean)} className="border-cyan-500 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black" />
                             </div>
                             <span className="text-[8px] opacity-60">Push to master cloud DB.</span>
                          </label>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-4">
                    <div className="flex gap-2 relative">
                       <Button 
                         onClick={startHarvest} 
                         disabled={isHarvesting} 
                         className="flex-1 h-16 bg-[#00FF41] text-black font-black text-2xl italic tracking-tighter rounded-none hover:bg-black hover:text-[#00FF41] border-2 border-[#00FF41] disabled:opacity-30"
                       >
                         {isHarvesting ? 'SCAN_DECODING_LIVE...' : 'AWAKEN_HARVESTER_CORE'}
                       </Button>
                       {isHarvesting && (
                         <Button onClick={handleHalt} className="h-16 px-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-none">HALT</Button>
                       )}
                    </div>

                    {/* FIX 4: fetchSyncedQuestions trigger button */}
                    {cloudSync && (
                       <Button
                         onClick={fetchSyncedQuestions}
                         variant="outline"
                         className="w-full h-10 border-[#00FF41]/30 text-[#00FF41] bg-transparent rounded-none font-black text-xs uppercase tracking-widest"
                       >
                         <Database className="w-3.5 h-3.5 mr-2" />
                         FETCH VAULT MANIFEST ({syncedQuestions.length} cached)
                       </Button>
                    )}
                 </div>
              </div>
           </div>

           {/* Right Feedback */}
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-black border border-[#00FF41]/30 p-6 flex flex-col h-full space-y-8">
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-6 border-b border-[#00FF41]/10 pb-2">Node Depletion Monitor</h3>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase px-1">
                             <span className="opacity-50">Target: {subjectsInQueue[currentSubIdx] || 'NULL'}</span>
                             <span className={depletionProgress > 80 ? 'text-red-500 animate-pulse' : 'text-[#00FF41]'}>{Math.round(depletionProgress)}% Deplete</span>
                          </div>
                          <div className="h-4 bg-black border border-[#00FF41]/40 p-0.5">
                             <motion.div animate={{ width: `${depletionProgress}%` }} className={`h-full ${depletionProgress > 80 ? 'bg-red-500' : 'bg-[#00FF41]'} shadow-[0_0_15px_rgba(0,255,65,0.4)]`} />
                          </div>
                          <p className="text-[7px] text-center italic opacity-30 mt-2 uppercase font-black">Scanning for redundancy... next jump on threshold break.</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-[#00FF41]/10 pb-2">Curriculum Stream</h3>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { k: 'Latency', v: isHarvesting ? '~32ms' : '0ms' },
                         { k: 'Threats', v: '0_DETECT' },
                         { k: 'Protocol', v: 'SECURE_X' },
                         { k: 'Payload', v: 'CBT_RAW' }
                       ].map(s => (
                          <div key={s.k} className="p-3 bg-[#00FF41]/5 border border-[#00FF41]/20">
                             <div className="text-[7px] font-bold opacity-40 uppercase mb-1">{s.k}</div>
                             <div className="text-[10px] font-black">{s.v}</div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Terminal Log Output */}
        <div className="bg-black border-2 border-[#00FF41] rounded-none h-[450px] relative flex flex-col shadow-[inset_0_0_30px_rgba(0,255,65,0.1)]">
           <div className="bg-[#00FF41] text-black px-4 py-1.5 flex justify-between items-center font-black text-[10px] uppercase">
              <div className="flex items-center gap-2">
                 <RefreshCw className={`w-3 h-3 ${isHarvesting ? 'animate-spin' : ''}`} /> System_Diagnostic_Output.log
              </div>
              <div className="flex gap-4">
                 <span>Node: ARENA_001</span>
                 <span className="animate-pulse">● LIVE_STREAM</span>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] custom-scrollbar-terminal space-y-1">
              {logs.length === 0 && <div className="h-full flex items-center justify-center opacity-10 uppercase tracking-[1em] font-black text-xs">Waiting_For_Input</div>}
              {logs.map(log => (
                 <div key={log.id} className="flex gap-4 group">
                    <span className="opacity-20 select-none shrink-0">[{log.timestamp}]</span>
                    <span className={`
                       ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                       ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                       ${log.type === 'warning' ? 'text-yellow-400 italic' : ''}
                       ${log.type === 'terminal' ? 'text-white font-black bg-[#00FF41]/10 px-2' : ''}
                       group-hover:translate-x-1 transition-transform
                    `}>
                       {log.message}
                    </span>
                 </div>
              ))}
              <div ref={terminalEndRef} />
           </div>
        </div>

        {/* Footer — FIX 8: uses interval-tracked elapsed time */}
        <footer className="flex justify-between items-center text-[9px] font-black uppercase opacity-20 border-t border-[#00FF41]/20 pt-6 pb-12">
            <span>Core: ALU-9000-POWERED</span>
            <span>Est_Runtime: {elapsedSeconds}s</span>
            <span>Security: HARDENED_ENCRYPT</span>
        </footer>
      </div>
    </div>
  );
}
