import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function TrendsBoard() {
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);

    useEffect(() => {
        // Mocking the trend data as the API isn't fully connected to the DB yet
        setTrends([
            { topic: 'Photosynthesis', year: 2024, frequency: 12 },
            { topic: 'Genetics', year: 2024, frequency: 8 },
            { topic: 'Photosynthesis', year: 2023, frequency: 10 },
        ]);
    }, []);

    const explainTrend = async (trend: any) => {
        setLoading(true);
        try {
            const res = await fetch('/api/analytics/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trend)
            });
            const data = await res.json();
            setExplanation(data.explanation);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold">Topic Trends</h1>
            <div className="grid gap-4">
                {trends.map((t, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <CardTitle>{t.topic} - {t.year}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <span>Frequency: {t.frequency}</span>
                            <Button onClick={() => explainTrend(t)}>Explain with AI</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {explanation && (
                <div className="p-4 bg-zinc-800 rounded-lg mt-6">
                    <h3 className="font-bold text-white mb-2">AI Explanation:</h3>
                    <p className="text-zinc-300">{explanation}</p>
                </div>
            )}
        </div>
    );
}
