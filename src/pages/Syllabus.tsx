import React, { useState, useMemo } from 'react';
import { BookOpen, Target, ChevronRight } from 'lucide-react';
import { syllabusData } from '../data/syllabus';

export default function Syllabus() {
  // Group subjects by exam type
  const groupedData = useMemo(() => {
    const groups: Record<string, string[]> = {};
    Object.keys(syllabusData).forEach(key => {
      const type = syllabusData[key][0].examType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(key);
    });
    return groups;
  }, []);

  const examTypes = Object.keys(groupedData).sort();
  const [selectedType, setSelectedType] = useState(examTypes[0] || 'WAEC');
  
  const subjectsForType = groupedData[selectedType] || [];
  const [selectedSubject, setSelectedSubject] = useState(subjectsForType[0] || '');

  // Reset selected subject when type changes
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const newSubjects = groupedData[type] || [];
    setSelectedSubject(newSubjects[0] || '');
  };

  const syllabus = selectedSubject ? syllabusData[selectedSubject] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <header className="flex flex-col gap-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Syllabus Explorer</h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-1">Official Exam Curriculum</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Exam Type</label>
                <select 
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer min-w-[140px]"
                >
                    {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Subject</label>
                <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-tight focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer min-w-[200px]"
                >
                    {subjectsForType.map(sub => (
                      <option key={sub} value={sub}>
                        {sub.replace(`${selectedType} `, '')}
                      </option>
                    ))}
                </select>
              </div>
            </div>
         </div>
         
         {syllabus.length > 0 && (
           <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between shadow-2xl">
               <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                     {selectedSubject.replace(`${selectedType} `, '')}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded uppercase border border-emerald-500/20">
                      {selectedType}
                    </span>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                      {syllabus.length} Core Modules
                    </span>
                  </div>
               </div>
               <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/5">
                 <BookOpen className="w-7 h-7 text-emerald-500" />
               </div>
           </div>
         )}
      </header>

      <div className="grid gap-6">
        {syllabus.map((item) => (
          <div key={item.sn} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-20 h-20 text-white" />
            </div>
            
            <div className="flex items-start gap-6 relative z-10">
              <span className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xl border border-emerald-500/20 shrink-0">
                {item.sn}
              </span>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">{item.topic}</h3>
                <div className="h-px w-12 bg-white/10"></div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {item.objectives.map((obj, i) => (
                    <li key={i} className="text-zinc-400 text-sm flex gap-3 items-start leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-2 shrink-0"></div>
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {syllabus.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl">
            <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No syllabus data found for this selection</p>
          </div>
        )}
      </div>
    </div>
  );
}
