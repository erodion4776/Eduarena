import { useState, useRef, useEffect } from 'react';
import { Download, Play, Square, Terminal as TerminalIcon, Database } from 'lucide-react';
import { questionImportService } from '@/src/lib/questionImportService';

export default function AlocHarvester() {
  const [token, setToken] = useState('');
  const [examType, setExamType] = useState('jamb');
  const [subject, setSubject] = useState('english');
  const [requestCount, setRequestCount] = useState(100);
  
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [harvestedQuestions, setHarvestedQuestions] = useState<any[]>([]);
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'error' | 'success' }[]>([]);
  
  const stopRef = useRef(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), text, type }]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const startHarvest = async () => {
    if (!token.trim()) {
      addLog("ERROR: Access Token is required.", "error");
      return;
    }

    setIsHarvesting(true);
    stopRef.current = false;
    setHarvestedQuestions([]);
    setLogs([]);
    addLog(`[INIT] Starting harvest sequence for ${examType.toUpperCase()} ${subject.toUpperCase()}...`, "info");

    let items: any[] = [];

    for (let i = 1; i <= requestCount; i++) {
      if (stopRef.current) {
        addLog(`[SYS] Harvest manually aborted at request ${i - 1}.`, "error");
        break;
      }

      try {
        const res = await fetch(`https://questions.aloc.com.ng/api/v2/q?subject=${subject}&type=${examType}`, {
          method: 'GET',
          headers: {
            'AccessToken': token,
            'Accept': 'application/json'
          }
        });

        if (res.status === 429) {
          addLog(`[ERR] Rate Limit (429) hit on request ${i}/${requestCount}. Aborting loop.`, "error");
          break;
        }

        if (!res.ok) {
          addLog(`[ERR] API Error (${res.status}) on request ${i}/${requestCount}. Aborting loop.`, "error");
          break;
        }

        const data = await res.json();
        if (data && data.data) {
          if (Array.isArray(data.data)) {
            items.push(...data.data);
          } else {
            items.push(data.data);
          }
          addLog(`[SYS] Fetching ${examType} ${subject} - Request ${i}/${requestCount}... SUCCESS! Total Vault: ${items.length}`, "success");
        } else {
          addLog(`[WARN] No data struct returned on request ${i}.`, "error");
        }

        await delay(500);
      } catch (err: any) {
        addLog(`[EXP] Exception on request ${i}: ${err.message}`, "error");
        break;
      }
    }

    setHarvestedQuestions(items);
    setIsHarvesting(false);
    addLog(`[END] Harvest complete. Total accumulated: ${items.length} questions.`, "info");
  };

  const saveToDatabase = async () => {
    setIsSaving(true);
    addLog(`[DB] Starting insertion of ${harvestedQuestions.length} questions...`, "info");
    try {
        await questionImportService.importQuestionsBatch(harvestedQuestions, (msg) => addLog(`[DB] ${msg}`, 'info'));
    } catch (err: any) {
        addLog(`[DB-ERR] ${err.message}`, "error");
    } finally {
        setIsSaving(false);
    }
  };

  const stopHarvest = () => {
    stopRef.current = true;
  };

  const downloadJson = () => {
    if (harvestedQuestions.length === 0) return;
    const blob = new Blob([JSON.stringify(harvestedQuestions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examType}_${subject}_vault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-6 font-medium selection:bg-green-500/30 selection:text-green-300">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="border border-green-800 p-4 rounded-lg bg-green-950/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <TerminalIcon className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl font-bold tracking-widest uppercase text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
               ALOC Data Harvester 
            </h1>
          </div>
          <p className="text-green-700 text-sm">Standalone Extraction Protocol v1.0.0</p>
        </div>

        {/* CONTROLS */}
        <div className="border border-green-800 p-6 rounded-lg bg-black/50 space-y-4">
          <h2 className="text-green-600 border-b border-green-800/50 pb-2 mb-4 uppercase tracking-widest text-sm font-bold">Extraction Parameters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase text-green-600 font-bold block">{'>'} AccessToken_</label>
              <input 
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 disabled:opacity-50"
                placeholder="Enter ALOC API Key..."
                disabled={isHarvesting}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs uppercase text-green-600 font-bold block">{'>'} Request_Count (Max 500 advised)_</label>
              <input 
                type="number"
                value={requestCount}
                onChange={e => setRequestCount(parseInt(e.target.value) || 0)}
                className="w-full bg-black border border-green-800 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 disabled:opacity-50"
                min={1}
                disabled={isHarvesting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-green-600 font-bold block">{'>'} Target_Exam_</label>
              <select 
                value={examType}
                onChange={e => setExamType(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 disabled:opacity-50 appearance-none"
                disabled={isHarvesting}
              >
                <option value="jamb">JAMB</option>
                <option value="waec">WAEC</option>
                <option value="neco">NECO</option>
                <option value="post-utme">POST-UTME</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-green-600 font-bold block">{'>'} Data_Subject_</label>
              <select 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 rounded text-green-400 focus:outline-none focus:border-green-500 disabled:opacity-50 appearance-none"
                disabled={isHarvesting}
              >
                {['english', 'mathematics', 'physics', 'chemistry', 'biology', 'government', 'economics', 'commerce', 'crk', 'geography'].map(sub => (
                  <option key={sub} value={sub}>{sub.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 mt-6 pt-4">
            {!isHarvesting ? (
              <button 
                onClick={startHarvest}
                className="flex-1 flex items-center justify-center gap-2 bg-green-900/30 hover:bg-green-800/50 text-green-400 border border-green-500/50 hover:border-green-400 p-3 rounded font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all"
              >
                <Play className="w-5 h-5" />
                START HARVEST
              </button>
            ) : (
              <button 
                onClick={stopHarvest}
                className="flex-1 flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-800/50 text-red-500 border border-red-500/50 hover:border-red-400 p-3 rounded font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all"
              >
                <Square className="w-5 h-5" fill="currentColor" />
                EMERGENCY STOP
              </button>
            )}
          </div>
        </div>

        {/* TERMINAL LOGS */}
        <div className="border border-green-800 rounded-lg bg-black/80 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
          <div className="bg-green-950/40 border-b border-green-800/50 p-2 px-4 flex items-center justify-between">
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">{'>'} Terminal_Output</span>
            <span className="text-xs text-green-700 animate-pulse">{isHarvesting ? 'PROCCESSING...' : 'IDLE'}</span>
          </div>
          <div 
            ref={terminalRef}
            className="p-4 h-64 overflow-y-auto space-y-1 text-sm scroll-smooth custom-scrollbar-green"
          >
            {logs.length === 0 && <span className="text-green-800">Awaiting input...</span>}
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`
                  ${log.type === 'error' ? 'text-red-500' : ''}
                  ${log.type === 'success' ? 'text-green-400' : ''}
                  ${log.type === 'info' ? 'text-green-600' : ''}
                `}
              >
                {log.text}
              </div>
            ))}
            {isHarvesting && (
               <div className="text-green-600 flex gap-1 mt-2">
                 <span className="animate-pulse">_</span>
               </div>
            )}
          </div>
        </div>

        {/* EXPORT ACTION */}
        {(!isHarvesting && harvestedQuestions.length > 0) && (
          <div className="flex gap-4">
            <button 
                onClick={saveToDatabase}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-lg font-black uppercase tracking-widest shadow-[0_0_20px_rgba(5,150,105,0.4)] transition-all disabled:opacity-50"
            >
                <Database className="w-6 h-6" />
                {isSaving ? 'SAVING...' : `SAVE TO DATABASE (${harvestedQuestions.length} ITEMS)`}
            </button>
            <button 
                onClick={downloadJson}
                className="flex-[0.5] flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-black p-4 rounded-lg font-black uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all"
            >
                <Download className="w-6 h-6" />
                JSON
            </button>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-green::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-green::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar-green::-webkit-scrollbar-thumb {
          background: #166534; /* green-800 */
          border-radius: 4px;
        }
        .custom-scrollbar-green::-webkit-scrollbar-thumb:hover {
          background: #15803d; /* green-700 */
        }
      `}} />
    </div>
  );
}
