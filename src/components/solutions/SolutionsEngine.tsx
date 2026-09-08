import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

import TextbookSearch from './TextbookSearch';
import TextbookDirectory from './TextbookDirectory';
import SolutionDetail from './SolutionDetail';

interface SolutionsEngineProps {
  initialSolutionId?: string | null;
}

export default function SolutionsEngine({ initialSolutionId }: SolutionsEngineProps) {
  // --- VIEW & NAVIGATION STATE ---
  const [view, setView] = useState<'search' | 'directory' | 'solution'>('search');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);

  // If a solution ID is passed on initial mount, automatically open that solution
  useEffect(() => {
    if (initialSolutionId) {
      setSelectedSolutionId(initialSolutionId);
      setView('solution');
    }
  }, [initialSolutionId]);

  // --- NAVIGATION HANDLERS ---
  const handleSelectSolution = (id: string) => {
    setSelectedSolutionId(id);
    setView('solution');
  };

  const handleSelectTextbook = (id: string) => {
    setSelectedTextbookId(id);
    setView('directory');
  };

  const handleChallenge = (topic: string) => {
    // Notify the application to switch to the Arena tab with this topic selected
    window.dispatchEvent(new CustomEvent('navigate-to-arena', { detail: { topic } }));
    toast.success("Challenge Created!", {
      description: `Preparing a live battle for: ${topic}`
    });
  };

  return (
    <div className="space-y-12 font-sans">
      
      {/* VIEW 1: SEARCH & DIRECTORY HUB */}
      {view === 'search' && (
        <div className="space-y-16 animate-in fade-in duration-300">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Textbook Solutions <span className="text-blue-600">Engine</span>
            </h1>
            <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
              Find step-by-step solutions to questions in your curriculum. Master the concepts, then test your skills in the Arena.
            </p>
          </div>
          
          {/* Real-time search bar */}
          <TextbookSearch 
            onSelectSolution={handleSelectSolution} 
            onSelectTextbook={handleSelectTextbook} 
          />
          
          {/* Curated textbook list */}
          <div className="pt-12 border-t border-slate-200">
            <TextbookDirectory onSelectTextbook={handleSelectTextbook} />
          </div>
        </div>
      )}

      {/* VIEW 2: STEP-BY-STEP SOLUTION BREAKDOWN */}
      {view === 'solution' && selectedSolutionId && (
        <SolutionDetail 
          solutionId={selectedSolutionId} 
          onBack={() => setView('search')}
          onChallenge={handleChallenge}
        />
      )}

      {/* VIEW 3: TEXTBOOK CHAPTER BROWSER */}
      {view === 'directory' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
          <Button 
            variant="ghost" 
            onClick={() => setView('search')}
            className="gap-2 text-slate-500 hover:text-slate-900 font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Search Hub
          </Button>

          <Card className="border-slate-100 shadow-xl rounded-3xl p-8 text-center space-y-6 bg-white">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Textbook Chapter Index</h2>
              <p className="text-slate-500 text-sm">
                Browsing curriculum exercises for textbook reference #{selectedTextbookId || 'All'}.
              </p>
            </div>

            <Button 
              onClick={() => setView('search')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-5"
            >
              Return to Search
            </Button>
          </Card>
        </div>
      )}

    </div>
  );
}
