import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Zap, GraduationCap, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  // --- GLOBAL STATE HOOKS ---
  const { user, logout } = useAuthStore();
  const { mode } = useThemeStore();

  const isArenaMode = mode === 'arena';

  return (
    <nav 
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isArenaMode 
          ? 'bg-slate-950 border-cyan-500/20' 
          : 'bg-white border-slate-200/80 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left Section: Mobile Menu Toggle & App Logo */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="rounded-xl hover:bg-white/10"
          >
            <Menu className={`w-5 h-5 ${isArenaMode ? 'text-white' : 'text-slate-700'}`} />
          </Button>

          {/* Logo Badge Icon */}
          <div className={`p-2 rounded-xl transition-all duration-300 ${
            isArenaMode 
              ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
              : 'bg-blue-600 shadow-md shadow-blue-600/20'
          }`}>
            {isArenaMode ? (
              <Zap className="text-slate-950 w-5 h-5 fill-current animate-pulse" />
            ) : (
              <BookOpen className="text-white w-5 h-5" />
            )}
          </div>

          {/* App Brand Name */}
          <Link to="/" className="flex items-center focus:outline-none">
            <span className={`text-xl font-black tracking-wider transition-colors duration-300 ${
              isArenaMode ? 'text-white' : 'text-slate-900'
            }`}>
              {isArenaMode ? (
                <>EDU <span className="text-cyan-400">ARENA</span></>
              ) : (
                <>Edvenia</>
              )}
            </span>
          </Link>
        </div>

        {/* Right Section: User Status & Quick Action Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              
              {/* User Level & Points (Hidden on small mobile screens for cleaner layout) */}
              <div className="hidden md:flex flex-col items-end">
                <span className={`text-sm font-bold tracking-wide ${
                  isArenaMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {user.name || 'Scholar'}
                </span>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isArenaMode 
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    LVL {user.level ?? 1}
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isArenaMode 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                  }`}>
                    {user.points ?? 0} PTS
                  </span>
                </div>
              </div>

              {/* Teacher Portal Link */}
              <Link to="/teacher" title="Teacher Portal">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Teacher Portal"
                  className="rounded-xl hover:bg-white/10"
                >
                  <GraduationCap className={`w-5 h-5 ${
                    isArenaMode ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-900'
                  }`} />
                </Button>
              </Link>

              {/* Log Out Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logout()} 
                title="Sign Out"
                aria-label="Sign Out"
                className="rounded-xl hover:bg-white/10"
              >
                <LogOut className={`w-5 h-5 ${
                  isArenaMode ? 'text-rose-400' : 'text-slate-600 hover:text-rose-600'
                }`} />
              </Button>
            </div>
          ) : (
            // Fallback action if user is not currently signed in
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5">
                Sign In
              </Button>
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
