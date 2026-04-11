import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Bookmark, Share2, MessageSquare, CheckCircle2, Zap, HelpCircle } from 'lucide-react';

export default function QuestionDetail({ question, onBack }: any) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionClick = (option: string) => {
    if (showAnswer) return;
    setSelectedOption(option);
    setShowAnswer(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in slide-in-from-left duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-500 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4" /> Back to Hub
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200"><Bookmark className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl border-slate-200"><Share2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden">
        <CardHeader className="p-10 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-blue-600 uppercase tracking-widest">{question.exam_type}</Badge>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{question.subject} • {question.difficulty}</span>
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900 leading-tight">
            {question.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10 space-y-8">
          <div className="grid grid-cols-1 gap-4">
            {question.options.map((option: string) => {
              const isCorrect = option === question.correct_answer;
              const isSelected = option === selectedOption;
              
              let className = "w-full p-6 text-lg font-bold rounded-2xl border-2 transition-all text-left flex items-center justify-between ";
              
              if (showAnswer) {
                if (isCorrect) className += "border-green-500 bg-green-50 text-green-700 ";
                else if (isSelected) className += "border-red-500 bg-red-50 text-red-700 ";
                else className += "opacity-50 border-slate-100 ";
              } else {
                className += "border-slate-100 hover:border-blue-600 hover:bg-blue-50/50 text-slate-700 ";
              }

              return (
                <button 
                  key={option} 
                  className={className}
                  onClick={() => handleOptionClick(option)}
                  disabled={showAnswer}
                >
                  <span>{option}</span>
                  {showAnswer && isCorrect && <CheckCircle2 className="w-6 h-6" />}
                </button>
              );
            })}
          </div>

          {showAnswer && (
            <div className="p-8 rounded-3xl bg-blue-50 border-2 border-blue-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-sm">
                <Zap className="w-5 h-5" /> Step-by-Step Explanation
              </div>
              <p className="text-slate-700 text-lg leading-relaxed font-medium">
                {question.explanation}
              </p>
              <div className="pt-4 flex gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 rounded-2xl flex-1">
                  Try Similar Questions
                </Button>
                <Button variant="outline" className="border-blue-200 text-blue-600 font-bold px-8 py-6 rounded-2xl flex-1">
                  Ask AI Tutor
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" /> Related Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors">Quadratic Equations</Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors">Calculus Basics</Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors">Indices</Badge>
          </div>
        </Card>
        <Card className="border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Community Discussion
          </h3>
          <p className="text-sm text-slate-500">12 students have discussed this question. Join the conversation to learn more.</p>
          <Button variant="link" className="p-0 h-auto text-blue-600 font-bold">View Discussion</Button>
        </Card>
      </div>
    </div>
  );
}
