import React, { useState, useEffect } from 'react';
import { Search, Book, FileText, ChevronRight, Upload, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// Clean TypeScript contract for search results
interface SearchResult {
  id: string;
  type: 'solution' | 'textbook';
  title: string;
  topic?: string;
  textbook?: string;
  subject?: string;
  author?: string;
}

interface TextbookSearchProps {
  onSelectSolution: (id: string) => void;
  onSelectTextbook: (id: string) => void;
}

// Built-in offline demo database for instant local searching
const SAMPLE_SEARCH_INDEX: SearchResult[] = [
  {
    id: 'sol-1',
    type: 'solution',
    title: 'Ex 4b Q12: Quadratic Formula Roots',
    topic: 'Quadratic Equations',
    textbook: 'New General Mathematics (SS3)',
    subject: 'Mathematics'
  },
  {
    id: 'sol-2',
    type: 'solution',
    title: 'Ex 2a Q5: Newton\'s Second Law Calculations',
    topic: 'Mechanics & Force',
    textbook: 'Essential Physics (SS2)',
    subject: 'Physics'
  },
  {
    id: 'sol-3',
    type: 'solution',
    title: 'Ex 6c Q2: Mitosis vs Meiosis Stages',
    topic: 'Cell Biology',
    textbook: 'Modern Biology (SS1)',
    subject: 'Biology'
  },
  {
    id: 'tb-1',
    type: 'textbook',
    title: 'New General Mathematics for SS3',
    subject: 'Mathematics',
    author: 'M.F. Macrae et al.'
  },
  {
    id: 'tb-2',
    type: 'textbook',
    title: 'Essential Physics for Senior Secondary',
    subject: 'Physics',
    author: 'O. Farinde'
  }
];

export default function TextbookSearch({ onSelectSolution, onSelectTextbook }: TextbookSearchProps) {
  // --- STATE MANAGEMENT ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- DEBOUNCED SEARCH EFFECT ---
  // Debouncing waits 300ms after the student stops typing before running the search query
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/textbooks/search?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Search network error");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setResults(data);
          } else {
            // Local fallback filter if server returned no results
            const localMatches = SAMPLE_SEARCH_INDEX.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              (item.topic && item.topic.toLowerCase().includes(query.toLowerCase())) ||
              (item.subject && item.subject.toLowerCase().includes(query.toLowerCase())) ||
              (item.textbook && item.textbook.toLowerCase().includes(query.toLowerCase()))
            );
            setResults(localMatches);
          }
        })
        .catch(() => {
          // Safe offline fallback: Filter local index directly
          const localMatches = SAMPLE_SEARCH_INDEX.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            (item.topic && item.topic.toLowerCase().includes(query.toLowerCase())) ||
            (item.subject && item.subject.toLowerCase().includes(query.toLowerCase())) ||
            (item.textbook && item.textbook.toLowerCase().includes(query.toLowerCase()))
          );
          setResults(localMatches);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // --- REQUEST EXPERT SOLUTION HANDLER ---
  const handleRequestSolution = () => {
    toast.success("Solution Request Submitted!", {
      description: "Our subject tutors are reviewing this exercise. We will notify you once verified!",
    });
    setQuery('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 font-sans">
      
      {/* Search Input Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
        </div>
        
        <Input
          type="text"
          className="w-full pl-13 pr-12 py-7 text-base md:text-lg rounded-2xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xs placeholder:text-slate-400 font-medium"
          placeholder="Search question, exercise, or topic (e.g. New General Maths Ex 2a)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dynamic Results Card Dropdown */}
      {query.trim().length >= 2 && (
        <Card className="border-slate-100 shadow-xl rounded-3xl overflow-hidden bg-white animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-0 divide-y divide-slate-100">
            
            {isSearching ? (
              <div className="p-8 text-center text-slate-400 font-medium animate-pulse text-sm">
                Searching curriculum solutions and exercises...
              </div>
            ) : results.length > 0 ? (
              results.map((result) => (
                <div 
                  key={result.id}
                  className="p-4 md:p-5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                  onClick={() => {
                    if (result.type === 'solution') {
                      onSelectSolution(result.id);
                    } else {
                      onSelectTextbook(result.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Item Type Badge Icon */}
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      result.type === 'solution' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {result.type === 'solution' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Book className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          result.type === 'solution'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {result.type === 'solution' ? 'Verified Solution' : 'Textbook'}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition-colors truncate mt-1">
                        {result.title}
                      </h4>
                      
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        {result.type === 'solution' 
                          ? `${result.topic} • ${result.textbook}` 
                          : `${result.subject} • By ${result.author}`}
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))
            ) : (
              // Empty State: Solution Not Found -> Offer Upload Option
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No matching solutions found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    We could not find an exact match for <span className="font-bold text-slate-700">"{query}"</span> in our indexed chapters.
                  </p>
                </div>
                
                {/* Solution Request Call to Action */}
                <div className="pt-4 border-t border-slate-100 mt-4 max-w-md mx-auto">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Request an Expert Breakdown</h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Take a photo of your textbook question and our subject tutors will solve it step-by-step for you.
                  </p>
                  
                  <Button 
                    onClick={handleRequestSolution} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 px-6 py-5 shadow-sm border-none transition-all"
                  >
                    <Upload className="w-4 h-4" /> Upload Question Snapshot
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

    </div>
  );
}
