import React, { useState } from 'react';
import { alocIngestionService } from '@/src/lib/alocIngestionService';
import { Button } from '@/components/ui/button';

export default function TestFetchPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [hasMore,   setHasMore]   = useState(false);

  const runFetch = async (pageNum = 1) => {
    setLoading(true);
    setError(null);     // clear previous error
    setQuestions([]);   // clear stale results

    try {
      const res = await alocIngestionService.fetchAllQuestions(pageNum, 50);
      setQuestions(res.data);
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPage(pageNum);
    } catch (e: any) {
      console.error('[TestFetchPage]', e);
      setError(e.message ?? 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Sync Question Explorer</h1>

      {/* Fetch Button */}
      <Button onClick={() => runFetch(1)} disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch Synced Questions'}
      </Button>

      {/* Error Banner */}
      {error && (
        <p className="text-sm text-red-600 font-medium border border-red-200 bg-red-50 px-4 py-2 rounded">
          ✗ {error}
        </p>
      )}

      {/* Result Count */}
      {!loading && questions.length > 0 && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Showing {questions.length} of {total} records — Page {page}
        </p>
      )}

      {/* Empty State */}
      {!loading && !error && questions.length === 0 && (
        <p className="text-sm text-slate-400 italic">
          No questions found. Click fetch to load synced data.
        </p>
      )}

      {/* Question List */}
      <div className="divide-y divide-slate-100 border rounded">
        {questions.map(q => (
          <div key={q.id} className="p-3 text-sm text-slate-700 hover:bg-slate-50">
            {/* FIX 1: safe access — question_text may be null */}
            {(q.question_text ?? q.question_content ?? 'No question text').slice(0, 80)}
            {(q.question_text ?? q.question_content ?? '').length > 80 && '...'}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {questions.length > 0 && (
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => runFetch(page - 1)}
          >
            ← Prev
          </Button>

          <span className="text-xs font-semibold text-slate-500">
            Page {page} · {total} total
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => runFetch(page + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
