import React, { useState, useEffect } from 'react';
import { Search, Book, FileText, ChevronRight, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface TextbookSearchProps {
  onSelectSolution: (id: string) => void;
  onSelectTextbook: (id: string) => void;
}

export default function TextbookSearch({ onSelectSolution, onSelectTextbook }: TextbookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        setIsSearching(true);
        fetch(`/api/textbooks/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            setResults(data);
            setIsSearching(false);
          });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleRequestSolution = () => {
    fetch('/api/solutions/request', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        toast.success("Request Sent!", {
          description: "Our experts will provide the answer within hours. You'll get a push notification.",
        });
        setQuery('');
      });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
        </div>
        <Input
          type="text"
          className="w-full pl-12 pr-4 py-8 text-lg rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
          placeholder="Search for any textbook question (e.g., New General Maths Ex 2a Q5)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.length > 2 && (
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-0 divide-y divide-slate-100">
            {isSearching ? (
              <div className="p-8 text-center text-slate-500 font-medium animate-pulse">
                Searching the library...
              </div>
            ) : results.length > 0 ? (
              results.map((result, idx) => (
                <div 
                  key={idx}
                  className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                  onClick={() => result.type === 'solution' ? onSelectSolution(result.id) : onSelectTextbook(result.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${result.type === 'solution' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {result.type === 'solution' ? <FileText className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{result.title}</h4>
                      <p className="text-sm text-slate-500 font-medium">
                        {result.type === 'solution' ? `${result.topic} • ${result.textbook}` : `${result.subject} • ${result.author}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No solutions found</h3>
                <p className="text-slate-500">We couldn't find a match for "{query}".</p>
                
                <div className="pt-4 border-t border-slate-100 mt-6">
                  <h4 className="font-bold text-slate-900 mb-2">Request a Solution</h4>
                  <p className="text-sm text-slate-500 mb-4">Snap a photo of the question and our experts will solve it for you.</p>
                  <Button onClick={handleRequestSolution} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2">
                    <Upload className="w-4 h-4" /> Upload Question Photo
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
