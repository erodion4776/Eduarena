import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, GraduationCap, User, Eye, EyeOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'signin' | 'signup';
type TenantMode = 'create' | 'join';

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isInitialized, signIn, signUp, isLoading } = useAuthStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [tenantMode, setTenantMode] = useState<TenantMode>('join');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [joinSlug, setJoinSlug] = useState('');

  // Local errors
  const [error, setError] = useState<string | null>(null);

  // Rate limiting / submission cooldown
  const [lastAttempt, setLastAttempt] = useState<number>(0);
  const COOLDOWN_MS = 2000;

  // Handles reactive navigation upon successful authentication
  useEffect(() => {
    if (isInitialized && user) {
      const getDefaultPath = (userRole: 'student' | 'teacher' | 'admin'): string => {
        switch (userRole) {
          case 'admin':
            return '/admin';
          case 'teacher':
            return '/teacher';
          default:
            return '/';
        }
      };

      const fallback = getDefaultPath(user.role);
      const locationState = location.state as LocationState | null;
      const destination = locationState?.from?.pathname || fallback;
      navigate(destination, { replace: true });
    }
  }, [user, isInitialized, navigate, location.state]);

  // Form field state reset when switching between SignIn & SignUp modes
  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'signin') {
      setName('');
      setSchoolName('');
      setJoinSlug('');
      setRole('student');
      setTenantMode('join');
    }
  };

  // Redirecting state or null while useEffect handles routing
  if (isInitialized && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-zinc-400 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side submission cooldown to prevent spamming auth requests
    const now = Date.now();
    if (now - lastAttempt < COOLDOWN_MS) {
      toast.warning('Please wait a moment before trying again.');
      return;
    }
    setLastAttempt(now);

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please provide your name.');
          return;
        }
        if (tenantMode === 'create' && !schoolName.trim()) {
          setError('Please provide a school name to register.');
          return;
        }
        if (tenantMode === 'join' && !joinSlug.trim()) {
          setError('Please enter your school join code.');
          return;
        }

        const res = await signUp({
          email,
          password,
          name,
          role,
          tenantMode,
          schoolName: tenantMode === 'create' ? schoolName : undefined,
          joinSlug: tenantMode === 'join' ? joinSlug : undefined,
        });

        if (res.error) {
          setError(res.error);
          return;
        }
        toast.success('Registration successful!');
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
          return;
        }
        toast.success('Signed in successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="border-white/10 bg-zinc-900/80 backdrop-blur-md text-white shadow-2xl relative">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-3xl font-display font-black tracking-tight uppercase">
              Edu<span className="text-cyan-400">Arena</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              {mode === 'signup' ? 'Create your learning node link' : 'Synchronize with the learning network'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mode selection tabs */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="flex mb-6 rounded-xl bg-zinc-800/60 p-1 border border-white/5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                aria-controls="auth-form-panel"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${
                  mode === 'signin'
                    ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                aria-controls="auth-form-panel"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form
              id="auth-form-panel"
              role="tabpanel"
              aria-label={`${mode === 'signin' ? 'Sign In' : 'Sign Up'} Form`}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500"
                      />
                    </div>

                    {/* School options mode */}
                    <div className="space-y-2">
                      <Label className="text-zinc-300">School Preference</Label>
                      <div className="flex rounded-lg bg-zinc-800/60 p-1 border border-white/5">
                        <button
                          type="button"
                          onClick={() => setTenantMode('join')}
                          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
                            tenantMode === 'join'
                              ? 'bg-zinc-700 text-white border border-white/10'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Join a school
                        </button>
                        <button
                          type="button"
                          onClick={() => setTenantMode('create')}
                          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
                            tenantMode === 'create'
                              ? 'bg-zinc-700 text-white border border-white/10'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Register a school
                        </button>
                      </div>
                    </div>

                    {tenantMode === 'join' ? (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="joinSlug" className="text-zinc-300 flex items-center gap-1.5">
                            School Join Code <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                          </Label>
                          <Input
                            id="joinSlug"
                            placeholder="e.g. greenfield-high-a1b2"
                            value={joinSlug}
                            onChange={(e) => setJoinSlug(e.target.value)}
                            className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500 font-mono tracking-wider"
                          />
                          <p className="text-xs text-zinc-400">Ask your school administrator for the join code.</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-zinc-300">I am a</Label>
                          <Select
                            value={role}
                            onValueChange={(val: 'student' | 'teacher') => setRole(val)}
                          >
                            <SelectTrigger id="role" className="bg-zinc-800/50 border-white/10 text-white focus:ring-cyan-500">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="student" className="hover:bg-zinc-800">
                                <span className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-cyan-400" /> Student
                                </span>
                              </SelectItem>
                              <SelectItem value="teacher" className="hover:bg-zinc-800">
                                <span className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-yellow-400" /> Teacher
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="schoolName" className="text-zinc-300 flex items-center gap-1.5">
                          School Name <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 text-[10px] border-none">NEW SCHOOL</Badge>
                        </Label>
                        <Input
                          id="schoolName"
                          placeholder="Greenfield High Academy"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500"
                        />
                        <p className="text-xs text-zinc-400">You will automatically be registered as the administrator of this school.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="scholar@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showPassword && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Password is visible — ensure no one can see your screen.
                  </p>
                )}
              </div>

              {/* Error messages via accessible live-region */}
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="min-h-0"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-11 rounded-xl shadow-lg shadow-cyan-500/20 tracking-wider uppercase flex items-center justify-center gap-2 mt-2 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  mode === 'signup' ? 'Activate Account' : 'Initialize Connection'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-white/5 pt-4">
            <button
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {mode === 'signup'
                ? 'Already registered? Sync existing connection'
                : 'Request new node activation (Sign Up)'}
            </button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
