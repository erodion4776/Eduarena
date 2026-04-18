import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, Database, FileJson, CheckCircle2, AlertCircle, 
  Cpu, Activity, Save, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function AdminLoader() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [importType, setImportType] = useState<'bulk' | 'ocr'>('bulk');
  const [jsonInput, setJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ added: number, skipped: number } | null>(null);

  useEffect(() => {
    fetch('/api/content?type=subjects')
      .then(res => res.json())
      .then(data => setSubjects(data));
  }, []);

  const handleBulkImport = async () => {
    try {
      setIsImporting(true);
      const data = JSON.parse(jsonInput);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'questions', data })
      });
      const result = await res.json();
      setImportStatus(result);
      setJsonInput('');
    } catch (e) {
      alert("Invalid JSON format");
    } finally {
      setIsImporting(false);
    }
  };

  const simulateOCRInjest = async () => {
    setIsImporting(true);
    const mockPayload = {
      structured_payload: {
        exam_body: "JAMB",
        year: 2025,
        subject_id: subjects[0]?.id,
        topic_id: topics[0]?.id,
        question_content: "In a Boss Battle, what happens when the timer reaches zero?",
        options: { A: "Points are doubled", B: "The AI wins instantly", C: "Life is lost", D: "The match is a draw" },
        correct_option: "B",
        explanation: "Boss battles require speed. Zero time means AI domination.",
        difficulty_score: 9
      }
    };

    const res = await fetch('/api/admin/ocr-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    });
    const result = await res.json();
    if (result.success) {
      setImportStatus({ added: 1, skipped: 0 });
    }
    setIsImporting(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/10 rounded-2xl">
            <Database className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
              Nexus <span className="text-red-600">Loader</span>
            </h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Import & Data Pipeline</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-slate-100 shadow-xl rounded-[32px] overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-black uppercase italic tracking-tight">Pipeline Control</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Import Strategy</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={importType === 'bulk' ? 'default' : 'outline'}
                  className={`h-24 flex-col gap-2 rounded-2xl ${importType === 'bulk' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setImportType('bulk')}
                >
                  <FileJson className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase italic">Bulk JSON</span>
                </Button>
                <Button 
                  variant={importType === 'ocr' ? 'default' : 'outline'}
                  className={`h-24 flex-col gap-2 rounded-2xl ${importType === 'ocr' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  onClick={() => setImportType('ocr')}
                >
                  <Cpu className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase italic">AI Vision</span>
                </Button>
              </div>

              <div className="pt-4 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Database</span>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-[10px]">PROD-LIVE</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-700">Storage API Response: 14ms</span>
                  </div>
                </div>

                {importStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border ${importStatus.added > 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${importStatus.added > 0 ? 'text-green-600' : 'text-amber-600'}`} />
                      <span className="text-xs font-bold text-slate-700">Import Sequence Complete</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="bg-white/50 p-2 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Success</p>
                        <p className="text-lg font-black text-green-600 leading-none">{importStatus.added}</p>
                      </div>
                      <div className="bg-white/50 p-2 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Skipped</p>
                        <p className="text-lg font-black text-amber-600 leading-none">{importStatus.skipped}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-2">
          {importType === 'bulk' ? (
            <Card className="border-2 border-slate-100 shadow-xl rounded-[40px] overflow-hidden flex flex-col h-full">
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Structured Ingest</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">JSON Array Inport</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                    onClick={() => setJsonInput('')}
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="default"
                    className="bg-red-600 hover:bg-red-700 rounded-xl px-8"
                    onClick={handleBulkImport}
                    disabled={isImporting || !jsonInput}
                  >
                    {isImporting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Execute Load
                  </Button>
                </div>
              </div>
              <CardContent className="p-0 flex-1">
                <textarea 
                  className="w-full h-[500px] p-8 bg-slate-950 text-emerald-400 font-mono text-sm resize-none focus:outline-none"
                  placeholder='[{"exam_body": "JAMB", "year": 2025, ...}]'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-2 border-slate-100 shadow-xl rounded-[40px] overflow-hidden bg-white">
                <CardContent className="p-12 text-center space-y-8">
                  <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-indigo-600 rounded-full blur-2xl opacity-20 animate-pulse" />
                    <div className="relative flex items-center justify-center w-full h-full bg-indigo-600 rounded-[32px] shadow-2xl">
                      <Cpu className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">AI Vision Ingest</h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                      "Drop high-resolution past question PDFs here. Professor Oracle will analyze, structure, and tag each question with 99.8% accuracy."
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-[32px] w-full max-w-sm hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group">
                      <Layers className="w-10 h-10 text-slate-300 mx-auto group-hover:text-indigo-500 transition-colors" />
                      <p className="text-xs font-black uppercase text-slate-400 mt-4 tracking-widest group-hover:text-indigo-600 transition-colors">Select PDF / TIFF / JPG</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl px-12 py-8 h-auto flex-col gap-1 shadow-2xl shadow-indigo-200"
                      onClick={simulateOCRInjest}
                    >
                      <Sparkles className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">Simulate 2025 AI Loader</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Data Validation Real-time Feed */}
              <Card className="border border-slate-100 rounded-[32px] bg-slate-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Live Validation Stream</h3>
                    <Badge variant="outline" className="text-[8px] font-black uppercase px-2 border-slate-200">Processing</Badge>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-green-500' : 'bg-indigo-400 animate-pulse'}`} />
                          <span className="text-[10px] font-bold text-slate-600">SEQ_7732_{i}: Subject[MATH] Topic[CALC]</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">MD5_HASH_MATCH: FALSE [READY]</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
