import React, { useState } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useThemeStore } from '@/src/store/useThemeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Database, 
  Terminal, 
  KeyRound, 
  ShieldCheck, 
  GraduationCap, 
  Compass, 
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { setUser, loginAsGuest } = useAuthStore();
  const { mode } = useThemeStore();
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [schoolId, setSchoolId] = useState('school_1');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schema Panel Tab State
  const [activeSchemaTab, setActiveSchemaTab] = useState<'users' | 'sessions' | 'rules'>('users');
  const [showSchemaConsole, setShowSchemaConsole] = useState(false);

  // Core Auth Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignUp 
      ? { name, email, password, role, school_id: schoolId }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success(isSignUp ? 'Account created successfully!' : 'Welcome back to Edu Arena!');
      setUser(data.user);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestEntry = () => {
    loginAsGuest();
    toast.success('Browsing as Guest Scholar. Points and levels are temporary.');
  };

  // SQL Schema Definitions for Authentication and Login
  const sqlSchemaUsers = `-- 1. Custom Relational Schema for User Identity and Credentials
CREATE TABLE IF NOT EXISTS users_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Securely hashed via bcrypt (Work factor 10)
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'teacher')),
  school_id VARCHAR(100),
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  rank VARCHAR(100) DEFAULT 'Bronze Scholar',
  badges JSONB DEFAULT '[]', -- JSON array of earned achievements
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user retrieval during credentials validation
CREATE INDEX IF NOT EXISTS idx_users_auth_email ON users_auth(email);`;

  const sqlSchemaSessions = `-- 2. Relational Schema for Active Session Management (JWT / Refresh Tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_auth(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL, -- Securely hashed refresh token / session token
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT FALSE
);

-- Indexes for lightning fast session lookups & security audits
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);`;

  const sqlSchemaRules = `-- 3. Row-Level Security Rules for Data Isolation
ALTER TABLE users_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can inspect and update only their own profile
CREATE POLICY "Users can manage own profiles" ON users_auth
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Administrators have unrestricted read access to study records
CREATE POLICY "Admins read all profiles" ON users_auth
  FOR SELECT
  USING (role = 'admin');`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col lg:flex-row relative overflow-hidden select-none">
      {/* Decorative ambient background rings */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* LEFT PANEL: Branding & Philosophy */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 z-10 border-b lg:border-b-0 lg:border-r border-white/10">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-black font-bold animate-pulse" />
          </div>
          <span className="text-xl font-display font-black tracking-[0.2em] uppercase">
            EDU <span className="text-cyan-400">ARENA</span>
          </span>
        </header>

        <main className="my-auto py-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-[0.15em]">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
            Empowering WAEC, JAMB & NECO Scholars
          </div>
          <h1 className="text-4xl lg:text-5xl font-heading font-black tracking-tighter leading-[1.1] text-white">
            The Digital Sandbox for <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Exam Excellence</span>.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Practice dynamically generated questions, interact with Tutor Chuks (your RAG-driven AI professor), battle other students in real-time arenas, and earn legendary badges.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-white uppercase">Syllabus Focused</h4>
                <p className="text-xs text-zinc-500">Official curricula aligned</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center gap-3">
              <Compass className="w-8 h-8 text-purple-400 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-white uppercase">AI Diagnostics</h4>
                <p className="text-xs text-zinc-500">Personalized lesson planning</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/5">
          <p className="text-xs text-zinc-500">© 2026 Edu Arena. Engineered in Sandbox Environment.</p>
          <button 
            onClick={() => setShowSchemaConsole(!showSchemaConsole)}
            className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            <Database className="w-3.5 h-3.5 animate-pulse" />
            {showSchemaConsole ? 'Hide SQL Database Schema' : 'Inspect SQL Database Schema'}
          </button>
        </footer>
      </div>

      {/* RIGHT PANEL: Dynamic Forms or Database Schema Console */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-16 z-10 bg-zinc-950/80">
        <AnimatePresence mode="wait">
          {!showSchemaConsole ? (
            <motion.div
              key="auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <Card className="bg-zinc-900/80 border-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-heading font-black tracking-tight text-white uppercase">
                    {isSignUp ? 'Create your Account' : 'Welcome Scholar'}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {isSignUp 
                      ? 'Register your profile to begin saving exam progress and earning points.' 
                      : 'Enter your credentials to access your personal study terminal.'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1.5"
                      >
                        <Label htmlFor="name" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <Input 
                            id="name"
                            type="text" 
                            placeholder="Chinedu Okafor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 pl-9 rounded-xl focus-visible:ring-cyan-500/50 text-white placeholder:text-zinc-600 text-sm py-5"
                            required={isSignUp}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input 
                          id="email"
                          type="email" 
                          placeholder="scholar@eduarena.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-zinc-950/50 border-white/10 pl-9 rounded-xl focus-visible:ring-cyan-500/50 text-white placeholder:text-zinc-600 text-sm py-5"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input 
                          id="password"
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-zinc-950/50 border-white/10 pl-9 pr-10 rounded-xl focus-visible:ring-cyan-500/50 text-white placeholder:text-zinc-600 text-sm py-5"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isSignUp && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="role" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Account Role</Label>
                          <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-cyan-500/50 text-white text-sm"
                          >
                            <option value="student" className="bg-zinc-950">Student</option>
                            <option value="admin" className="bg-zinc-950">Administrator</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="school" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">School Code</Label>
                          <Input 
                            id="school"
                            type="text" 
                            placeholder="Lagos Academy"
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
                            className="bg-zinc-950/50 border-white/10 rounded-xl focus-visible:ring-cyan-500/50 text-white placeholder:text-zinc-600 text-sm py-2.5"
                          />
                        </div>
                      </motion.div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black uppercase text-xs tracking-widest rounded-xl py-5 shadow-lg shadow-cyan-500/15 disabled:opacity-50 mt-2 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    >
                      {isSubmitting 
                        ? 'Validating Identity...' 
                        : isSignUp ? 'Initiate Account' : 'Authenticate Credentials'}
                    </Button>
                  </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-4 pb-6 bg-zinc-900/30">
                  <div className="text-center w-full">
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs text-zinc-400 hover:text-cyan-400 font-bold tracking-wide uppercase transition-colors"
                    >
                      {isSignUp 
                        ? 'Already registered? Access study terminal' 
                        : 'New Scholar? Register your account here'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full">
                    <div className="h-px bg-white/5 flex-1" />
                    <span className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">OR</span>
                    <div className="h-px bg-white/5 flex-1" />
                  </div>

                  <Button 
                    type="button"
                    onClick={handleGuestEntry}
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white font-bold rounded-xl py-5 text-xs tracking-wider uppercase cursor-pointer"
                  >
                    🚀 Skip and Browse as Guest Scholar
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="schema-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl"
            >
              <Card className="bg-zinc-900 border-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Neon database glowing decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.15)_0%,_transparent_75%)] pointer-events-none" />

                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
                      <CardTitle className="text-lg font-display font-black tracking-widest text-white uppercase">
                        SQL Schema console
                      </CardTitle>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowSchemaConsole(false)}
                      className="text-xs uppercase tracking-wider text-zinc-500 hover:text-white"
                    >
                      Close Schema
                    </Button>
                  </div>
                  <CardDescription className="text-xs text-zinc-400">
                    Inspect the production-ready PostgreSQL relational schemas used for storing scholar identities, active JWT refresh tokens, and Row-Level Security.
                  </CardDescription>
                </CardHeader>

                <div className="flex border-b border-white/5 bg-zinc-950/40">
                  <button
                    onClick={() => setActiveSchemaTab('users')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'users' 
                        ? 'border-cyan-500 text-cyan-400 bg-white/5' 
                        : 'border-transparent text-zinc-500 hover:text-white'
                    }`}
                  >
                    1. Users Identity
                  </button>
                  <button
                    onClick={() => setActiveSchemaTab('sessions')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'sessions' 
                        ? 'border-cyan-500 text-cyan-400 bg-white/5' 
                        : 'border-transparent text-zinc-500 hover:text-white'
                    }`}
                  >
                    2. JWT Sessions
                  </button>
                  <button
                    onClick={() => setActiveSchemaTab('rules')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'rules' 
                        ? 'border-cyan-500 text-cyan-400 bg-white/5' 
                        : 'border-transparent text-zinc-500 hover:text-white'
                    }`}
                  >
                    3. Security Rules
                  </button>
                </div>

                <CardContent className="p-0">
                  <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 h-80 overflow-y-auto no-scrollbar selection:bg-cyan-500/30">
                    <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
                      {activeSchemaTab === 'users' && sqlSchemaUsers}
                      {activeSchemaTab === 'sessions' && sqlSchemaSessions}
                      {activeSchemaTab === 'rules' && sqlSchemaRules}
                    </pre>
                  </div>
                </CardContent>

                <CardFooter className="bg-zinc-900/50 border-t border-white/5 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      Prepared for PostgreSQL & Supabase Database
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const code = activeSchemaTab === 'users' 
                        ? sqlSchemaUsers 
                        : activeSchemaTab === 'sessions' 
                          ? sqlSchemaSessions 
                          : sqlSchemaRules;
                      navigator.clipboard.writeText(code);
                      toast.success('SQL Code snippet copied to clipboard!');
                    }}
                    className="bg-cyan-950/80 border border-cyan-500/30 hover:bg-cyan-900 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-lg shrink-0 cursor-pointer"
                  >
                    Copy SQL SQL Script
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
