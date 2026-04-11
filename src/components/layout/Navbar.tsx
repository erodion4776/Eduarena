import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, LogOut, User, Settings, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useThemeStore();

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors duration-500 ${
      mode === 'arena' ? 'bg-black border-green-500/30' : 'bg-white border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${mode === 'arena' ? 'bg-green-500' : 'bg-blue-600'}`}>
            {mode === 'arena' ? <Zap className="text-black w-5 h-5" /> : <BookOpen className="text-white w-5 h-5" />}
          </div>
          <span className={`text-xl font-bold tracking-tighter ${mode === 'arena' ? 'text-green-500' : 'text-slate-900'}`}>
            EduArena
          </span>
        </div>

        <div className="flex items-center gap-6">
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className={`text-sm font-bold ${mode === 'arena' ? 'text-white' : 'text-slate-900'}`}>{user.name}</span>
                <span className="text-xs text-slate-500">Lvl {user.level} • {user.points} pts</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => logout()}>
                <LogOut className={`w-5 h-5 ${mode === 'arena' ? 'text-green-500' : 'text-slate-600'}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
