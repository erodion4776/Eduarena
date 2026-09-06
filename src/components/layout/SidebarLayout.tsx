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
  Settings,
  GraduationCap,
  Heart,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Practice', path: '/practice', icon: BookOpen },
  { name: 'Mock Exams', path: '/arena', icon: FileEdit },
  { name: 'AI Tutor', path: '/tutor', icon: Cpu },
  { name: 'Syllabus', path: '/syllabus', icon: ScrollText },
  { name: 'Study Plan', path: '/planner', icon: Target },
  { name: 'Performance', path: '/performance', icon: BarChart3 },
  { name: 'Leaderboard', path: '/leaderboard', icon: Swords },
  { name: 'Rewards', path: '/achievements', icon: Trophy },
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
    <div className="flex h-screen bg-[#fdf6ea] text-indigo-950 overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-indigo-950/40 lg:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col p-4 bg-white border-r border-indigo-950/10 shadow-[4px_0_24px_-12px_rgba(30,27,75,0.15)] transition-all duration-300
        lg:static lg:translate-x-0
        ${isOpen
          ? 'w-72 translate-x-0'
          : 'w-0 -translate-x-full lg:w-24 lg:translate-x-0'
        }
      `}>
        <div className="text-indigo-950 font-black text-xl mb-6 tracking-tight px-2 flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-2xl edvenia-gradient flex items-center justify-center shrink-0 shadow-md shadow-indigo-900/30">
            <GraduationCap className="w-5 h-5 text-amber-300" />
          </div>
          {isOpen && (
            <span className="animate-fade-in leading-tight">
              Edvenia
              <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-[0.2em]">
                Learn. Practice. Win.
              </span>
            </span>
          )}
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 no-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsOpen(false);
                }
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'edvenia-gradient text-white shadow-lg shadow-indigo-900/25'
                    : 'text-indigo-950/70 hover:bg-amber-100/60 hover:text-indigo-950'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isOpen && <span className="whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {isOpen && (
          <div className="mt-4 p-4 rounded-2xl edvenia-gradient text-white relative overflow-hidden shrink-0">
            <div
              aria-hidden="true"
              className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-400/20"
            />
            <GraduationCap className="w-7 h-7 text-amber-300 mb-2" />
            <p className="font-black text-sm">You've got this!</p>
            <p className="text-[11px] text-indigo-100/90 mt-1 leading-relaxed">
              Every question you answer gets you closer to your dream result.
            </p>
            <Heart className="w-4 h-4 text-rose-300 mt-2 fill-rose-300" />
          </div>
        )}
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col min-w-0 edvenia-shell overflow-hidden">
        <Navbar toggleSidebar={() => setIsOpen(!isOpen)} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
