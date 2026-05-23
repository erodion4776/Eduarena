import React, { useState } from 'react';
import { BookOpen, Target, ChevronRight } from 'lucide-react';
import { syllabusData } from '../data/syllabus';

export default function Syllabus() {
  const subjects = Object.keys(syllabusData);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const syllabus = syllabusData[selectedSubject];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <header className="flex flex-col gap-6">
         <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Syllabus Explorer</h1>
            <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white px-4 py-2 rounded-xl font-black uppercase tracking-tight focus:outline-none"
            >
                {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
         </div>
         
         <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
             <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                   {selectedSubject} Syllabus
                </h2>
                <p className="text-zinc-500 font-medium">Exam Type: <span className="text-emerald-500 font-bold">{syllabus[0].examType}</span></p>
             </div>
             <BookOpen className="w-8 h-8 text-cyan-500" />
         </div>
      </header>

      <div className="grid gap-6">
        {syllabus.map((item) => (
          <div key={item.sn} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-start gap-6">
              <span className="w-12 h-12 flex items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-black text-xl border border-cyan-500/20 shrink-0">
                {item.sn}
              </span>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{item.topic}</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {item.objectives.map((obj, i) => (
                    <li key={i} className="text-zinc-400 text-sm flex gap-2 items-start">
                      <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
