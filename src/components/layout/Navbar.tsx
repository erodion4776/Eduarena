import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, LogOut, User, Settings, Zap, GraduationCap, Menu } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';

export default function Navbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useThemeStore();

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors duration-500 ${
      mode === 'arena' ? 'bg-black border-green-500/30' : 'bg-white border-indigo-950/10'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className={`w-5 h-5 ${mode === 'arena' ? 'text-white' : 'text-indigo-950/70'}`} />
          </Button>
          <div className={`p-2 rounded-xl ${mode === 'arena' ? 'bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'edvenia-gradient shadow-md shadow-indigo-900/25'} transition-all duration-500`}>
            {mode === 'arena' ? <Zap className="text-black w-5 h-5 animate-pulse" /> : <BookOpen className="text-amber-300 w-5 h-5" />}
          </div>
          <span className={`text-xl font-display font-black tracking-[0.1em] ${mode === 'arena' ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] uppercase' : 'text-indigo-950'} transition-colors duration-500`}>
            {mode === 'arena' ? <>EDU <span className="text-cyan-400">ARENA</span></> : <>Edvenia</>}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className={`text-sm font-black tracking-wide ${mode === 'arena' ? 'text-white uppercase' : 'text-indigo-950'}`}>{user.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${mode === 'arena' ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'bg-indigo-100 border border-indigo-200 text-indigo-700'}`}>
                      Lv. {user.level}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${mode === 'arena' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-100 border border-amber-200 text-amber-700'}`}>
                      {user.points} PTS
                    </span>
                  </div>
                </div>
              </div>
              <Link to="/teacher">
                <Button variant="ghost" size="icon">
                  <GraduationCap className={`w-5 h-5 ${mode === 'arena' ? 'text-cyan-500' : 'text-indigo-950/60'}`} />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => logout()}>
                <LogOut className={`w-5 h-5 ${mode === 'arena' ? 'text-green-500' : 'text-indigo-950/60'}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
