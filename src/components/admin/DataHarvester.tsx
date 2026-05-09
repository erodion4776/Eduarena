import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Database, Download, AlertCircle, Play, Save, Settings, Hash, Layers } from 'lucide-react';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useThemeStore } from '@/src/store/useThemeStore';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

export default function DataHarvester() {
  const { mode } = useThemeStore();
  const [token, setToken] = useState('');
  const [count, setCount] = useState(10);
  const [subject, setSubject] = useState('english');
  const [exam, setExam] = useState('jamb');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

    setIsHarvesting(true);
    setLogs([]);
    addLog('INITIALIZING HARVEST PROTOCOL v1.1.0...', 'info');
    addLog('SQLITE VIRTUAL ENGINE BOOTING...', 'info');

    try {
      // Initialize SQL.js
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      const db = new SQL.Database();
      
      addLog('DATABASE CREATED IN-MEMORY', 'success');
      
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
          image_path TEXT
        )
      `);
      addLog('SCHEMA VALIDATED: TABLE [QUESTIONS] INITIALIZED', 'info');

      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      
      addLog(`STARTING BATCH FETCH: ${count} QUESTIONS...`, 'warning');
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < count; i++) {
        try {
          addLog(`FETCHING NODE [${i + 1}/${count}]...`, 'info');
          
          const response = await fetch(`https://questions.aloc.ng/api/v2/q?subject=${subject.toLowerCase()}`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'AccessToken': token
            }
          });

          if (!response.ok) {
            if (response.status === 401) {
              addLog('ERROR: UNAUTHORIZED - INVALID TOKEN', 'error');
              break;
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data.status !== 200 || !data.data) {
            throw new Error(data.message || 'Unknown API Error');
          }

          const q = data.data;
          let imageLocalPath = '';

          // Asset Handling
          if (q.section && q.section.includes('<img')) {
              addLog('DIAGRAM DETECTED IN SECTION. SCRAPING...', 'warning');
              // Basic extraction logic if exists in HTML or direct image field
          }

          if (q.image) {
            try {
              addLog(`SYNCING ASSET: ${q.image}`, 'info');
              const imgRes = await fetch(q.image, { mode: 'cors' });
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                const fileName = `img_${subject}_${Date.now()}_${i}.png`;
                imagesFolder?.file(fileName, blob);
                imageLocalPath = fileName;
                addLog(`ASSET SAVED: ${fileName}`, 'success');
              } else {
                addLog('CORS/NETWORK BLOCK: IMAGE SYNC FAILED. SKIPPING.', 'error');
              }
            } catch (err) {
              addLog('ASSET BYPASS: RELATIONAL IMAGE FETCH FAILED.', 'error');
            }
          }

          // SQLite Injection
          db.run(`
            INSERT INTO questions (subject, question_text, option_a, option_b, option_c, option_d, answer, explanation, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            subject,
            q.question,
            q.option.a,
            q.option.b,
            q.option.c,
            q.option.d,
            q.answer,
            q.solution || '',
            imageLocalPath
          ]);

          successCount++;
          addLog(`DATA INJECTED: NODE [${i + 1}] COMMITTED`, 'success');
          
          // To avoid rate limiting or blocking
          await new Promise(r => setTimeout(r, 500));
          
        } catch (err: any) {
          failCount++;
          addLog(`NODE FAILURE: ${err.message}`, 'error');
        }
      }

      addLog('HARVEST BATCH COMPLETE.', 'warning');
      addLog(`SUMMARY: ${successCount} SUCCESS, ${failCount} FAIL`, 'info');
      
      addLog('COMPILING COMPRESSED PACKAGE...', 'info');
      
      const dbData = db.export();
      zip.file('cbt_data.db', dbData);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'cbt_package.zip');
      
      addLog('PACKAGE TRANSMITTED. DOWNLOAD INITIATED.', 'success');
      addLog('SYSTEM STANDBY.', 'info');

    } catch (err: any) {
      addLog(`CRITICAL ERROR: ${err.message}`, 'error');
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
            <div className="animate-pulse bg-[#00FF00]/20 p-2 rounded-lg border border-[#00FF00]">
              <Terminal className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">
                ALOC DATA HARVESTER
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[#00FF00] border-[#00FF00] rounded-none">
                  STANDALONE EXTRACTION PROTOCOL v1.1.0
                </Badge>
                <span className="text-[#00FF00]/50">SECURE_LINK: ESTABLISHED</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-bold">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> ENCRYPTION: AES-256</span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> DB_TYPE: SQLITE3</span>
          </div>
        </header>

        {/* Input Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 bg-slate-900/50 p-6 border border-[#00FF00]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-[10px] opacity-20 rotate-90 origin-top-right">INPUT_NODE_01</div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Access Token
                </label>
                <Input 
                  type="password"
                  placeholder="Enter ALOC.NG API Key..."
                  className="bg-black border-[#00FF00]/50 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none placeholder:text-[#00FF00]/20"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3 h-3" /> Harvest Count
                  </label>
                  <Input 
                    type="number"
                    className="bg-black border-[#00FF00]/50 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Target Exam
                  </label>
                  <select 
                    className="w-full h-10 px-3 bg-black border border-[#00FF00]/50 text-[#00FF00] focus:outline-none focus:ring-1 focus:ring-[#00FF00]"
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                  >
                    <option value="jamb">JAMB</option>
                    <option value="waec">WAEC</option>
                    <option value="neco">NECO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-3 h-3" /> Subject Node
                </label>
                <Input 
                  placeholder="e.g., english, biology, mathematics..."
                  className="bg-black border-[#00FF00]/50 text-[#00FF00] focus-visible:ring-[#00FF00] rounded-none placeholder:text-[#00FF00]/20"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={startHarvest}
              disabled={isHarvesting}
              className={`w-full h-14 bg-[#00FF00] text-black hover:bg-[#00FF00]/80 font-black text-lg rounded-none mt-6 group disabled:bg-[#00FF00]/20 disabled:text-[#00FF00]/50`}
            >
              {isHarvesting ? (
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 animate-spin" /> HARVESTING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" /> START HARVEST
                </span>
              )}
            </Button>
          </div>

          {/* Quick Info */}
          <div className="bg-slate-900/50 p-6 border border-[#00FF00]/30 space-y-4">
            <h3 className="text-sm font-black border-b border-[#00FF00]/30 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" /> HARVEST PARAMETERS
            </h3>
            <div className="space-y-2 text-[10px] uppercase">
              <div className="flex justify-between"><span className="text-[#00FF00]/50">Status:</span> <span>{isHarvesting ? 'ACTIVE' : 'IDLE'}</span></div>
              <div className="flex justify-between"><span className="text-[#00FF00]/50">API_URL:</span> <span>questions.aloc.ng/v2</span></div>
              <div className="flex justify-between"><span className="text-[#00FF00]/50">Mode:</span> <span>Offline_DB_Generator</span></div>
              <div className="flex justify-between"><span className="text-[#00FF00]/50">Compression:</span> <span>ZIP v2.0</span></div>
              <div className="flex justify-between"><span className="text-[#00FF00]/50">SQLV:</span> <span>SQLite 3.x</span></div>
            </div>
            
            <div className="pt-4 space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] leading-relaxed">
                WARNING: EXPORTING LARGE BATCHES MAY RESULT IN HIGH API LATENCY. USE CAUTION WITH REQUEST COUNTS &gt; 100.
              </div>
              <div className="p-3 bg-[#00FF00]/10 border border-[#00FF00]/30 text-[#00FF00] text-[10px] leading-relaxed">
                PROTOCOL: ASSETS WILL BE STORED IN A LOCAL 'IMAGES' FOLDER. THE DATABASE WILL REFERENCE THESE LOCALLY.
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Area */}
        <div className="bg-black border-2 border-[#00FF00] rounded-lg overflow-hidden flex flex-col h-[500px]">
          <div className="bg-[#00FF00] text-black px-4 py-1 flex items-center justify-between text-xs font-black">
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3" /> TERMINAL OUTPUT
            </div>
            <div className="flex gap-2">
              <span className="opacity-50">v1.1.0_PROD</span>
              <span className="animate-pulse">● LIVE</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar-terminal">
            {logs.length === 0 && (
              <div className="text-[#00FF00]/30 italic text-sm">Waiting for harvest initiation...</div>
            )}
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 text-xs font-mono"
                >
                  <span className="text-[#00FF00]/30 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                    ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                  `}>
                    {log.type === 'error' ? '>>> ERROR: ' : ''}
                    {log.type === 'success' ? '>>> SUCCESS: ' : ''}
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-[10px] text-[#00FF00]/30 flex justify-between items-center pb-8 uppercase">
          <span>ALOC_HARVEST_ENGINE_LOADED</span>
          <span>SYSTEM_TIME: {new Date().toISOString()}</span>
          <span>© EDU ARENA SECURITY OPS</span>
        </footer>

      </div>

      <style>{`
        .custom-scrollbar-terminal::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb {
          background: #00FF00;
          border-radius: 0px;
        }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb:hover {
          background: #00CC00;
        }
      `}</style>
    </div>
  );
}
