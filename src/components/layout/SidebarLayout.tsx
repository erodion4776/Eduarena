import React from 'react';
import { NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileEdit, 
  Cpu, 
  ScrollText, 
  Target, 
  BarChart3, 
  Swords, 
  Trophy, 
  Bell, 
  Settings 
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Practice', path: '/practice', icon: BookOpen },
  { name: 'Mock Exams', path: '/arena', icon: FileEdit },
  { name: 'AI Tutor', path: '/tutor', icon: Cpu },
  { name: 'Syllabus', path: '/syllabus', icon: ScrollText },
  { name: 'Study Planner', path: '/planner', icon: Target },
  { name: 'Performance', path: '/performance', icon: BarChart3 },
  { name: 'Leaderboard', path: '/leaderboard', icon: Swords },
  { name: 'Achievements', path: '/achievements', icon: Trophy },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className={`border-r border-white/10 flex flex-col p-4 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
        <div className="text-white font-black text-xl mb-8 tracking-tighter px-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600" />
          {isOpen && "EDUARENA"}
        </div>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {isOpen && item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col">
        <Navbar toggleSidebar={() => setIsOpen(!isOpen)} />
        {children}
      </main>
    </div>
  );
}
