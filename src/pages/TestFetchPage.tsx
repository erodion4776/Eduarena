import React, { useState } from 'react';
import { alocIngestionService } from '@/src/lib/alocIngestionService';
import { Button } from '@/components/ui/button';

export default function TestFetchPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const runFetch = async () => {
        setLoading(true);
        try {
            const data = await alocIngestionService.fetchAllQuestions();
            setQuestions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Sync Question Explorer</h1>
            <Button onClick={runFetch} disabled={loading}>
                {loading ? 'Fetching...' : 'Fetch All Synced Questions'}
            </Button>

            <div className="mt-4">
                {questions.map(q => (
                    <div key={q.id} className="border-b p-2">
                        {q.question_text.slice(0, 50)}...
                    </div>
                ))}
            </div>
        </div>
    );
}
