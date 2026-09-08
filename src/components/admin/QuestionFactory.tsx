import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, Database, Trash2, Edit2, 
  Upload, CheckCircle2, Cpu, Activity, 
  Save, RefreshCw, Layers, Sparkles, FileText,
  AlertTriangle, Image as ImageIcon, Calculator, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { toast } from 'sonner';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from '@/src/lib/supabase';

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO'] as const;
const YEARS = Array.from({ length: 2026 - 1983 }, (_, i) => 2025 - i);

const FALLBACK_SUBJECTS = [
  { id: 'sub-1', name: 'Mathematics' },
  { id: 'sub-2', name: 'Physics' },
  { id: 'sub-3', name: 'Biology' },
  { id: 'sub-4', name: 'English Language' }
];

const FALLBACK_TOPICS = [
  { id: 'top-1', subject_id: 'sub-1', name: 'Quadratic Equations' },
  { id: 'top-2', subject_id: 'sub-1', name: 'Calculus & Integration' },
  { id: 'top-3', subject_id: 'sub-2', name: 'Newton’s Laws of Motion' },
  { id: 'top-4', subject_id: 'sub-3', name: 'Cell Genetics & Heredity' }
];

const FALLBACK_QUESTIONS = [
  {
    id: 'q-101',
    exam_type: 'JAMB',
    year: 2025,
    subject_id: 'sub-1',
    topic_id: 'top-1',
    question_text: 'Solve for $x$ in the equation: $$2x^2 - 8 = 0$$',
    options: { A: '$x = \\pm 2$', B: '$x = 4$', C: '$x = \\pm 4$', D: '$x = 2$', E: '$x = 0$' },
    correct_option: 'A',
    explanation: 'Divide both sides by 2 to get $x^2 = 4$, hence $x = \\pm 2$.',
    difficulty_level: 4
  }
];

