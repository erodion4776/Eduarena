import React, { useState } from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
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
  ShieldCheck,
  GraduationCap,
  Compass,
  Sparkles,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { setUser, loginAsGuest } = useAuthStore();

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [schoolId, setSchoolId] = useState('school_1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

      toast.success(isSignUp ? 'Account created successfully!' : 'Welcome back to Edvenia!');
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

  const socialProviders = [
    { key: 'google', label: 'G' },
    { key: 'microsoft', label: '⊞' },
    { key: 'apple', label: '' },
  ];

  return (
    <div className="min-h-screen edvenia-shell text-indigo-950 font-sans flex flex-col lg:flex-row relative overflow-hidden select-none">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-300/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/15 rounded-full blur-[120px] pointer-events-none" />

      {/* LEFT PANEL: Branding & Philosophy */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 z-10 border-b lg:border-b-0 lg:border-r border-indigo-950/10">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl edvenia-gradient flex items-center justify-center shadow-lg shadow-indigo-900/25">
            <GraduationCap className="w-5 h-5 text-amber-300" />
          </div>
          <span className="text-xl font-display font-black tracking-[0.15em] uppercase text-indigo-950">
            Edvenia
          </span>
        </header>

        <main className="my-auto py-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300/60 text-amber-700 text-xs font-black uppercase tracking-[0.15em]">
            <Sparkles className="w-3.5 h-3.5" />
            Empowering WAEC, JAMB &amp; NECO Scholars
          </div>
          <h1 className="text-4xl lg:text-5xl font-heading font-black tracking-tighter leading-[1.1] text-indigo-950">
            Learn. Practice. <span className="bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">Win.</span>
          </h1>
          <p className="text-indigo-900/60 text-base leading-relaxed">
            Practice dynamically generated questions, interact with Tutor Chuks (your RAG-driven AI professor), battle other students in real-time arenas, and earn legendary badges.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white border border-indigo-950/5 shadow-sm flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-indigo-950">Syllabus Focused</h4>
                <p className="text-xs text-indigo-900/50">Official curricula aligned</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-indigo-950/5 shadow-sm flex items-center gap-3">
              <Compass className="w-8 h-8 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-indigo-950">AI Diagnostics</h4>
                <p className="text-xs text-indigo-900/50">Personalized lesson planning</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-indigo-950/10">
          <p className="text-xs text-indigo-900/40">© 2026 Edvenia. Engineered in Sandbox Environment.</p>
          <button
            onClick={() => setShowSchemaConsole(!showSchemaConsole)}
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all uppercase tracking-wider self-start sm:self-auto"
          >
            <Database className="w-3.5 h-3.5" />
            {showSchemaConsole ? 'Hide SQL Database Schema' : 'Inspect SQL Database Schema'}
          </button>
        </footer>
      </div>

      {/* RIGHT PANEL: Dynamic Forms or Database Schema Console */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-16 z-10">
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
              <Card className="edvenia-card rounded-3xl overflow-hidden shadow-2xl border-0 py-0">
                <div className="flex p-2 gap-2 bg-indigo-50/60">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                      !isSignUp ? 'edvenia-gradient text-white shadow-md' : 'text-indigo-900/50 hover:text-indigo-900'
                    }`}
                  >
                    <User className="w-4 h-4" /> Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                      isSignUp ? 'edvenia-gradient text-white shadow-md' : 'text-indigo-900/50 hover:text-indigo-900'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" /> Sign Up
                  </button>
                </div>

                <CardHeader className="pb-2 pt-5">
                  <CardTitle className="text-2xl font-heading font-black tracking-tight text-indigo-950">
                    {isSignUp ? 'Create your account' : 'Welcome back! 👋'}
                  </CardTitle>
                  <CardDescription className="text-indigo-900/50">
                    {isSignUp
                      ? 'Register your profile to begin saving exam progress and earning points.'
                      : "Let's continue your learning journey 🚀"}
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
                        <Label htmlFor="name" className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="Chinedu Okafor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white border-indigo-950/10 pl-9 rounded-xl focus-visible:ring-indigo-400/50 text-indigo-950 placeholder:text-indigo-900/30 text-sm py-5"
                            required={isSignUp}
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="scholar@edvenia.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white border-indigo-950/10 pl-9 rounded-xl focus-visible:ring-indigo-400/50 text-indigo-950 placeholder:text-indigo-900/30 text-sm py-5"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white border-indigo-950/10 pl-9 pr-10 rounded-xl focus-visible:ring-indigo-400/50 text-indigo-950 placeholder:text-indigo-900/30 text-sm py-5"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {!isSignUp && (
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900/60 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-indigo-600"
                          />
                          Remember me
                        </label>
                        <button
                          type="button"
                          onClick={() => toast('Password reset isn\'t wired up in this sandbox yet.')}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="role" className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">Account Role</Label>
                          <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full bg-white border border-indigo-950/10 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-400/50 text-indigo-950 text-sm"
                          >
                            <option value="student">Student</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="school" className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">School Code</Label>
                          <Input
                            id="school"
                            type="text"
                            placeholder="Lagos Academy"
                            value={schoolId}
                            onChange={(e) => setSchoolId(e.target.value)}
                            className="bg-white border-indigo-950/10 rounded-xl focus-visible:ring-indigo-400/50 text-indigo-950 placeholder:text-indigo-900/30 text-sm py-2.5"
                          />
                        </div>
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full edvenia-gradient hover:brightness-110 text-white font-black text-sm tracking-wide rounded-xl py-5 shadow-lg shadow-indigo-900/20 disabled:opacity-50 mt-2 cursor-pointer transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2"
                    >
                      {isSubmitting
                        ? 'Validating…'
                        : isSignUp ? "Let's Go! 🚀" : "Let's Go! →"}
                    </Button>
                  </form>

                  <div className="flex items-center gap-3 w-full pt-1">
                    <div className="h-px bg-indigo-950/10 flex-1" />
                    <span className="text-[10px] text-indigo-900/40 font-black tracking-widest uppercase">or continue with</span>
                    <div className="h-px bg-indigo-950/10 flex-1" />
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {socialProviders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toast(`${p.key.charAt(0).toUpperCase() + p.key.slice(1)} sign-in isn't wired up in this sandbox yet.`)}
                        className="w-11 h-11 rounded-full border border-indigo-950/10 bg-white flex items-center justify-center text-base font-bold text-indigo-900 hover:bg-indigo-50 transition-colors"
                        aria-label={`Continue with ${p.key}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t border-indigo-950/5 pt-4 pb-6 bg-indigo-50/40">
                  <div className="text-center w-full text-xs text-indigo-900/60">
                    {isSignUp ? 'Already registered?' : 'New to Edvenia?'}{' '}
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="font-black text-indigo-600 hover:text-indigo-800"
                    >
                      {isSignUp ? 'Log in' : 'Sign Up'}
                    </button>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGuestEntry}
                    variant="outline"
                    className="w-full border-indigo-950/10 hover:bg-indigo-50 bg-white text-indigo-900/70 hover:text-indigo-900 font-bold rounded-xl py-5 text-xs tracking-wider uppercase cursor-pointer"
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
              <Card className="edvenia-card rounded-3xl overflow-hidden shadow-2xl relative border-0 py-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.10)_0%,_transparent_75%)] pointer-events-none" />

                <CardHeader className="border-b border-indigo-950/10 pb-4 pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-600" />
                      <CardTitle className="text-lg font-display font-black tracking-widest text-indigo-950 uppercase">
                        SQL Schema console
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSchemaConsole(false)}
                      className="text-xs uppercase tracking-wider text-indigo-900/50 hover:text-indigo-950"
                    >
                      Close Schema
                    </Button>
                  </div>
                  <CardDescription className="text-xs text-indigo-900/50">
                    Inspect the production-ready PostgreSQL relational schemas used for storing scholar identities, active JWT refresh tokens, and Row-Level Security.
                  </CardDescription>
                </CardHeader>

                <div className="flex border-b border-indigo-950/10 bg-indigo-50/40">
                  <button
                    onClick={() => setActiveSchemaTab('users')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'users'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-indigo-900/40 hover:text-indigo-900'
                    }`}
                  >
                    1. Users Identity
                  </button>
                  <button
                    onClick={() => setActiveSchemaTab('sessions')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'sessions'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-indigo-900/40 hover:text-indigo-900'
                    }`}
                  >
                    2. JWT Sessions
                  </button>
                  <button
                    onClick={() => setActiveSchemaTab('rules')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      activeSchemaTab === 'rules'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-indigo-900/40 hover:text-indigo-900'
                    }`}
                  >
                    3. Security Rules
                  </button>
                </div>

                <CardContent className="p-0">
                  <div className="p-4 bg-indigo-950 font-mono text-xs text-indigo-100 h-80 overflow-y-auto no-scrollbar selection:bg-amber-500/30">
                    <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
                      {activeSchemaTab === 'users' && sqlSchemaUsers}
                      {activeSchemaTab === 'sessions' && sqlSchemaSessions}
                      {activeSchemaTab === 'rules' && sqlSchemaRules}
                    </pre>
                  </div>
                </CardContent>

                <CardFooter className="bg-indigo-50/40 border-t border-indigo-950/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] text-indigo-900/50 font-bold uppercase tracking-wider">
                      Prepared for PostgreSQL &amp; Supabase Database
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
                    className="bg-indigo-100 border border-indigo-300/60 hover:bg-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-lg shrink-0 cursor-pointer"
                  >
                    Copy SQL Script
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
