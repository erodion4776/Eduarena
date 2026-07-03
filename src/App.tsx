/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import Login from '@/src/pages/Login';
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
import { Toaster } from '@/components/ui/sonner';
import AIChatWidget from '@/src/components/ai/AIChatWidget';


export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Router>
      <Routes>
        {/* Public Login/Signup page (without SidebarLayout) */}
        <Route path="/login" element={<Login />} />

        {/* Locked Workspace routes with SidebarLayout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route 
                    path="/teacher" 
                    element={
                      <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                        <TeacherDashboard />
                      </ProtectedRoute>
                    } 
                  />
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
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/arena" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminArena />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/harvester" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AlocHarvester />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </SidebarLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
      <AIChatWidget />
    </Router>
  );
}

