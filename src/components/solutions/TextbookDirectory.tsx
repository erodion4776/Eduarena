import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TextbookDirectoryProps {
  onSelectTextbook: (id: string) => void;
}

export default function TextbookDirectory({ onSelectTextbook }: TextbookDirectoryProps) {
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/textbooks')
      .then(res => res.json())
      .then(data => {
        setTextbooks(data);
        const uniqueCategories = Array.from(new Set(data.map((t: any) => t.category))) as string[];
        setCategories(uniqueCategories);
      });
  }, []);

  const filteredTextbooks = selectedCategory 
    ? textbooks.filter(t => t.category === selectedCategory)
    : textbooks;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Browse Library</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
              selectedCategory === null 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All Subjects
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTextbooks.map(tb => (
          <Card 
            key={tb.id} 
            className="border-none shadow-sm hover:shadow-xl transition-all cursor-pointer group rounded-2xl overflow-hidden"
            onClick={() => onSelectTextbook(tb.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors">
                  <Book className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 group-hover:text-blue-600 transition-colors">{tb.title}</h3>
                  <p className="text-sm font-medium text-slate-500">{tb.subject}</p>
                  <p className="text-xs text-slate-400 mt-2">{tb.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
