import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Database, Download, AlertCircle, Play, Save, Settings, Hash, Layers, Cloud, Zap, RefreshCw } from 'lucide-react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useThemeStore } from '@/src/store/useThemeStore';
import { supabase } from '@/src/lib/supabase';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'terminal';
}

export default function DataHarvester() {
  const { mode } = useThemeStore();
  const [token, setToken] = useState('');
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState('english');
  const [exam, setExam] = useState('jamb');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [exhaustMode, setExhaustMode] = useState(false);
  const [cloudSync, setCloudSync] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const stopRequested = useRef(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const startHarvest = async () => {
    if (!token) {
      addLog('FATAL: ACCESS TOKEN VOID', 'error');
      return;
    }

    if (cloudSync && !supabase) {
      addLog('ERROR: SUPABASE NOT CONFIGURED', 'error');
      return;
    }

    setIsHarvesting(true);
    stopRequested.current = false;
    setLogs([]);
    addLog(`INITIALIZING HARVEST PROTOCOL v1.2.0 [${cloudSync ? 'CLOUD_SYNC_ON' : 'LOCAL_ONLY'}]`, 'info');
    addLog('SQLITE VIRTUAL ENGINE BOOTING...', 'info');

    const seenIds = new Set<number>();
    let duplicateStreak = 0;
    const MAX_DUPLICATE_STREAK = 20; // If we get 20 duplicates in a row, assume exhausted

    try {
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      const db = new SQL.Database();
      
      db.run(`
        CREATE TABLE questions (
          id INTEGER PRIMARY KEY, 
          subject TEXT, 
          question_text TEXT, 
          option_a TEXT, 
          option_b TEXT, 
          option_c TEXT, 
          option_d TEXT, 
          answer TEXT, 
          explanation TEXT, 
          image_path TEXT,
          cloud_id TEXT
        )
      `);
      addLog('SCHEMA VALIDATED: TABLE [QUESTIONS] INITIALIZED', 'info');

      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      
      addLog(exhaustMode 
        ? 'MODE: EXHAUSTIVE EXTRACTION [SCANNING UNTIL DEPLETED]' 
        : `MODE: BATCH EXTRACTION [COUNT: ${count}]`, 'warning');
      
      let successCount = 0;
      let failCount = 0;
      let iterations = exhaustMode ? 9999 : count;

      for (let i = 0; i < iterations; i++) {
        if (stopRequested.current) {
          addLog('MANUAL INTERRUPT SIGNAL DETECTED. ABORTING...', 'warning');
          break;
        }

        try {
          addLog(`SCRAPING NODE [${successCount + 1}]...`, 'terminal');
          
          const response = await fetch(`https://questions.aloc.ng/api/v2/q?subject=${subject.toLowerCase()}`, {
            headers: {
              'Accept': 'application/json',
              'AccessToken': token
            }
          });

          if (!response.ok) {
            if (response.status === 401) {
              addLog('ERROR: UNAUTHORIZED - ACCESS_DENIED', 'error');
              break;
            }
            if (response.status === 429) {
              addLog('RATE_LIMIT_HIT: SLEEPING 10s TO EVADE DETECTION', 'warning');
              await new Promise(r => setTimeout(r, 10000));
              continue;
            }
            throw new Error(`STREAMS_ERROR: ${response.status}`);
          }

          const data = await response.json();
          if (data.status !== 200 || !data.data) {
            throw new Error(data.message || 'API_PROTOCOL_FAILURE');
          }

          const q = data.data;

          // Exhaustion Check
          if (seenIds.has(q.id)) {
            duplicateStreak++;
            addLog(`DUPLICATE DETECTED [ID: ${q.id}]. STREAK: ${duplicateStreak}/${MAX_DUPLICATE_STREAK}`, 'warning');
            if (exhaustMode && duplicateStreak >= MAX_DUPLICATE_STREAK) {
              addLog(`SUBJECT [${subject.toUpperCase()}] EXHAUSTED. TERMINATING HARVEST.`, 'success');
              break;
            }
            continue;
          }
          
          seenIds.add(q.id);
          duplicateStreak = 0; // Reset streak on fresh data

          let imagePath = '';
          let cloudUrl = '';

          // Image Handling
          if (q.image) {
            try {
              addLog(`PULLING ASSET: ${q.image}`, 'info');
              const imgRes = await fetch(q.image);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                const fileName = `img_${subject}_${q.id}.png`;
                
                // Local Zip
                imagesFolder?.file(fileName, blob);
                imagePath = fileName;

                // Supabase Storage
                if (cloudSync && supabase) {
                  addLog(`UPLOADING TO SUPABASE: ${fileName}`, 'info');
                  const { error: uploadError } = await supabase.storage
                    .from('question_assets')
                    .upload(`${subject}/${fileName}`, blob, { upsert: true });
                  
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('question_assets').getPublicUrl(`${subject}/${fileName}`);
                    cloudUrl = publicUrl;
                    addLog('CLOUD_ASSET_SYNC: SUCCESS', 'success');
                  } else {
                    addLog(`CLOUD_ASSET_SYNC_FAIL: ${uploadError.message}`, 'error');
                  }
                }
                
                addLog(`INTERNAL_STORAGE: COMMITTED [${fileName}]`, 'success');
              }
            } catch (err) {
              addLog('ASSET_FETCH_BLOCK: CORS/BYPASS FAILED', 'error');
            }
          }

          // Database Sync
          if (cloudSync && supabase) {
            addLog(`SYNCING DATA TO SUPABASE...`, 'info');
            const { error: dbError } = await supabase
              .from('questions')
              .upsert({
                aloc_id: q.id,
                subject: subject,
                exam_type: exam,
                question_text: q.question,
                option_a: q.option.a,
                option_b: q.option.b,
                option_c: q.option.c,
                option_d: q.option.d,
                answer: q.answer,
                explanation: q.solution || '',
                image_url: cloudUrl || imagePath,
                exam_year: q.examyear
              }, { onConflict: 'aloc_id' });

            if (dbError) addLog(`DB_SYNC_FAIL: ${dbError.message}`, 'error');
            else addLog('DB_SYNC_SUCCESS', 'success');
          }

          // SQLite Injection
          db.run(`
            INSERT INTO questions (subject, question_text, option_a, option_b, option_c, option_d, answer, explanation, image_path, cloud_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            subject,
            q.question,
            q.option.a,
            q.option.b,
            q.option.c,
            q.option.d,
            q.answer,
            q.solution || '',
            imagePath,
            cloudUrl
          ]);

          successCount++;
          addLog(`ENTRY_COMMITTED: [LOCAL+DB]`, 'success');
          
          // Smart Rate-Limiting: Jittered Delay (400ms - 1200ms)
          const jitter = 400 + Math.random() * 800;
          await new Promise(r => setTimeout(r, jitter));
          
        } catch (err: any) {
          failCount++;
          addLog(`NODE_CRUSH: ${err.message}`, 'error');
          await new Promise(r => setTimeout(r, 2000)); // Cool down on error
        }
      }

      addLog('HARVEST BATCH FINISHED.', 'warning');
      addLog(`RECAP: ${successCount} COMMITTED, ${seenIds.size - successCount} DUPLICATES FILTERED`, 'info');
      
      addLog('COAGULATING LOCAL ARCHIVE...', 'info');
      const dbData = db.export();
      zip.file('cbt_data.db', dbData);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `harvest_${subject}_${Date.now()}.zip`);
      
      addLog('ARCHIVE_READY. TRANSMISSION_SUCCESSFUL.', 'success');
      addLog('SYSTEM RETURNING TO STANDBY.', 'info');

    } catch (err: any) {
      addLog(`KERNAL_PANIC: ${err.message}`, 'error');
    } finally {
      setIsHarvesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#00FF00] font-mono p-4 md:p-8 selection:bg-[#00FF00] selection:text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b-2 border-[#00FF00] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`animate-pulse bg-[#00FF00]/20 p-2 rounded-lg border border-[#00FF00] ${isHarvesting ? 'bg-red-500/20 border-red-500 animate-bounce' : ''}`}>
              <Terminal className={`w-8 h-8 ${isHarvesting ? 'text-red-500' : ''}`} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">
                ALOC DATA HARVESTER
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[#00FF00] border-[#00FF00] rounded-none">
                  EXTRACTION PROTOCOL v1.2.0
                </Badge>
                {isHarvesting && <span className="animate-pulse text-red-500 font-black">[ HARVEST_ACTIVE ]</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] font-bold text-[#00FF00]/60">
            <span className="flex items-center gap-2">ENCRYPTION: HARDENED_SSL <Shield className="w-3 h-3" /></span>
            <span className="flex items-center gap-2">SUPABASE_REACH: {supabase ? 'ACTIVE' : 'OFFLINE'} <Cloud className="w-3 h-3" /></span>
          </div>
        </header>

        {/* Input Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 bg-slate-900/40 p-6 border border-[#00FF00]/20 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 p-2 text-[10px] opacity-20 rotate-90 origin-top-right">NODE_01_EXTRACT</div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> API_SECRET_KEY
                </label>
                <Input 
                  type="password"
                  placeholder="Paste Token..."
                  className="bg-black/50 border-[#00FF00]/30 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none placeholder:text-[#00FF00]/20 font-mono"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 opacity-50">
                    <Hash className="w-3 h-3" /> BATCH_SIZE
                  </label>
                  <Input 
                    type="number"
                    disabled={exhaustMode}
                    className="bg-black/50 border-[#00FF00]/30 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none disabled:opacity-30"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3 h-3" /> EXAM_SYSTEM
                  </label>
                  <select 
                    className="w-full h-10 px-3 bg-black/50 border border-[#00FF00]/30 text-[#00FF00] focus:outline-none focus:ring-1 focus:ring-[#00FF00] font-mono text-sm"
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                  >
                    <option value="jamb">JAMB (UTME)</option>
                    <option value="waec">WAEC (SSCE)</option>
                    <option value="neco">NECO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-3 h-3" /> SUBJECT_LOCATOR
                </label>
                <Input 
                  placeholder="e.g., english, biology..."
                  className="bg-black/50 border-[#00FF00]/30 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none placeholder:text-[#00FF00]/20 font-mono"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${exhaustMode ? 'border-[#00FF00] bg-[#00FF00]/10' : 'border-[#00FF00]/20 bg-black/20 text-[#00FF00]/40'}`}>
                  <Checkbox 
                    checked={exhaustMode} 
                    onCheckedChange={(v) => setExhaustMode(v as boolean)}
                    className="border-[#00FF00] data-[state=checked]:bg-[#00FF00] data-[state=checked]:text-black" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase">Exhaustive</span>
                    <span className="text-[8px] opacity-70">Scrape All</span>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${cloudSync ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' : 'border-[#00FF00]/20 bg-black/20 text-[#00FF00]/40'}`}>
                  <Checkbox 
                    checked={cloudSync} 
                    onCheckedChange={(v) => setCloudSync(v as boolean)}
                    className="border-cyan-400 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase">Cloud Sync</span>
                    <span className="text-[8px] opacity-70">Supabase</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                onClick={startHarvest}
                disabled={isHarvesting}
                className={`flex-1 h-14 bg-[#00FF00] text-black hover:bg-[#00FF00]/80 font-black text-lg rounded-none group disabled:bg-[#00FF00]/10 disabled:text-[#00FF00]/30`}
              >
                {isHarvesting ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5 animate-bounce" /> HARVESTING...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> INITIATE HARVEST
                  </span>
                )}
              </Button>
              {isHarvesting && (
                <Button 
                  onClick={() => { stopRequested.current = true; }}
                  variant="destructive"
                  className="h-14 px-6 rounded-none bg-red-600 hover:bg-red-700 text-white font-black"
                >
                  HALT
                </Button>
              )}
            </div>
          </div>

          {/* Quick Info & Stats */}
          <div className="bg-slate-900/40 p-6 border border-[#00FF00]/20 space-y-4 backdrop-blur-md flex flex-col">
            <h3 className="text-sm font-black border-b border-[#00FF00]/20 pb-2 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isHarvesting ? 'animate-spin' : ''}`} /> HARVEST_STATUS_FEEDBACK
            </h3>
            
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase">
                <div className="bg-black/40 p-3 border border-[#00FF00]/10">
                  <span className="block text-[#00FF00]/40 mb-1">Deduplication</span>
                  <span className="text-sm font-bold">STRICT_MODE</span>
                </div>
                <div className="bg-black/40 p-3 border border-[#00FF00]/10">
                  <span className="block text-[#00FF00]/40 mb-1">Rate Limit</span>
                  <span className="text-sm font-bold text-yellow-400 italic">SMART_WAIT</span>
                </div>
                <div className="bg-black/40 p-3 border border-[#00FF00]/10">
                  <span className="block text-[#00FF00]/40 mb-1">Security</span>
                  <span className="text-sm font-bold text-cyan-400">JITTER_ENABLED</span>
                </div>
                <div className="bg-black/40 p-3 border border-[#00FF00]/10">
                  <span className="block text-[#00FF00]/40 mb-1">Storage</span>
                  <span className="text-sm font-bold">{cloudSync ? 'HYBRID' : 'LOCAL_ONLY'}</span>
                </div>
              </div>

              <div className="pt-2">
                  <div className="flex justify-between text-[10px] mb-1">
                      <span>Protocol Stability</span>
                      <span className="text-[#00FF00]">99.8%</span>
                  </div>
                  <div className="h-1 bg-white/5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isHarvesting ? '100%' : '10%' }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="h-full bg-[#00FF00]"
                      />
                  </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] leading-relaxed italic">
                NOTICE: EXHAUSTIVE MODE WILL AUTO-RETRY UP TO 20 TIMES ON DUPLICATES BEFORE ASSUMING END-OF-FILE.
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Area */}
        <div className="bg-black border-2 border-[#00FF00] rounded-none overflow-hidden flex flex-col h-[500px] shadow-[0_0_30px_rgba(0,255,0,0.1)]">
          <div className="bg-[#00FF00] text-black px-4 py-1.5 flex items-center justify-between text-xs font-black">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3" /> FEED_MONITOR_RAW_DATA
            </div>
            <div className="flex gap-4">
              <span className="opacity-50">NODE: 0xARENA</span>
              <span className="animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-black" /> {isHarvesting ? 'HARVESTING' : 'READY'}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar-terminal bg-[radial-gradient(circle_at_center,_rgba(0,255,0,0.05)_0%,_transparent_100%)]">
            {logs.length === 0 && (
              <div className="text-[#00FF00]/20 italic text-sm animate-pulse">SYSTEM_IDLE: Awaiting extraction command...</div>
            )}
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 text-xs font-mono group"
                >
                  <span className="text-[#00FF00]/30 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                    ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                    ${log.type === 'terminal' ? 'text-white font-black' : ''}
                    group-hover:translate-x-1 transition-transform
                  `}>
                    {log.type === 'error' ? '✖_FATAL: ' : ''}
                    {log.type === 'success' ? '✔_COMMITTED: ' : ''}
                    {log.type === 'warning' ? '⚠_WARN: ' : ''}
                    {log.type === 'terminal' ? '▶_STREAM: ' : ''}
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-[10px] text-[#00FF00]/40 flex justify-between items-center pb-8 uppercase border-t border-[#00FF00]/10 pt-4">
          <div className="flex gap-6">
            <span>ENGINE: EDU_ARENA_v2.0</span>
            <span className="text-cyan-400">SECURE_SYNC_OVERRIDE</span>
          </div>
          <span className="animate-pulse">TERMINAL_ESTABLISHED_{new Date().getFullYear()}</span>
        </footer>

      </div>

      <style>{`
        .custom-scrollbar-terminal::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.9);
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb {
          background: #00FF00;
          border-radius: 0px;
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb:hover {
          background: #00FF00;
          box-shadow: 0 0 10px #00FF00;
        }
      `}</style>
    </div>
  );
}
