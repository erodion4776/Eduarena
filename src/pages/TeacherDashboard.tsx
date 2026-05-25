import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Target, Zap, Loader2, BookOpenText } from 'lucide-react';

export default function TeacherDashboard() {
    const [performance, setPerformance] = useState<any>(null);
    const [assignment, setAssignment] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetch('/api/teacher/class-performance')
            .then(res => res.json())
            .then(data => setPerformance(data));
    }, []);

    const generateAssignment = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/teacher/generate-assignment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: 'Calculus', difficulty: 'Hard' })
            });
            const data = await res.json();
            setAssignment(data.assignment);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tighter">Teacher Command Center</h1>
                <p className="text-zinc-500 font-medium">Analyze class performance and orchestrate assignments.</p>
            </div>
            
            {performance && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Class Average</CardTitle>
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-white">{performance.classAverage}%</div>
                            <p className="text-xs text-zinc-500 mt-1">Across all active students</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="col-span-1 md:col-span-2 bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Common Struggle Topics</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {performance.commonStruggleTopics.map((topic: string) => (
                                <span key={topic} className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-sm font-semibold border border-rose-500/20">
                                    {topic}
                                </span>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Zap className="text-cyan-400" /> Assignment Engine
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-zinc-400 text-sm">Leverage AI to generate optimized assignments tailored to observed student performance gaps.</p>
                    <Button 
                        onClick={generateAssignment} 
                        disabled={isGenerating}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <BookOpenText className="w-4 h-4 mr-2" />}
                        Generate Calculus Quiz
                    </Button>
                    {assignment && (
                        <div className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300 font-mono text-sm">
                            {assignment}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
