import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Shield, GraduationCap, User, Eye, EyeOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, isLoading, error: authError } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [schoolName, setSchoolName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Local errors
  const [error, setError] = useState<string | null>(null);

  const redirectPath = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      if (isSignUp) {
        if (!name) {
          setError('Please provide your name.');
          return;
        }
        if (role === 'admin' && !schoolName) {
          setError('Please provide a school name to register.');
          return;
        }
        if (role !== 'admin' && !joinCode) {
          setError('Please enter your school join code.');
          return;
        }

        const res = await signUp({
          email,
          password,
          name,
          role: role === 'admin' ? 'student' : (role as any),
          tenantMode: role === 'admin' ? 'create' : 'join',
          schoolName: role === 'admin' ? schoolName : undefined,
          joinSlug: role !== 'admin' ? joinCode : undefined,
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
      navigate(redirectPath, { replace: true });
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
        className="w-full max-w-lg z-10"
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
              {isSignUp ? 'Create your neural learning link' : 'Synchronize with the learning network'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp && (
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
                        required={isSignUp}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-zinc-300">Select Role</Label>
                      <Select
                        value={role}
                        onValueChange={(val: any) => setRole(val)}
                      >
                        <SelectTrigger className="bg-zinc-800/50 border-white/10 text-white focus:ring-cyan-500">
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
                          <SelectItem value="admin" className="hover:bg-zinc-800">
                            <span className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-red-400" /> School Administrator
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {role === 'admin' ? (
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
                          required={role === 'admin'}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="joinCode" className="text-zinc-300 flex items-center gap-1.5">
                          School Join Code <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        </Label>
                        <Input
                          id="joinCode"
                          placeholder="e.g. greenfield-high-a1b2"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500 font-mono tracking-wider"
                          required
                        />
                        <p className="text-xs text-zinc-400">Ask your school administrator for the join code.</p>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-zinc-300">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-800/50 border-white/10 text-white focus:border-cyan-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error messages */}
              {(error || authError) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error || authError}</span>
                </motion.div>
              )}

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
                  isSignUp ? 'Activate Account' : 'Initialize Connection'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-white/5 pt-4">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {isSignUp
                ? 'Already registered? Sync existing connection'
                : 'Request new node activation (Sign Up)'}
            </button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
