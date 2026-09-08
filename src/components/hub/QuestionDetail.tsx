import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Bookmark, Share2, MessageSquare, CheckCircle2, Zap, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Standard student-friendly animations
import { toast } from 'sonner';

// Clean TypeScript rule contract for the Question structure
interface Question {
  id?: string;
  exam_type?: string;
  subject?: string;
  difficulty?: string;
  question_text?: string;
  options?: Record<string, string>;
  correct_option?: string;
  correct_answer?: string;
  explanation?: string;
  topic?: string;
}

interface QuestionDetailProps {
  question?: Question;
  onBack: () => void;
}

export default function QuestionDetail({ question, onBack }: QuestionDetailProps) {
  // --- SAFE FALLBACKS ---
  const activeQuestion = question || {
    exam_type: "UTME",
    subject: "Mathematics",
    difficulty: "Medium",
    question_text: "Loading question data...",
    options: { A: "Loading option 1", B: "Loading option 2" },
    correct_option: "A",
    explanation: "Verify your server database connection to load dynamic mock papers.",
    topic: "General Revision"
  };

  // --- STATE MANAGEMENT ---
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // --- INTERACTION HANDLERS ---
  const handleOptionClick = (labelKey: string) => {
    if (showAnswer) return; // Freeze interaction once answered
    setSelectedOption(labelKey);
    setShowAnswer(true);

    const isCorrect = labelKey === (activeQuestion.correct_option || activeQuestion.correct_answer);
    if (isCorrect) {
      toast.success("Excellent Job!", { description: "Your answer selection is absolutely correct." });
    } else {
      toast.error("Not quite right", { description: "Let's read through the explanation below to learn why!" });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.info("Link Copied!", { description: "Share this study card link with your study group!" });
  };

  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked);
    toast(isBookmarked ? "Removed from study list" : "Saved to study list!", {
      icon: <Bookmark className={isBookmarked ? "text-slate-400" : "fill-current text-yellow-500"} />
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in slide-in-from-left duration-300">
      
      {/* HUD Bar controls */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4" /> Back to Hub
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBookmarkToggle}
            className={`rounded-xl border-slate-200 transition-colors ${isBookmarked ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : ''}`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleShare}
            className="rounded-xl border-slate-200 hover:bg-slate-50"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Primary Question Content Card */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
        <CardHeader className="p-8 md:p-10 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-blue-600 hover:bg-blue-600 border-none text-white uppercase tracking-widest font-bold text-[10px]">
              {activeQuestion.exam_type}
            </Badge>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {activeQuestion.subject} • {activeQuestion.difficulty}
            </span>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
            {activeQuestion.question_text}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 md:p-10 space-y-8">
          {/* Options grid selectors */}
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(activeQuestion.options || {}).map(([label, text]: any) => {
              const isCorrect = label === (activeQuestion.correct_option || activeQuestion.correct_answer);
              const isSelected = label === selectedOption;
              
              // Dynamic button styles based on answer selection state
              let conditionalClasses = "border-slate-100 hover:border-blue-600 hover:bg-blue-50/50 text-slate-700";
              
              if (showAnswer) {
                if (isCorrect) {
                  conditionalClasses = "border-green-500 bg-green-50 text-green-700";
                } else if (isSelected) {
                  conditionalClasses = "border-red-500 bg-red-50 text-red-700";
                } else {
                  conditionalClasses = "opacity-50 border-slate-100 text-slate-400";
                }
              }

              return (
                <button 
                  key={label} 
                  className={`w-full p-6 text-base md:text-lg font-bold rounded-2xl border-2 transition-all text-left flex items-center justify-between outline-none ${conditionalClasses}`}
                  onClick={() => handleOptionClick(label)}
                  disabled={showAnswer}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center font-black rounded-lg text-sm ${
                      showAnswer && isCorrect 
                        ? 'bg-green-600 text-white animate-pulse' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {label}
                    </div>
                    <span>{text}</span>
                  </div>
                  {showAnswer && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Animated step-by-step review guide panel */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="p-6 md:p-8 rounded-3xl bg-blue-50/60 border-2 border-blue-100 space-y-6"
              >
                <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-xs">
                  <Zap className="w-5 h-5 fill-current" /> Tutor Explanations
                </div>
                <p className="text-slate-700 text-base md:text-lg leading-relaxed font-medium">
                  {activeQuestion.explanation}
                </p>
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl flex-1 border-none transition-all"
                    onClick={() => {
                      toast.success("Creating study set", { description: "We are fetching diagnostic exercises now..." });
                    }}
                  >
                    Try Similar Questions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-blue-200 hover:bg-blue-100/50 text-blue-600 font-bold h-14 rounded-2xl flex-1 transition-all"
                    onClick={() => {
                      toast.success("Tutor Dispatched!", { description: "AI Tutor has loaded context parameters." });
                    }}
                  >
                    Ask AI Tutor
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Community & Syllabus Information footer board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-100 bg-white shadow-sm p-6 space-y-4 rounded-3xl">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <HelpCircle className="w-5 h-5 text-blue-600" /> Related Concepts
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors border-none"
            >
              {activeQuestion.topic || "Calculus Principles"}
            </Badge>
            <Badge 
              variant="secondary" 
              className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors border-none"
            >
              Exponents &amp; Roots
            </Badge>
            <Badge 
              variant="secondary" 
              className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors border-none"
            >
              Linear Systems
            </Badge>
          </div>
        </Card>
        
        <Card className="border-slate-100 bg-white shadow-sm p-6 space-y-4 rounded-3xl">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Study Community Space
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            12 other students saved this card. Join active debates on concepts to clarify doubts.
          </p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-blue-600 font-bold hover:no-underline hover:text-blue-700 transition-colors"
            onClick={() => {
              toast.info("Forum is updating", { description: "Discussion boards are currently routing online sessions." });
            }}
          >
            Open Discussion Forums
          </Button>
        </Card>
      </div>
    </div>
  );
}
