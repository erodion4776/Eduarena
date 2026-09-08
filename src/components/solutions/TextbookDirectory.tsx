import React, { useState, useEffect } from 'react';
import { Book, BookmarkCheck, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// TypeScript contract for a textbook item
interface Textbook {
  id: string;
  title: string;
  subject: string;
  category: string;
  author: string;
  edition?: string;
}

interface TextbookDirectoryProps {
  onSelectTextbook: (id: string) => void;
}

// Starter fallback textbooks shown if the database is offline
const FALLBACK_TEXTBOOKS: Textbook[] = [
  {
    id: 'tb-1',
    title: 'New General Mathematics for Senior Secondary Schools 3',
    subject: 'Mathematics',
    category: 'Sciences',
    author: 'M.F. Macrae et al.',
    edition: '4th Edition'
  },
  {
    id: 'tb-2',
    title: 'Essential Physics for Senior Secondary Schools',
    subject: 'Physics',
    category: 'Sciences',
    author: 'O. Farinde',
    edition: 'Revised Edition'
  },
  {
    id: 'tb-3',
    title: 'Modern Biology for Senior Secondary Schools',
    subject: 'Biology',
    category: 'Sciences',
    author: 'S.T. Ramalingam',
    edition: '6th Edition'
  },
  {
    id: 'tb-4',
    title: 'Comprehensive Economics for Senior Secondary',
    subject: 'Economics',
    category: 'Commercials',
    author: 'J.U. Anyaele',
    edition: '3rd Edition'
  },
  {
    id: 'tb-5',
    title: 'Government for Senior Secondary Schools',
    subject: 'Government',
    category: 'Arts & Humanities',
    author: 'B.O. Oyediran',
    edition: '2nd Edition'
  },
  {
    id: 'tb-6',
    title: 'Explicit Chemistry for UTME & SSCE',
    subject: 'Chemistry',
    category: 'Sciences',
    author: 'A. Olumide',
    edition: '5th Edition'
  }
];

export default function TextbookDirectory({ onSelectTextbook }: TextbookDirectoryProps) {
  // --- STATE MANAGEMENT ---
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH TEXTBOOK REPOSITORY ---
  useEffect(() => {
    fetch('/api/textbooks')
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch textbooks');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTextbooks(data);
          const uniqueCategories = Array.from(new Set(data.map((t: Textbook) => t.category))).filter(Boolean);
          setCategories(uniqueCategories);
        } else {
          // Fallback to sample textbooks
          setTextbooks(FALLBACK_TEXTBOOKS);
          const uniqueCategories = Array.from(new Set(FALLBACK_TEXTBOOKS.map((t) => t.category)));
          setCategories(uniqueCategories);
        }
      })
      .catch(() => {
        // Safe offline mode fallback
        setTextbooks(FALLBACK_TEXTBOOKS);
        const uniqueCategories = Array.from(new Set(FALLBACK_TEXTBOOKS.map((t) => t.category)));
        setCategories(uniqueCategories);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Filter textbooks by category if one is selected
  const filteredTextbooks = selectedCategory 
    ? textbooks.filter((t) => t.category === selectedCategory)
    : textbooks;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Section Header & Category Filter Tabs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-blue-50 text-blue-600 border-blue-200 font-bold uppercase tracking-wider text-[10px]">
            Curriculum Library
          </Badge>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">
          Browse Approved Textbooks
        </h2>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              selectedCategory === null 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All Subjects ({textbooks.length})
          </button>
          
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton Indicator */}
      {isLoading ? (
        <div className="p-12 text-center bg-slate-50 rounded-3xl">
          <p className="text-slate-400 font-medium animate-pulse">
            Loading curriculum repository...
          </p>
        </div>
      ) : (
        /* Textbooks Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTextbooks.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium bg-white">
              No textbooks available in this category yet. Check back soon!
            </div>
          ) : (
            filteredTextbooks.map((tb) => (
              <Card 
                key={tb.id} 
                className="border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group rounded-3xl overflow-hidden bg-white"
                onClick={() => onSelectTextbook(tb.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    
                    {/* Textbook Icon Badge */}
                    <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors shrink-0">
                      <Book className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                    </div>

                    {/* Textbook Meta Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate">
                          {tb.subject}
                        </span>
                        {tb.edition && (
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {tb.edition}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {tb.title}
                      </h3>

                      <p className="text-xs text-slate-400 font-medium pt-1">
                        By {tb.author}
                      </p>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

    </div>
  );
}
