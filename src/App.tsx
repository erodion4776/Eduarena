/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/src/pages/Dashboard';
import TrendsBoard from '@/src/pages/TrendsBoard';
import AdminPage from '@/src/pages/Admin';
import AdminArena from '@/src/pages/AdminArena';
import AlocHarvester from '@/src/pages/AlocHarvester';
import ExamArena from '@/src/pages/ExamArena';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trends" element={<TrendsBoard />} />
        <Route path="/arena" element={<ExamArena />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/arena" element={<AdminArena />} />
        <Route path="/admin/harvester" element={<AlocHarvester />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