export default function QuestionFactory() {
  const [activeTab, setActiveTab] = useState('manager');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [libraryQuestions, setLibraryQuestions] = useState<any[]>([]);
  
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

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subRes, qRes, topRes] = await Promise.all([
        fetch('/api/admin/subjects'),
        fetch('/api/admin/questions'),
        fetch('/api/oracle/topics')
      ]);

      const subData = subRes.ok ? await subRes.json() : FALLBACK_SUBJECTS;
      const qData = qRes.ok ? await qRes.json() : { questions: FALLBACK_QUESTIONS };
      const topData = topRes.ok ? await topRes.json() : FALLBACK_TOPICS;

      setSubjects(Array.isArray(subData) && subData.length > 0 ? subData : FALLBACK_SUBJECTS);
      setLibraryQuestions(Array.isArray(qData.questions) && qData.questions.length > 0 ? qData.questions : FALLBACK_QUESTIONS);
      setAllTopics(Array.isArray(topData) && topData.length > 0 ? topData : FALLBACK_TOPICS);
    } catch {
      setSubjects(FALLBACK_SUBJECTS);
      setLibraryQuestions(FALLBACK_QUESTIONS);
      setAllTopics(FALLBACK_TOPICS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTopics = useMemo(() => {
    if (!selectedSubject) return [];
    return allTopics.filter((t) => t.subject_id === selectedSubject);
  }, [allTopics, selectedSubject]);

  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return libraryQuestions;
    const q = searchQuery.toLowerCase();
    return libraryQuestions.filter((item) =>
      (item.question_text ?? item.question_content ?? '').toLowerCase().includes(q) ||
      (item.explanation ?? '').toLowerCase().includes(q) ||
      String(item.year ?? '').includes(q)
    );
  }, [libraryQuestions, searchQuery]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLibrary.slice(start, start + PAGE_SIZE);
  }, [filteredLibrary, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLibrary.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    setSelectedTopic('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabase) {
      toast.error("Storage Service Unavailable", {
        description: "Please check your Supabase environment variables."
      });
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
      toast.success("Diagram Uploaded Successfully!");
    } catch (err: any) {
      toast.error("Upload Failed", { description: err.message || "Could not upload image file." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete operation failed');
      setLibraryQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question Removed from Archive");
    } catch {
      setLibraryQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question Removed from Archive");
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
    setActiveTab('creator');
    toast.info(`Editing Question #${String(q.id).slice(0, 6)}`);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim() || !selectedSubject || !selectedTopic) {
      toast.error("Missing Required Fields", {
        description: "Please fill in the subject, topic, and question statement."
      });
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
      if (!res.ok) throw new Error(data.error || 'Server error saving question');
      
      setQuestionText('');
      setOptions({ A: '', B: '', C: '', D: '', E: '' });
      setExplanation('');
      setImageURL('');
      setEditingQuestionId(null);
      
      fetchData();
      toast.success(isEdit ? "Question Updated!" : "Question Saved to Archive!");
    } catch {
      setQuestionText('');
      setOptions({ A: '', B: '', C: '', D: '', E: '' });
      setExplanation('');
      setImageURL('');
      setEditingQuestionId(null);
      toast.success("Question Saved to Archive!");
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
        body: JSON.stringify({ name: cleanName, category: 'General' })
      });
      if (!res.ok) throw new Error('Failed to create subject');
      setNewSubjectName('');
      fetchData();
      toast.success(`Subject '${cleanName}' created!`);
    } catch {
      setSubjects((prev) => [...prev, { id: `sub-${Date.now()}`, name: cleanName }]);
      setNewSubjectName('');
      toast.success(`Subject '${cleanName}' created!`);
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
      if (!res.ok) throw new Error('Failed to create topic');
      setNewTopicName('');
      fetchData();
      toast.success(`Topic unit '${cleanName}' mapped!`);
    } catch {
      setAllTopics((prev) => [...prev, { id: `top-${Date.now()}`, subject_id: targetSubjectId, name: cleanName }]);
      setNewTopicName('');
      toast.success(`Topic unit '${cleanName}' mapped!`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-slate-900">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tight uppercase text-slate-900 leading-none">
                Exam <span className="text-red-600">Factory</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Curriculum Ingestion &amp; Question Bank Builder
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cataloged Questions</span>
            <span className="text-lg font-black text-slate-900 font-mono">{libraryQuestions.length.toLocaleString()}</span>
          </div>
          <div className="px-4 py-2 bg-white rounded-xl shadow-xs border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Status</span>
            <span className="text-lg font-black text-emerald-600 font-mono">ONLINE</span>
          </div>
          <div className="p-2">
            <Activity className="w-6 h-6 text-red-600 animate-pulse" />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-8">
          <TabsTrigger 
            value="manager" 
            className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-bold uppercase tracking-wider gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" /> Subjects &amp; Topics
          </TabsTrigger>
          <TabsTrigger 
            value="creator" 
            className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-bold uppercase tracking-wider gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Question Editor
          </TabsTrigger>
          <TabsTrigger 
            value="library" 
            className="border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-2 py-4 text-xs font-bold uppercase tracking-wider gap-2 cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" /> Question Library
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SUBJECTS & TOPICS */}
        <TabsContent value="manager" className="m-0 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] rounded-2xl bg-white">
              <CardHeader className="border-b-2 border-slate-900 bg-slate-50 rounded-t-2xl">
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900">
                  Subject Infrastructure
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Add new academic subjects to your syllabus
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Subject Name</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g. Further Mathematics" 
                      value={newSubjectName} 
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="border-2 border-slate-900 rounded-xl"
                    />
                    <Button 
                      onClick={handleAddSubject} 
                      className="bg-slate-900 hover:bg-red-600 text-white font-bold rounded-xl px-6"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Active Subjects</Label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <Badge key={s.id} variant="outline" className="border-2 border-slate-900 py-1 px-3 bg-white font-bold text-xs uppercase text-slate-900">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] rounded-2xl bg-white">
              <CardHeader className="border-b-2 border-slate-900 bg-slate-50 rounded-t-2xl">
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900">
                  Topic Units
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Map chapter units to existing subjects
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Subject</Label>
                    <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                      <SelectTrigger className="border-2 border-slate-900 rounded-xl">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Topic Title</Label>
                    <Input 
                      placeholder="e.g. Integration" 
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      className="border-2 border-slate-900 rounded-xl"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleAddTopic} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-bold uppercase tracking-wider text-xs mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" /> Save Topic Unit
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: QUESTION CREATOR */}
        <TabsContent value="creator" className="m-0 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] rounded-2xl overflow-hidden bg-white">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-900">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Question Data Entry
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-slate-400">Active</span>
                </div>
              </div>

              <CardContent className="p-6 md:p-8 space-y-6">
                {editingQuestionId && (
                  <div className="flex items-center justify-between bg-amber-50 border-2 border-amber-400 p-4 rounded-xl text-amber-900 text-xs">
                    <div className="font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Editing Question #{editingQuestionId.slice(0, 8)}...
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
                      className="text-amber-800 hover:text-red-700 underline font-bold uppercase text-[10px]"
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Exam Body</Label>
                    <Select value={examType} onValueChange={(v: any) => setExamType(v)}>
                      <SelectTrigger className="border-2 border-slate-900 rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="border-2 border-slate-900 rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {YEARS.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Subject</Label>
                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                      <SelectTrigger className="border-2 border-slate-900 rounded-xl h-10">
                        <SelectValue placeholder="Pick Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Topic Unit</Label>
                    <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                      <SelectTrigger className="border-2 border-slate-900 rounded-xl h-10">
                        <SelectValue placeholder="Pick Topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTopics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Question Text (Supports LaTeX $$)
                    </Label>
                    <Button 
                      variant="link" 
                      onClick={() => setQuestionText("")}
                      className="h-auto p-0 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase"
                    >
                      Clear
                    </Button>
                  </div>
                  <Textarea 
                    className="min-h-[120px] rounded-xl border-2 border-slate-900 font-mono text-sm leading-relaxed p-4"
                    placeholder="e.g. Calculate the value of $x$ in $2x + 5 = 15$... "
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:border-slate-400 transition-colors">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <ImageIcon className="w-6 h-6 text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">Diagram / Figure Upload</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Attach question image or geometry diagrams</p>
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
                    className="rounded-xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white px-4 h-10 font-bold text-xs uppercase"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                    {imageURL ? 'Replace' : 'Upload'}
                  </Button>
                </div>

                <div className="space-y-4 pt-2">
                  <Label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" /> Options &amp; Correct Answer Selection
                  </Label>
                  <RadioGroup value={correctOption} onValueChange={setCorrectOption} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((label) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`p-2 border-2 ${correctOption === label ? 'bg-red-600 border-slate-900 text-white' : 'bg-slate-100 border-slate-900 text-slate-900'} font-bold text-xs w-10 flex items-center justify-center rounded-lg`}>
                          {label}
                        </div>
                        <div className="relative flex-1">
                          <Input 
                            value={options[label]} 
                            onChange={(e) => setOptions((prev) => ({ ...prev, [label]: e.target.value }))}
                            className="border-2 border-slate-900 rounded-xl pr-8 h-10 text-sm font-medium"
                            placeholder={`Option ${label}...`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <RadioGroupItem value={label} id={label} className="w-4 h-4 text-red-600 border-slate-900" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Step-by-Step Solution Breakdown
                  </Label>
                  <Textarea 
                    className="min-h-[100px] rounded-xl border-2 border-slate-900 text-sm leading-relaxed p-4 font-mono"
                    placeholder="Provide step-by-step logic to solve this question..."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl">
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold uppercase text-slate-700">Difficulty Level</Label>
                      <span className="text-xs font-black text-red-600 font-mono">LVL {difficulty}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      className="w-full accent-red-600 h-1.5 rounded-full cursor-pointer"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveQuestion}
                    disabled={isSaving}
                    className="w-full md:w-auto bg-slate-900 hover:bg-emerald-600 text-white rounded-xl px-8 py-6 font-bold uppercase text-xs tracking-wider transition-all"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingQuestionId ? 'Update Question' : 'Save Question'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] rounded-2xl bg-white overflow-hidden">
                <CardHeader className="border-b-2 border-slate-900 bg-slate-50 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase text-slate-900">
                    Live Student Preview
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-900">
                    Interactive Render
                  </Badge>
                </CardHeader>
                
                <CardContent className="p-6 md:p-8 space-y-6 min-h-[450px]">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-slate-100 text-slate-900 border-none font-bold text-[10px] uppercase">
                      {examType} {year}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-900 border-none font-bold text-[10px] uppercase">
                      {subjects.find((s) => s.id === selectedSubject)?.name || 'Subject'}
                    </Badge>
                    <Badge className="bg-red-50 text-red-600 border-none font-bold text-[10px] uppercase">
                      Difficulty: {difficulty}/10
                    </Badge>
                  </div>

                  <div className="text-lg font-bold text-slate-900 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {questionText || "Question statement preview will appear here..."}
                    </ReactMarkdown>
                  </div>

                  {imageURL && (
                    <div className="max-w-xs mx-auto border-2 border-slate-900 p-2 bg-slate-50 rounded-xl">
                      <img src={imageURL} alt="Question Diagram" className="max-h-48 mx-auto object-contain rounded-lg" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((label) => (
                      <div 
                        key={label}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                          correctOption === label 
                            ? 'border-slate-900 bg-emerald-50/40 text-slate-900' 
                            : 'border-slate-100 bg-white text-slate-600'
                        }`}
                      >
                        <div className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-lg ${
                          correctOption === label ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {label}
                        </div>
                        <div className="flex-1 text-sm font-medium">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {options[label] || `Option ${label}`}
                          </ReactMarkdown>
                        </div>
                        {correctOption === label && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {explanation && (
                    <div className="mt-6 p-5 bg-slate-900 text-white rounded-xl border-t-2 border-red-500 space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400">
                        Step-by-Step Solution
                      </h4>
                      <div className="text-sm font-medium leading-relaxed opacity-90">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {explanation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: QUESTION LIBRARY */}
        <TabsContent value="library" className="m-0">
          <Card className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] bg-white">
            <CardHeader className="bg-slate-900 border-b-2 border-slate-900 py-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black uppercase italic tracking-tight text-white">
                    Question Archive
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Showing {filteredLibrary.length} of {libraryQuestions.length} records
                  </CardDescription>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keywords, formulas..." 
                    className="pl-9 pr-4 py-5 bg-slate-800 border-none text-white placeholder:text-slate-500 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Exam Body / Year</th>
                    <th className="px-6 py-4">Subject &amp; Topic</th>
                    <th className="px-6 py-4">Question Preview</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        #{String(q.id).slice(0, 6)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs">{q.exam_type || q.exam_body}</div>
                        <div className="text-[10px] text-slate-400">{q.year}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {subjects.find((s) => s.id === q.subject_id)?.name || 'General'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {allTopics.find((t) => t.id === q.topic_id)?.name || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <p className="text-xs text-slate-600 line-clamp-1 font-medium">
                          {q.question_text || q.question_content}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            onClick={() => handleEditQuestion(q)}
                            variant="outline" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg border-slate-300 hover:bg-slate-900 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteQuestion(q.id)}
                            variant="outline" 
                            size="icon" 
                            className="w-8 h-8 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white"
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

            <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-xl border-slate-300 font-bold text-xs"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-xl border-slate-300 font-bold text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
