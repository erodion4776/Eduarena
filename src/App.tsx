/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import SidebarLayout from '@/src/components/layout/SidebarLayout';
import TeacherDashboard from '@/src/pages/TeacherDashboard';
import Dashboard from '@/src/pages/Dashboard';
import TrendsBoard from '@/src/pages/TrendsBoard';
import AdminPage from '@/src/pages/Admin';
import AdminArena from '@/src/pages/AdminArena';
import AlocHarvester from '@/src/pages/AlocHarvester';
import ExamArena from '@/src/pages/ExamArena';
import Practice from '@/src/pages/Practice';
import Syllabus from '@/src/pages/Syllabus';
import AITutor from '@/src/pages/AITutor';
import StudyPlanner from '@/src/pages/StudyPlanner';
import Performance from '@/src/pages/Performance';
import Leaderboard from '@/src/pages/Leaderboard';
import Achievements from '@/src/pages/Achievements';
import Notifications from '@/src/pages/Notifications';
import Settings from '@/src/pages/Settings';
import Login from '@/src/pages/Login';
import { Toaster } from '@/components/ui/sonner';
import AIChatWidget from '@/src/components/ai/AIChatWidget';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen edvenia-shell text-indigo-950 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-sm font-bold uppercase tracking-widest text-indigo-900/70 animate-pulse">
          Initializing Edvenia Session...
        </p>
      </div>
    );
  }

  // If user is not authenticated, render only the Login screen (with signup built-in)
  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </Router>
    );
  }

  // If authenticated, render full SidebarLayout with all academic pages
  return (
    <Router>
      <SidebarLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/trends" element={<TrendsBoard />} />
          <Route path="/arena" element={<ExamArena />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/syllabus" element={<Syllabus />} />
          <Route path="/tutor" element={<AITutor />} />
          <Route path="/planner" element={<StudyPlanner />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/arena" element={<AdminArena />} />
          <Route path="/admin/harvester" element={<AlocHarvester />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SidebarLayout>
      <Toaster />
      <AIChatWidget />
    </Router>
  );
}
