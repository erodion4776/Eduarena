import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, Database, Trash2, Edit2, 
  Upload, CheckCircle2, Cpu, Activity, 
  Save, RefreshCw, Layers, Sparkles, FileText,
  AlertTriangle, Image, Calculator, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from '@/src/lib/supabase';

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO'] as const;
const YEARS = Array.from({ length: 2026 - 1983 }, (_, i) => 2025 - i);

export default function QuestionFactory() {
  const [activeTab, setActiveTab] = useState('manager');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [libraryQuestions, setLibraryQuestions] = useState<any[]>([]);
  
  // Form State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [examType, setExamType] = useState<typeof EXAM_TYPES[number]>('JAMB');
  const [year, setYear] = useState('2025');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });
  const [correctOption, setCorrectOption] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [difficulty, setDifficulty] = useState('5');

  // Edit / CRUD State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // Loading / Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Subject/Topic Manager State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subRes, qRes, topRes] = await Promise.all([
        fetch('/api/admin/subjects'),
        fetch('/api/admin/questions'),
        fetch('/api/oracle/topics')
      ]);

      if (!subRes.ok) throw new Error(`Subjects fetch failed: ${subRes.status}`);
      if (!qRes.ok) throw new Error(`Questions fetch failed: ${qRes.status}`);
      if (!topRes.ok) throw new Error(`Topics fetch failed: ${topRes.status}`);

      const subData = await subRes.json();
      const qData = await qRes.json();
      const topData = await topRes.json();

      setSubjects(Array.isArray(subData) ? subData : []);
      setLibraryQuestions(Array.isArray(qData.questions) ? qData.questions : []);
      setAllTopics(Array.isArray(topData) ? topData : []);
    } catch (err: any) {
      console.error('[QuestionFactory] fetchData failed:', err);
      showToast(`Data load failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized filter for the Creator unit selection
  const filteredTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return allTopics.filter(t => t.subject_id === selectedSubject);
  }, [allTopics, selectedSubject]);

  // Memoized filter for Search on the Library tab
  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return libraryQuestions;
    const q = searchQuery.toLowerCase();
    return libraryQuestions.filter(item =>
      (item.question_text ?? item.question_content ?? '').toLowerCase().includes(q) ||
      (item.explanation ?? '').toLowerCase().includes(q) ||
      String(item.year ?? '').includes(q)
    );
  }, [libraryQuestions, searchQuery]);

  // Pagination calculations
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLibrary.slice(start, start + PAGE_SIZE);
  }, [filteredLibrary, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLibrary.length / PAGE_SIZE));

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setSelectedTopic(''); // Reset topic when subject changes
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabase) {
      showToast("Supabase configuration missing in env setup.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const path = `diagrams/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('exam-media')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('exam-media')
        .getPublicUrl(path);

      setImageURL(publicUrl);
      showToast("Image uploaded to public S3!", "success");
    } catch (err: any) {
      console.error('[QuestionFactory] Image upload failed:', err);
      showToast(`Image upload failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question permanently from Edvenia?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete operation failed');
      setLibraryQuestions(prev => prev.filter(q => q.id !== id));
      showToast('Question deleted permanently.', 'success');
    } catch (err: any) {
      console.error('[QuestionFactory] delete failed:', err);
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setExamType(q.exam_type || q.exam_body || 'JAMB');
    setYear(String(q.year || '2025'));
    setSelectedSubject(q.subject_id || '');
    setSelectedTopic(q.topic_id || '');
    setQuestionText(q.question_text ?? q.question_content ?? '');
    setOptions(q.options ?? { A: '', B: '', C: '', D: '', E: '' });
    setCorrectOption(q.correct_option ?? 'A');
    setExplanation(q.explanation ?? '');
    setImageURL(q.image_url ?? '');
    setDifficulty(String(q.difficulty_level ?? 5));
    setActiveTab('creator'); // Switch focus to input stream
    showToast(`Loaded question ${q.id.slice(0, 8)} for editing.`, 'success');
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim() || !selectedSubject || !selectedTopic) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setIsSaving(true);
    const payload = {
      exam_type: examType,
      year: Number(year),
      subject_id: selectedSubject,
      topic_id: selectedTopic,
      question_text: questionText,
      options,
      correct_option: correctOption,
      explanation,
      image_url: imageURL,
      difficulty_level: Number(difficulty)
    };

    try {
      const isEdit = !!editingQuestionId;
      const url = isEdit ? `/api/admin/questions/${editingQuestionId}` : '/api/admin/questions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request rejected by system');
      
      // Reset form on success
      setQuestionText('');
      setOptions({ A: '', B: '', C: '', D: '', E: '' });
      setExplanation('');
      setImageURL('');
      setEditingQuestionId(null);
      
      fetchData();
      showToast(isEdit ? "Question Updated in Archive!" : "Question Added to Archive!", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = async () => {
    const cleanName = newSubjectName.trim();
    if (!cleanName) return;
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, category: 'Science' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to establish domain');
      setNewSubjectName('');
      fetchData();
      showToast(`Subject '${cleanName}' active!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddTopic = async () => {
    const cleanName = newTopicName.trim();
    if (!cleanName || !targetSubjectId) return;
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: targetSubjectId, name: cleanName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bind topic unit');
      setNewTopicName('');
      fetchData();
      showToast(`Topic unit mapped successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 font-sans">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 border-2 font-mono text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] rounded-none
              ${toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                : 'bg-red-50 border-red-600 text-red-800'}`}
          >
            {toast.type === 'success' ? '✓ ' : '✗ '}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: Mission Control Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b-2 border-slate-900">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-xl rotate-3">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                Exam <span className="text-red-600">Factory</span> v4.2
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Archival Protocol: 1983-2025 // Ero Osarodion Signature Edition</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Questions</span>
                <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">{libraryQuestions.length.toLocaleString()}</span>
            </div>
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Health</span>
                <span className="text-lg font-black text-emerald-500 font-mono tracking-tighter">100%</span>
            </div>
            <div className="p-2">
                <Activity className="w-6 h-6 text-red-600 animate-pulse" />
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-8">
          <TabsTrigger value="manager" className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-black uppercase tracking-widest gap-2">
            <Layers className="w-4 h-4" /> Context Manager
          </TabsTrigger>
          <TabsTrigger value="creator" className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-black uppercase tracking-widest gap-2">
            <Plus className="w-4 h-4" /> Question Ingest
          </TabsTrigger>
          <TabsTrigger value="library" className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-black uppercase tracking-widest gap-2">
            <LayoutGrid className="w-4 h-4" /> Question Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="m-0 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Subject Creation */}
            <Card className="border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-none">
              <CardHeader className="border-b-2 border-slate-900 bg-slate-50">
                <CardTitle className="text-lg font-black uppercase italic italic-serif">Subject Infrastructure</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initialize new academic domains</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Domain Name</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="e.g. Further Mathematics" 
                        value={newSubjectName} 
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="rounded-none border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-red-600"
                      />
                      <Button onClick={handleAddSubject} className="bg-slate-900 text-white rounded-none border-2 border-slate-900 hover:bg-red-600 hover:border-red-600 px-6">
                        <Plus className="w-4 h-4 mr-2" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest mb-4 block">Active Domains</Label>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map(s => (
                        <Badge key={s.id} variant="outline" className="rounded-none border-2 border-slate-900 py-1 px-3 bg-white font-black text-[10px] uppercase italic">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topic Mapping */}
            <Card className="border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-none">
              <CardHeader className="border-b-2 border-slate-900 bg-slate-50">
                <CardTitle className="text-lg font-black uppercase italic italic-serif">Topic Mapping</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connect micro-labels to active domains</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Target Domain</Label>
                      <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                        <SelectTrigger className="rounded-none border-2 border-slate-900">
                          <SelectValue placeholder="Select Domain" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 border-slate-900">
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Topic Unit</Label>
                      <Input 
                        placeholder="e.g. Integration" 
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="rounded-none border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-red-600"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTopic} className="w-full bg-slate-900 text-white rounded-none border-2 border-slate-900 hover:bg-slate-800 py-6 text-sm font-black uppercase tracking-widest">
                    <Plus className="w-4 h-4 mr-2" /> Finalize Mapping
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="creator" className="m-0 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Side */}
            <Card className="border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-none overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-900">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 italic">
                        <Cpu className="w-4 h-4" /> Archival Input Stream
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[8px] font-bold uppercase text-slate-400">Recording</span>
                    </div>
                </div>
                <CardContent className="p-8 space-y-8">
                    {/* Active Edit Alert Bar */}
                    {editingQuestionId && (
                      <div className="flex items-center justify-between bg-amber-500/15 border-2 border-amber-500 p-4 rounded-none text-slate-900 text-xs">
                        <div className="font-black flex items-center gap-2 uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                          Editing question: {editingQuestionId.slice(0, 8)}...
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingQuestionId(null);
                            setQuestionText('');
                            setOptions({ A: '', B: '', C: '', D: '', E: '' });
                            setExplanation('');
                            setImageURL('');
                          }} 
                          className="text-amber-800 hover:text-red-700 underline font-black uppercase text-[10px] tracking-widest h-auto p-1"
                        >
                          Cancel Edit
                        </Button>
                      </div>
                    )}

                    {/* Meta Selectors */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Body</Label>
                            <Select value={examType} onValueChange={(v: any) => setExamType(v)}>
                                <SelectTrigger className="rounded-none border-2 border-slate-900 h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-slate-900">
                                    {EXAM_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Year</Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="rounded-none border-2 border-slate-900 h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-slate-900 h-64">
                                    {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
                            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                                <SelectTrigger className="rounded-none border-2 border-slate-900 h-10">
                                    <SelectValue placeholder="Pick Subject" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-slate-900">
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic Unit</Label>
                            {/* FIX 8: Uses filteredTopics memo */}
                            <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                                <SelectTrigger className="rounded-none border-2 border-slate-900 h-10">
                                    <SelectValue placeholder="Pick Topic" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-slate-900">
                                    {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Question Text (Supports LaTeX)
                                </Label>
                                <Button 
                                    variant="link" 
                                    onClick={() => setQuestionText("")}
                                    className="h-auto p-0 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest"
                                >
                                    Clear Text
                                </Button>
                            </div>
                            <Textarea 
                                className="min-h-[140px] rounded-none border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-red-600 font-mono text-sm leading-relaxed p-4"
                                placeholder="e.g. Calculate the value of $x$ in $2x + 5 = 15$... "
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-none bg-slate-50 group hover:border-slate-900 transition-colors">
                            <div className="p-3 bg-white border-2 border-slate-900 rounded-xl">
                                <Image className="w-6 h-6 text-slate-900" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Diagram Ingest (Supabase Integration)</p>
                                <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5">Bucket: exam-media // Protocol: Public S3</p>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()} 
                              disabled={isLoading} 
                              className="rounded-none bg-white border-2 border-slate-900 hover:bg-slate-900 hover:text-white px-4 h-10 font-bold uppercase text-[10px] tracking-widest"
                            >
                                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {imageURL ? 'Uploaded ✅' : 'Trigger Upload'}
                            </Button>
                        </div>
                        {imageURL && <p className="text-[9px] font-mono text-emerald-600 break-all">{imageURL}</p>}

                        {/* Options Grid */}
                        <div className="space-y-4 pt-4 border-t-2 border-slate-100">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                <Calculator className="w-3 h-3" /> Options Configurator
                            </Label>
                            <RadioGroup value={correctOption} onValueChange={setCorrectOption} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(['A', 'B', 'C', 'D', 'E'] as const).map(label => (
                                    <div key={label} className="relative group">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 border-2 ${correctOption === label ? 'bg-red-600 border-slate-900 text-white' : 'bg-white border-slate-900 text-slate-900'} font-black text-xs w-10 flex items-center justify-center transition-colors`}>
                                                {label}
                                            </div>
                                            <div className="relative flex-1">
                                                <Input 
                                                    value={options[label]} 
                                                    onChange={(e) => setOptions(prev => ({ ...prev, [label]: e.target.value }))}
                                                    className="rounded-none border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-red-600 pl-4 h-10 text-sm font-medium"
                                                    placeholder={`Option ${label}...`}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <RadioGroupItem value={label} id={label} className="w-4 h-4 border-2 border-slate-900 text-red-600 focus:ring-red-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {/* Solution / Explanation */}
                        <div className="space-y-2 pt-4">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Step-by-Step AI Solutions
                            </Label>
                            <Textarea 
                                className="min-h-[120px] rounded-none border-2 border-slate-900 focus-visible:ring-0 focus-visible:border-red-600 font-sans text-sm leading-relaxed p-4"
                                placeholder="Explain how to arrive at the correct answer... (Supports LaTeX)"
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                            />
                        </div>

                        {/* Difficulty */}
                        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-4 bg-slate-50 border-2 border-slate-900 shadow-inner">
                            <div className="flex-1 w-full space-y-2">
                                <div className="flex justify-between items-end">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Difficulty Matrix</Label>
                                    <span className="text-sm font-black text-red-600 font-mono tracking-tighter">LVL: {difficulty}/10</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    className="w-full accent-red-600 h-1 rounded-full cursor-pointer"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                />
                            </div>
                            <Button 
                                onClick={handleSaveQuestion}
                                disabled={isSaving}
                                className="w-full md:w-auto bg-slate-900 text-white rounded-none border-2 border-slate-900 hover:bg-emerald-600 hover:border-emerald-600 px-12 py-8 h-auto flex flex-col gap-1 transition-all"
                            >
                                {isSaving ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                <span className="text-[10px] font-black uppercase tracking-widest italic">
                                  {isSaving ? 'Processing' : editingQuestionId ? 'Update Question' : 'Commit to Archive'}
                                </span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Side */}
            <div className="space-y-8">
                <Card className="border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] rounded-none bg-white">
                    <CardHeader className="border-b-2 border-slate-900 bg-slate-50 py-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-black uppercase italic italic-serif">Real-time Student Preview</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase px-2 border-slate-900">Mobile Responsive View</Badge>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8 min-h-[500px] flex flex-col">
                        <div className="flex-1 space-y-6">
                            {/* Tags Section */}
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-slate-100 text-slate-900 hover:bg-slate-100 border-none rounded-sm px-2 text-[9px] font-black uppercase tracking-widest">{examType} {year}</Badge>
                                <Badge className="bg-slate-100 text-slate-900 hover:bg-slate-100 border-none rounded-sm px-2 text-[9px] font-black uppercase tracking-widest">
                                    {subjects.find(s => s.id === selectedSubject)?.name || 'Subject'}
                                </Badge>
                                <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-none rounded-sm px-2 text-[9px] font-black uppercase tracking-widest">DIFFICULTY: {difficulty}</Badge>
                            </div>

                            {/* Question Text Preview */}
                            <div className="text-xl font-bold text-slate-900 leading-snug">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {questionText || "Question preview will appear here..."}
                                </ReactMarkdown>
                            </div>

                            {/* Image Preview if available */}
                            {imageURL && (
                              <div className="max-w-md mx-auto border-2 border-slate-900 p-2 bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <img src={imageURL} alt="Diagram Asset" className="max-h-64 mx-auto object-contain" referrerPolicy="no-referrer" />
                              </div>
                            )}

                            {/* Options Preview */}
                            <div className="grid grid-cols-1 gap-3">
                                {(['A', 'B', 'C', 'D', 'E'] as const).map(label => (
                                    <div 
                                        key={label}
                                        className={`flex items-center gap-4 p-4 border-2 transition-all ${correctOption === label ? 'border-slate-900 bg-slate-50/50' : 'border-slate-100 bg-transparent'}`}
                                    >
                                        <div className={`w-8 h-8 flex items-center justify-center font-black ${correctOption === label ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {label}
                                        </div>
                                        <div className="flex-1 text-sm font-bold text-slate-700">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {options[label] || `Option ${label}`}
                                            </ReactMarkdown>
                                        </div>
                                        {correctOption === label && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Explanation Preview */}
                        {explanation && (
                            <div className="mt-8 p-6 bg-slate-900 text-white rounded-none border-t-2 border-red-600 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 text-white/10 group-hover:text-white/20 transition-colors">
                                    <Sparkles className="w-12 h-12" />
                                </div>
                                <div className="relative">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-4 italic">Professor Oracle Solution</h4>
                                    <div className="text-sm font-medium leading-relaxed opacity-90">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {explanation}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="p-6 bg-amber-50 border-2 border-amber-200 border-dashed rounded-none flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-widest">Integrity Protocol</h4>
                        <p className="text-xs font-bold text-amber-700 leading-relaxed mt-1">
                            "Edvenia has a strict 'One Question, One Instance' policy. Duplicate checker is active—ensure every LaTeX formula matches the paper source exactly."
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="m-0">
             <Card className="border-2 border-slate-900 rounded-none overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <CardHeader className="bg-slate-900 border-b-2 border-slate-900 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black italic uppercase text-white tracking-tighter">Archival Repository</CardTitle>
                            {/* FIX 5: Dynamic Counter mapping */}
                            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Browsing {filteredLibrary.length} of {libraryQuestions.length} records
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                {/* FIX 5: searchQuery binding */}
                                <Input 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search formulas, text, topics..." 
                                    className="pl-10 pr-4 py-6 bg-slate-800 border-none text-white placeholder:text-slate-500 rounded-none w-64 text-xs font-bold focus-visible:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-900">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Archival ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Body/Year</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Domain</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Question Abstract</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Sequence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* FIX 6: Maps paginatedQuestions instead of libraryQuestions */}
                            {paginatedQuestions.map((q, idx) => (
                                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-900 tracking-tighter uppercase">{String(q.id).slice(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 uppercase italic leading-none">{q.exam_type || q.exam_body}</span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1">{q.year}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 uppercase italic leading-none">
                                                {subjects.find(s => s.id === q.subject_id)?.name || 'Unknown'}
                                            </span>
                                            {/* FIX 10: Reads matched topic name from allTopics */}
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                {allTopics.find(t => t.id === q.topic_id)?.name || 'No Topic'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-md">
                                            <p className="text-xs font-bold text-slate-600 line-clamp-1 italic-serif">
                                                {q.question_text || q.question_content}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {/* FIX 4: wired edit/delete buttons */}
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                              onClick={() => handleEditQuestion(q)}
                                              variant="outline" 
                                              size="icon" 
                                              className="w-8 h-8 rounded-none border-2 border-slate-900 hover:bg-slate-900 hover:text-white"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button 
                                              onClick={() => handleDeleteQuestion(q.id)}
                                              variant="outline" 
                                              size="icon" 
                                              className="w-8 h-8 rounded-none border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* FIX 6: Wired Pagination UI Controls */}
                <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End of archival sequence // protocol 0.9</p>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Node: AIS-EURO-W3</span>
                         <Button 
                           variant="outline" 
                           disabled={currentPage === 1}
                           onClick={() => setCurrentPage(p => p - 1)}
                           className="h-8 rounded-none border-2 border-slate-900 text-[10px] font-black uppercase px-4 disabled:opacity-30"
                         >
                           Prev
                         </Button>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-2">
                           {currentPage} / {totalPages}
                         </span>
                         <Button 
                           variant="outline" 
                           disabled={currentPage === totalPages}
                           onClick={() => setCurrentPage(p => p + 1)}
                           className="h-8 rounded-none border-2 border-slate-900 text-[10px] font-black uppercase px-4 disabled:opacity-30"
                         >
                           Next
                         </Button>
                    </div>
                </div>
             </Card>
        </TabsContent>
      </Tabs>
      
      {/* Visual Overlay Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] text-slate-900 -z-10" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
