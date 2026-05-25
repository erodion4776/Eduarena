import React, { useEffect } from 'react';
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
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsOpen(true);
    }
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col p-4 bg-zinc-900 border-r border-white/10 transition-all duration-300
        lg:static lg:translate-x-0
        ${isOpen 
          ? 'w-64 translate-x-0' 
          : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
        }
      `}>
        <div className="text-white font-black text-xl mb-6 tracking-tighter px-2 flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shrink-0" />
          {isOpen && <span className="animate-fade-in">EDUARENA</span>}
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 no-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsOpen(false);
                }
              }}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-250 shrink-0 ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-lg border border-white/5' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isOpen && <span className="whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col min-w-0">
        <Navbar toggleSidebar={() => setIsOpen(!isOpen)} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
