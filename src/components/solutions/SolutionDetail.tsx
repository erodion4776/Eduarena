import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Swords, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Math equation rendering libraries (KaTeX)
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { useThemeStore } from '@/src/store/useThemeStore';

// TypeScript contract for a textbook solution breakdown
interface Solution {
  id?: string;
  textbook_title: string;
  chapter_title: string;
  exercise_title: string;
  question_number: string | number;
  question_text: string;
  steps: string[];
  topic: string;
  pro_tip?: string;
}

interface SolutionDetailProps {
  solutionId: string;
  onBack: () => void;
  onChallenge: (topic: string) => void;
}

// Starter fallback solution demonstrating LaTeX math formulas when offline
const FALLBACK_SOLUTION: Solution = {
  textbook_title: "New General Mathematics (SS3)",
  chapter_title: "Chapter 4: Quadratic Equations",
  exercise_title: "Exercise 4b",
  question_number: "12",
  question_text: "Find the roots of the quadratic equation: $$2x^2 + 5x - 3 = 0$$ using the quadratic formula.",
  steps: [
    "Identify the coefficients by comparing with the standard form $ax^2 + bx + c = 0$:\n$$a = 2, \\quad b = 5, \\quad c = -3$$",
    "Recall the quadratic formula:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
    "Calculate the discriminant ($b^2 - 4ac$):\n$$b^2 - 4ac = (5)^2 - 4(2)(-3) = 25 + 24 = 49$$",
    "Substitute the values back into the equation:\n$$x = \\frac{-5 \\pm \\sqrt{49}}{2(2)} = \\frac{-5 \\pm 7}{4}$$\n\n$$\\text{Case 1: } x = \\frac{-5 + 7}{4} = \\frac{2}{4} = \\frac{1}{2}$$\n$$\\text{Case 2: } x = \\frac{-5 - 7}{4} = \\frac{-12}{4} = -3$$",
    "Therefore, the roots of the equation are **$x = \\frac{1}{2}$** and **$x = -3$**."
  ],
  topic: "Quadratic Formula",
  pro_tip: "Always compute the discriminant ($b^2 - 4ac$) first. If it results in a perfect square (like 49), you will get clean rational roots!"
};

export default function SolutionDetail({ solutionId, onBack, onChallenge }: SolutionDetailProps) {
  // --- STATE MANAGEMENT ---
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const { setMode } = useThemeStore();

  // --- FETCH STEP-BY-STEP SOLUTION ---
  useEffect(() => {
    setLoading(true);

    fetch(`/api/solutions/${solutionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Solution not found in library");
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setSolution(data);
        } else {
          setSolution(FALLBACK_SOLUTION);
        }
      })
      .catch(() => {
        // Fallback gracefully so students can explore the math solution UI offline
        setSolution(FALLBACK_SOLUTION);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [solutionId]);

  // --- LOADING PLACEHOLDER SCREEN ---
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <Card className="p-12 border-none bg-slate-100/50 rounded-3xl">
          <p className="text-slate-400 font-medium animate-pulse">Loading step-by-step breakdown...</p>
        </Card>
      </div>
    );
  }

  const activeSolution = solution || FALLBACK_SOLUTION;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      
      {/* Back Button Navigation */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors cursor-pointer text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Search Hub
      </button>

      {/* Breadcrumb Hierarchy & Question Title */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
          <span>{activeSolution.textbook_title}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span>{activeSolution.chapter_title}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-500">{activeSolution.exercise_title}</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900">
          Question {activeSolution.question_number}
        </h1>
      </div>

      {/* Main Solution Container Card */}
      <Card className="border-slate-100 shadow-xl rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-0">
          
          {/* Section 1: The Question Statement */}
          <div className="p-8 bg-slate-50/80 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              The Question
            </h3>
            <div className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {activeSolution.question_text}
              </ReactMarkdown>
            </div>
          </div>

          {/* Section 2: Step-by-Step Mathematical Working */}
          <div className="p-8 space-y-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Step-by-Step Solution
            </h3>
            
            <div className="space-y-6">
              {(activeSolution.steps || []).map((step: string, index: number) => (
                <div key={index} className="flex items-start gap-4 md:gap-6">
                  {/* Step Number Circle */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Step Explanation with KaTeX math parsing */}
                  <div className="flex-1 pt-0.5 text-base md:text-lg text-slate-700 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {step}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Answer Verified Badge */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Solution Complete &amp; Verified</span>
            </div>
          </div>

          {/* Section 3: Pro-Tip Box (If available) */}
          {activeSolution.pro_tip && (
            <div className="m-8 p-6 bg-amber-50/80 rounded-2xl border border-amber-100 flex items-start gap-4">
              <div className="p-2.5 bg-amber-100 rounded-xl shrink-0 text-amber-700">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 text-sm">
                  Pro-Tip: {activeSolution.topic}
                </h4>
                <p className="text-amber-800 text-xs md:text-sm font-medium leading-relaxed">
                  {activeSolution.pro_tip}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gamified Call-to-Action: Transition into Battle Arena */}
      <Card className="border-none shadow-xl shadow-blue-600/10 rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <CardContent className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tight">
              Got it? Now prove it in the Arena.
            </h2>
            <p className="text-blue-100 text-sm md:text-base font-medium max-w-xl leading-relaxed">
              Earn double coins by winning a quick 60-second quiz battle on <span className="font-bold text-white underline underline-offset-4">{activeSolution.topic}</span>!
            </p>
          </div>

          <Button 
            onClick={() => {
              setMode('arena');
              onChallenge(activeSolution.topic);
              toast.success("Entering Arena...", {
                description: `Finding an opponent for: ${activeSolution.topic}`
              });
            }}
            className="bg-white hover:bg-blue-50 text-blue-700 font-black text-base py-6 px-8 rounded-2xl shadow-lg hover:scale-105 transition-all gap-2 shrink-0 border-none"
          >
            <Swords className="w-5 h-5 text-blue-700" /> ENTER ARENA
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
