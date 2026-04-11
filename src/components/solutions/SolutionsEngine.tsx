import React, { useState, useEffect } from 'react';
import TextbookSearch from './TextbookSearch';
import TextbookDirectory from './TextbookDirectory';
import SolutionDetail from './SolutionDetail';
import { useThemeStore } from '@/src/store/useThemeStore';

interface SolutionsEngineProps {
  initialSolutionId?: string | null;
}

export default function SolutionsEngine({ initialSolutionId }: SolutionsEngineProps) {
  const [view, setView] = useState<'search' | 'directory' | 'solution'>('search');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const { setMode } = useThemeStore();

  useEffect(() => {
    if (initialSolutionId) {
      setSelectedSolutionId(initialSolutionId);
      setView('solution');
    }
  }, [initialSolutionId]);

  const handleSelectSolution = (id: string) => {
    setSelectedSolutionId(id);
    setView('solution');
  };

  const handleSelectTextbook = (id: string) => {
    setSelectedTextbookId(id);
    setView('directory'); // Or a specific textbook view if we build one
  };

  const handleChallenge = (topic: string) => {
    // In a real app, this would pass the topic to the Arena Lobby to filter matchmaking
    console.log(`Challenging on topic: ${topic}`);
    // The actual navigation to Arena is handled in SolutionDetail via setMode('arena')
    // But we also need the Dashboard to switch its tab view.
    // For now, we'll dispatch a custom event that Dashboard can listen to.
    window.dispatchEvent(new CustomEvent('navigate-to-arena', { detail: { topic } }));
  };

  return (
    <div className="space-y-12">
      {view === 'search' && (
        <div className="space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              Textbook Solutions <span className="text-blue-600">Engine</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              Find step-by-step solutions to any question in your textbook. Master the concepts, then prove it in the Arena.
            </p>
          </div>
          
          <TextbookSearch 
            onSelectSolution={handleSelectSolution} 
            onSelectTextbook={handleSelectTextbook} 
          />
          
          <div className="pt-12 border-t border-slate-200">
            <TextbookDirectory onSelectTextbook={handleSelectTextbook} />
          </div>
        </div>
      )}

      {view === 'solution' && selectedSolutionId && (
        <SolutionDetail 
          solutionId={selectedSolutionId} 
          onBack={() => setView('search')}
          onChallenge={handleChallenge}
        />
      )}

      {view === 'directory' && selectedTextbookId && (
        <div className="text-center p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Textbook View</h2>
          <p className="text-slate-500 mb-8">Browsing chapters for textbook ID: {selectedTextbookId}</p>
          <button 
            onClick={() => setView('search')}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl"
          >
            Back to Search
          </button>
        </div>
      )}
    </div>
  );
}
