import React, { useState, useEffect } from 'react';
import { ChevronLeft, Lightbulb, Swords, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useThemeStore } from '@/src/store/useThemeStore';

interface SolutionDetailProps {
  solutionId: string;
  onBack: () => void;
  onChallenge: (topic: string) => void;
}

export default function SolutionDetail({ solutionId, onBack, onChallenge }: SolutionDetailProps) {
  const [solution, setSolution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setMode } = useThemeStore();

  useEffect(() => {
    fetch(`/api/solutions/${solutionId}`)
      .then(res => res.json())
      .then(data => {
        setSolution(data);
        setLoading(false);
      });
  }, [solutionId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Loading solution...</div>;
  }

  if (!solution || solution.error) {
    return <div className="p-12 text-center text-red-500 font-bold">Solution not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
      >
        <ChevronLeft className="w-5 h-5" /> Back to Search
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-widest">
          <span>{solution.textbook_title}</span>
          <ChevronLeft className="w-3 h-3 rotate-180" />
          <span>{solution.chapter_title}</span>
          <ChevronLeft className="w-3 h-3 rotate-180" />
          <span>{solution.exercise_title}</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900">Question {solution.question_number}</h1>
      </div>

      <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-0">
          {/* Question Section */}
          <div className="p-8 bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">The Question</h3>
            <div className="text-xl font-medium text-slate-900 prose prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {solution.question_text}
              </ReactMarkdown>
            </div>
          </div>

          {/* Working Section */}
          <div className="p-8 space-y-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step-by-Step Solution</h3>
            
            <div className="space-y-6">
              {solution.steps.map((step: string, index: number) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-1 text-lg text-slate-700 prose prose-slate max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {step}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Answer Indicator */}
            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <span className="font-bold">Solution Complete</span>
            </div>
          </div>

          {/* Pro Tip Section */}
          {solution.pro_tip && (
            <div className="m-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
              <div className="p-3 bg-amber-100 rounded-xl h-fit">
                <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-black text-amber-900 mb-1">Pro-Tip: {solution.topic}</h4>
                <p className="text-amber-700 font-medium">{solution.pro_tip}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Hook - Conversion to Battle */}
      <Card className="border-4 border-blue-600 shadow-2xl rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-black italic tracking-tight">Got it? Now prove it.</h2>
            <p className="text-blue-100 font-medium text-lg max-w-xl">
              You just earned <span className="text-yellow-400 font-black">5 Edu-Coins</span> for learning this. 
              Double it by winning a 60-second battle on <span className="font-bold text-white">{solution.topic}</span> right now!
            </p>
          </div>
          <Button 
            onClick={() => {
              setMode('arena');
              onChallenge(solution.topic);
            }}
            className="bg-white text-blue-600 hover:bg-blue-50 font-black text-lg py-8 px-8 rounded-2xl shadow-xl hover:scale-105 transition-transform gap-3"
          >
            <Swords className="w-6 h-6" /> ENTER ARENA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
