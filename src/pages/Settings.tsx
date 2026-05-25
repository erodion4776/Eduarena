import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings as SettingsIcon,
  User, 
  Brain, 
  Bell, 
  BookOpen, 
  Trophy, 
  Lock, 
  Eye, 
  Database, 
  Cpu, 
  Trash2, 
  Save, 
  Check, 
  Upload, 
  Download, 
  ShieldAlert, 
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'notifications' | 'exams' | 'gamification' | 'security' | 'appearance' | 'data' | 'danger'>('profile');
  const [expandedMobileTab, setExpandedMobileTab] = useState<string | null>('profile');

  // Load state from localStorage or defaults
  const [profile, setProfile] = useState({
    name: 'Guest Scholar',
    email: 'guest@eduarena.local',
    school: 'Federal Government College, Lagos',
    level: 'SS 3',
    examTarget: 'JAMB',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop'
  });

  const [aiSettings, setAiSettings] = useState({
    explanationLevel: 'standard', // simple, standard, advanced
    teachingStyle: 'friendly', // friendly, strict, step-by-step
    hintMode: true,
    stepByStep: true,
    practiceGenerator: true,
    mistakeCorrection: true,
    dataMemory: true,
    rememberWeakTopics: true,
    trackMistakes: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    aiAlerts: true,
    studyReminders: true,
    examNotifs: true,
    streakReminders: true,
    leaderboardUpdates: true,
    rewardsAlerts: true,
    frequency: 'daily' // instant, daily, weekly
  });

  const [examPreferences, setExamPreferences] = useState({
    preferredExam: 'JAMB',
    selectedSubjects: ['Mathematics', 'English', 'Physics', 'Chemistry'],
    weakTopicsPriority: true,
    studyMode: 'exam-focused' // fast, deep, exam-focused
  });

  const [gamificationSettings, setGamificationSettings] = useState({
    showXP: true,
    leaderboardVisible: true,
    badgeDisplay: true,
    streakTracking: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    twoFactor: false,
    analyticsEnabled: true,
    aiPersonalization: true,
    storeHistory: true
  });

  const [appearance, setAppearance] = useState({
    theme: 'dark-cyber', // dark-cyber, cosmic-purple, midnight-zinc
    fontSize: 'medium' // small, medium, large
  });

  // Load settings on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('edu_profile');
    const savedAi = localStorage.getItem('edu_ai_settings');
    const savedNotifs = localStorage.getItem('edu_notif_settings');
    const savedExams = localStorage.getItem('edu_exam_prefs');
    const savedGame = localStorage.getItem('edu_game_settings');
    const savedPrivacy = localStorage.getItem('edu_privacy_settings');
    const savedAppearance = localStorage.getItem('edu_appearance');

    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedAi) setAiSettings(JSON.parse(savedAi));
    if (savedNotifs) setNotificationSettings(JSON.parse(savedNotifs));
    if (savedExams) setExamPreferences(JSON.parse(savedExams));
    if (savedGame) setGamificationSettings(JSON.parse(savedGame));
    if (savedPrivacy) setPrivacySettings(JSON.parse(savedPrivacy));
    if (savedAppearance) setAppearance(JSON.parse(savedAppearance));
  }, []);

  // Save Function
  const handleSave = (section: string, data: any, storageKey: string) => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    toast.success(`${section} saved successfully!`);
  };

  const handleSaveForTab = (tabId: string) => {
    switch (tabId) {
      case 'profile':
        handleSave('Profile Settings', profile, 'edu_profile');
        break;
      case 'ai':
        handleSave('AI Tutor Configuration', aiSettings, 'edu_ai_settings');
        break;
      case 'notifications':
        handleSave('Notification Controls', notificationSettings, 'edu_notif_settings');
        break;
      case 'exams':
        handleSave('Exam & Study Settings', examPreferences, 'edu_exam_prefs');
        break;
      case 'gamification':
        handleSave('Gamification Controls', gamificationSettings, 'edu_game_settings');
        break;
      case 'security':
        handleSave('Security & Privacy Settings', privacySettings, 'edu_privacy_settings');
        break;
      case 'appearance':
        handleSave('Appearance Settings', appearance, 'edu_appearance');
        break;
      case 'data':
        handleSave('AI Memory Preferences', privacySettings, 'edu_privacy_settings');
        break;
    }
  };

  // Profile Avatar Upload trigger (Mock)
  const handleAvatarUpload = () => {
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=256&h=256&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop'
    ];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    setProfile(prev => ({ ...prev, avatar: randomAvatar }));
    toast.info("Ran random profile banner avatar generation. Don't forget to Save!");
  };

  // Wiping Database / Local State Mocks
  const resetProgress = () => {
    if (confirm("Are you absolutely sure you want to reset all CBT performance history and exam analytics? This action is irreversible.")) {
      localStorage.clear();
      toast.success("All analytics, test logs and study habits have been wiped clean.");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const resetAIMemory = () => {
    if (confirm("Reset the AI Tutor memory state? Future hints and learning plans will start from baseline metrics.")) {
      setAiSettings(prev => ({ ...prev, rememberWeakTopics: false, trackMistakes: false }));
      toast.success("AI Tutor memory cache invalidated and re-initialized.");
    }
  };

  const downloadPersonalData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, aiSettings, notificationSettings, examPreferences, gamificationSettings, privacySettings, appearance }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EduArena_Student_Data_${profile.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("CBT Student profile data archive exported.");
  };

  // Helper toggle switch component representation
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none ${
        checked ? 'bg-cyan-500' : 'bg-zinc-800 border border-white/5'
      }`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  );

  const tabs = [
    { id: 'profile', label: 'Student Profile', icon: User, color: 'text-cyan-400' },
    { id: 'ai', label: 'AI Tutor Engine', icon: Brain, color: 'text-purple-400' },
    { id: 'notifications', label: 'Alert Center', icon: Bell, color: 'text-cyan-400' },
    { id: 'exams', label: 'Exam Preferences', icon: BookOpen, color: 'text-emerald-400' },
    { id: 'gamification', label: 'Gamification Layer', icon: Trophy, color: 'text-amber-400' },
    { id: 'security', label: 'Privacy & Sessions', icon: Lock, color: 'text-indigo-400' },
    { id: 'appearance', label: 'Visual Styling', icon: Eye, color: 'text-cyan-400' },
    { id: 'data', label: 'Data Memory', icon: Database, color: 'text-indigo-400' },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert, color: 'text-rose-500' }
  ];

  /* --- RENDERS A SPECIFIC PANEL ACCORDING TO ID --- */
  const renderPanelContent = (tabId: string, isMobile = false) => {
    switch (tabId) {
      case 'profile':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black">Student Profile Settings</h1>
                <p className="text-sm text-zinc-400">Manage your educational profile representation and CBT goals.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6 md:space-y-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                <div className="relative group">
                  <img 
                    src={profile.avatar} 
                    alt="Profile" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-cyan-500/30 shadow-[0_4px_20px_rgba(6,182,212,0.15)]" 
                  />
                  <button 
                    onClick={handleAvatarUpload}
                    className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-lg">{profile.name}</h3>
                  <p className="text-sm text-zinc-400">{profile.email}</p>
                  <Button onClick={handleAvatarUpload} variant="outline" className="mt-2 rounded-xl text-xs py-1 h-8">
                    Roll Random Avatar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    className="w-full bg-zinc-950/70 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none focus:border-cyan-500 transition-all text-white"
                    value={profile.name}
                    onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    className="w-full bg-zinc-950/70 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none focus:border-cyan-500 transition-all text-zinc-400"
                    value={profile.email}
                    onChange={e => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">School Name</label>
                  <input 
                    className="w-full bg-zinc-950/70 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none focus:border-cyan-500 transition-all text-white"
                    value={profile.school}
                    onChange={e => setProfile(prev => ({ ...prev, school: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Class / Level</label>
                  <input 
                    className="w-full bg-zinc-950/70 border border-white/10 rounded-2xl p-4 text-sm font-semibold outline-none focus:border-cyan-500 transition-all text-white"
                    value={profile.level}
                    onChange={e => setProfile(prev => ({ ...prev, level: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Primary Target Exam</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {['JAMB', 'WAEC', 'NECO'].map(exam => (
                      <button
                        key={exam}
                        onClick={() => {
                          setProfile(prev => ({ ...prev, examTarget: exam }));
                          setExamPreferences(prev => ({ ...prev, preferredExam: exam }));
                        }}
                        className={`p-3 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all ${
                          profile.examTarget === exam
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {exam} Exam
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Profile Settings', profile, 'edu_profile')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Changes
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Brain className="w-7 h-7 text-purple-400" /> AI Tutor Core Engine Settings
                </h1>
                <p className="text-sm text-zinc-400">Configure how the AI behaves during your studies, quizzes, and revision blocks.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6 md:space-y-8">
              {/* Explanation Level Selector */}
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">AI Explanation Level Depth</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: 'simple', label: 'Simple', desc: 'Syllabus basics' },
                    { key: 'standard', label: 'Standard', desc: 'Balanced concepts' },
                    { key: 'advanced', label: 'Deep Master', desc: 'Advanced analysis' }
                  ].map(level => (
                    <button
                      key={level.key}
                      onClick={() => setAiSettings(prev => ({ ...prev, explanationLevel: level.key }))}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        aiSettings.explanationLevel === level.key
                          ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{level.label}</span>
                      <span className="text-xs text-zinc-500 mt-1">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teaching style */}
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">AI Tutor Teaching Persona</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: 'friendly', label: 'Friendly Coach', desc: 'Encouraging & direct' },
                    { key: 'strict', label: 'Strict Assessor', desc: 'Precision assessment' },
                    { key: 'step-by-step', label: 'Socratic Tutor', desc: 'Guiding through hints' }
                  ].map(style => (
                    <button
                      key={style.key}
                      onClick={() => setAiSettings(prev => ({ ...prev, teachingStyle: style.key }))}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        aiSettings.teachingStyle === style.key
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{style.label}</span>
                      <span className="text-xs text-zinc-500 mt-1">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature toggles */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest mb-4">Core Interactive Learning Modules</h3>
                
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Real-time Prompt Hints Mode</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Allows the AI Tutor to provide helpful clues before answering.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.hintMode} 
                    onChange={val => setAiSettings(prev => ({ ...prev, hintMode: val }))} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Step-by-Step Problem Solver</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">AI breaks down equations, physics calculations, and grammar rules recursively.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.stepByStep} 
                    onChange={val => setAiSettings(prev => ({ ...prev, stepByStep: val }))} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Adaptive Drill Generator</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Synthesizes customizable tests tailored directly to weakness parameters.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.practiceGenerator} 
                    onChange={val => setAiSettings(prev => ({ ...prev, practiceGenerator: val }))} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Automated Mistake Priority</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Pushes weak syllabus topics into highlight positions in your revision schedule.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.mistakeCorrection} 
                    onChange={val => setAiSettings(prev => ({ ...prev, mistakeCorrection: val }))} 
                  />
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('AI Tutor Configuration', aiSettings, 'edu_ai_settings')}
                    className="rounded-2xl bg-purple-600 hover:bg-purple-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save AI Profile Settings
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Bell className="w-7 h-7 text-cyan-400" /> Alert Center Configurations
                </h1>
                <p className="text-sm text-zinc-400">Control real-time and summary educational notifications across devices.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              {/* Notification List toggles */}
              <div className="space-y-4">
                {[
                  { key: 'aiAlerts', label: '🧠 AI Learning & Remedial Diagnosis', desc: 'Instant alerts on weak topics, mistake logs, and personalized remedial questions.' },
                  { key: 'studyReminders', label: '📅 Study Planner Schedules', desc: 'Timetable slots reminders, streak alarms, and schedule-slip notifications.' },
                  { key: 'examNotifs', label: '🧪 Exam & Test Updates', desc: 'Alerts for scheduled mock exams, WAEC diagnostic questions, and timed simulations.' },
                  { key: 'streakReminders', label: '🔥 Streak & Log Alerts', desc: 'Motivation, streaks about to break warnings, and daily study milestones.' },
                  { key: 'leaderboardUpdates', label: '⚔️ Competitive Arena Rivalry', desc: 'Get notified when a rival passes your rank, league upgrades, and challenges.' },
                  { key: 'rewardsAlerts', label: '🏆 Achievements & Badges Unlocked', desc: 'Instantly notify when you earn a badge, XP points milestones, or level peaks.' }
                ].map(notif => (
                  <div key={notif.key} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                    <div className="max-w-[70%]">
                      <h4 className="font-bold text-sm">{notif.label}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{notif.desc}</p>
                    </div>
                    <ToggleSwitch 
                      checked={(notificationSettings as any)[notif.key]} 
                      onChange={val => setNotificationSettings(prev => ({ ...prev, [notif.key]: val }))} 
                    />
                  </div>
                ))}
              </div>

              {/* Summary Frequency Setting */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Notification Frequency Period</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: 'instant', label: 'Live Notifications', desc: 'Notify instantly' },
                    { key: 'daily', label: 'Daily Briefing Summary', desc: 'Once a day' },
                    { key: 'weekly', label: 'Weekly Performance Digest', desc: 'Once a week' }
                  ].map(freq => (
                    <button
                      key={freq.key}
                      onClick={() => setNotificationSettings(prev => ({ ...prev, frequency: freq.key }))}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        notificationSettings.frequency === freq.key
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{freq.label}</span>
                      <span className="text-xs text-zinc-500 mt-1">{freq.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Notification Controls', notificationSettings, 'edu_notif_settings')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Notification Preferences
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'exams':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-emerald-400" /> Syllabus & Study Preferences
                </h1>
                <p className="text-sm text-zinc-400">Tailor subjects focus boundaries, study intensities, and prioritize weak topics.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              {/* Select Exam Type */}
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Target WAEC / JAMB / NECO Exam Type</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {['JAMB', 'WAEC', 'NECO'].map(exam => (
                    <button
                      key={exam}
                      onClick={() => {
                        setExamPreferences(prev => ({ ...prev, preferredExam: exam }));
                        setProfile(prev => ({ ...prev, examTarget: exam }));
                      }}
                      className={`p-3 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all ${
                        examPreferences.preferredExam === exam
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {exam} Exam Mode
                    </button>
                  ))}
                </div>
              </div>

              {/* Syllabus Focus Subjects */}
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Syllabus Focus Subjects Selection</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government'].map(subject => {
                    const isSelected = examPreferences.selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        onClick={() => {
                          setExamPreferences(prev => {
                            const current = prev.selectedSubjects;
                            const next = current.includes(subject)
                              ? current.filter(s => s !== subject)
                              : [...current, subject];
                            return { ...prev, selectedSubjects: next };
                          });
                        }}
                        className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-black'
                            : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weak topics priority */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Priority Weak Topics Injector</h4>
                  <p className="text-xs text-zinc-400">When enabled, AI automatically schedules weaker topics into active practice modules.</p>
                </div>
                <ToggleSwitch 
                  checked={examPreferences.weakTopicsPriority} 
                  onChange={val => setExamPreferences(prev => ({ ...prev, weakTopicsPriority: val }))} 
                />
              </div>

              {/* Study Mode Style */}
              <div className="space-y-3">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Study Planner Focus Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: 'fast', label: 'Fast Revision Intensity', desc: 'Focus on summary core hacks' },
                    { key: 'deep', label: 'Deep Concept Assimilation', desc: 'Paced, thorough study' },
                    { key: 'exam-focused', label: 'Full CBT Simulation', desc: 'Speed drills, past CBT sheets' }
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => setExamPreferences(prev => ({ ...prev, studyMode: mode.key }))}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        examPreferences.studyMode === mode.key
                          ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{mode.label}</span>
                      <span className="text-xs text-zinc-500 mt-1">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Exam & Study Settings', examPreferences, 'edu_exam_prefs')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Preferences
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'gamification':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Trophy className="w-7 h-7 text-amber-400" /> Gamification & Rewards Options
                </h1>
                <p className="text-sm text-zinc-400">Control learning milestones, streak mechanisms, and public arena leaderboards.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Enable XP Score metrics</h4>
                  <p className="text-xs text-zinc-400">Tracks score gains and allocates multipliers during active subject evaluation.</p>
                </div>
                <ToggleSwitch 
                  checked={gamificationSettings.showXP} 
                  onChange={val => setGamificationSettings(prev => ({ ...prev, showXP: val }))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Leaderboard Competitive Visibility</h4>
                  <p className="text-xs text-zinc-400">Allows other candidates across West Africa to observe your exam percentile.</p>
                </div>
                <ToggleSwitch 
                  checked={gamificationSettings.leaderboardVisible} 
                  onChange={val => setGamificationSettings(prev => ({ ...prev, leaderboardVisible: val }))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Medal Badge achievements display</h4>
                  <p className="text-xs text-zinc-400">Showcases earned milestones and badges directly inside the Arena interface.</p>
                </div>
                <ToggleSwitch 
                  checked={gamificationSettings.badgeDisplay} 
                  onChange={val => setGamificationSettings(prev => ({ ...prev, badgeDisplay: val }))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Daily Streak Tracker</h4>
                  <p className="text-xs text-zinc-400">Enforces daily revision streaks and provides consecutive day bonuses on active tasks.</p>
                </div>
                <ToggleSwitch 
                  checked={gamificationSettings.streakTracking} 
                  onChange={val => setGamificationSettings(prev => ({ ...prev, streakTracking: val }))} 
                />
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Gamification Controls', gamificationSettings, 'edu_game_settings')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Rewards Settings
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Lock className="w-7 h-7 text-indigo-400" /> Account Security & Privacy Controls
                </h1>
                <p className="text-sm text-zinc-400">Manage interactive sessions, data accessibility and extra protection parameters.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Two-Factor Authentication (2FA) protection</h4>
                  <p className="text-xs text-zinc-400">Verifies your identity on profile switches or history purges.</p>
                </div>
                <ToggleSwitch 
                  checked={privacySettings.twoFactor} 
                  onChange={val => setPrivacySettings(prev => ({ ...prev, twoFactor: val }))} 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                <div className="max-w-[70%]">
                  <h4 className="font-bold text-sm">Student Telemetry Diagnostics</h4>
                  <p className="text-xs text-zinc-400">Records dynamic feedback parameters, speed metrics, and error rates to adjust AI recommendations.</p>
                </div>
                <ToggleSwitch 
                  checked={privacySettings.analyticsEnabled} 
                  onChange={val => setPrivacySettings(prev => ({ ...prev, analyticsEnabled: val }))} 
                />
              </div>

              {/* Active Login Sessions list */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Active Device Sessions</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 rounded bg-cyan-400 self-stretch" />
                      <div>
                        <p className="font-bold text-sm">Google Chrome • Lagos, Nigeria</p>
                        <p className="text-xs text-zinc-500">Current Session (This Device)</p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono font-bold">ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-zinc-950/40 opacity-70 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 rounded bg-zinc-700 self-stretch" />
                      <div>
                        <p className="font-bold text-sm">Infinix Hot 12 • Ibadan, Nigeria</p>
                        <p className="text-xs text-zinc-500">Last seen 3 days ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="text-xs text-rose-500 hover:text-rose-400 rounded-xl">Revoke session</Button>
                  </div>
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Security Controls', privacySettings, 'edu_privacy_settings')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Security Profile
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Eye className="w-7 h-7 text-cyan-400" /> Platform Visual Styling & Themes
                </h1>
                <p className="text-sm text-zinc-400">Design the CBT board presentation level, color accents and text boundaries.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              {/* Color Schemes */}
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Active Theme Presets</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'dark-cyber', label: 'Dark Cyberpunk', desc: 'Neon cyan elements', style: 'from-cyan-900 to-zinc-950' },
                    { key: 'cosmic-purple', label: 'Cosmic Purple Accent', desc: 'Grape highlights', style: 'from-purple-900 to-zinc-950' },
                    { key: 'midnight-zinc', label: 'Classic Swiss Charcoal', desc: 'Neutral monochrome aesthetics', style: 'from-zinc-900 to-zinc-950' }
                  ].map(themeItem => (
                    <button
                      key={themeItem.key}
                      onClick={() => {
                        setAppearance(prev => ({ ...prev, theme: themeItem.key }));
                        toast.success(`Theme switched to: ${themeItem.label}.`);
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden h-32 ${
                        appearance.theme === themeItem.key
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-black'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${themeItem.style} opacity-40 blur-lg rounded-full transform translate-x-4 -translate-y-4`} />
                      <span className="font-extrabold text-sm relative z-10">{themeItem.label}</span>
                      <span className="text-xs text-zinc-500 relative z-10">{themeItem.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text sizes */}
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">UI Scale / Typography size</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'small', label: 'Small Dense Text', desc: 'Compact screen layouts' },
                    { key: 'medium', label: 'Standard Human Scale', desc: 'Default readable spacing' },
                    { key: 'large', label: 'Large Accessibility', desc: 'Magnified presentation text' }
                  ].map(fontScale => (
                    <button
                      key={fontScale.key}
                      onClick={() => setAppearance(prev => ({ ...prev, fontSize: fontScale.key }))}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        appearance.fontSize === fontScale.key
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <span className="font-extrabold text-sm">{fontScale.label}</span>
                      <span className="text-xs text-zinc-500 mt-1">{fontScale.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('Visual Styling', appearance, 'edu_appearance')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Appearance
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Database className="w-7 h-7 text-indigo-400" /> Platform data & AI Memory settings
                </h1>
                <p className="text-sm text-zinc-400">Instruct key memory components, download study backup logs and control cognitive telemetry.</p>
              </div>
            )}

            <Card className="bg-zinc-900 border-white/10 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">AI Tutor long-term memory sync</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Allows the AI Tutor to track weak chapters over multi-week study intervals.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.rememberWeakTopics} 
                    onChange={val => setAiSettings(prev => ({ ...prev, rememberWeakTopics: val }))} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Mistake pattern matching tracking</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Retains mathematical logic errors to formulate diagnostic personalized questions.</p>
                  </div>
                  <ToggleSwitch 
                    checked={aiSettings.trackMistakes} 
                    onChange={val => setAiSettings(prev => ({ ...prev, trackMistakes: val }))} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-white/5">
                  <div className="max-w-[70%]">
                    <h4 className="font-bold text-sm">Allow AI Personalization algorithm heuristics</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Adapt CBT timers and syllabus recommendations automatically based on student speeds.</p>
                  </div>
                  <ToggleSwitch 
                    checked={privacySettings.aiPersonalization} 
                    onChange={val => setPrivacySettings(prev => ({ ...prev, aiPersonalization: val }))} 
                  />
                </div>
              </div>

              {/* Database memory metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 text-white"><Cpu className="w-4 h-4 text-purple-400" /> Reset AI Memory cache</h4>
                    <p className="text-xs text-zinc-500 mt-1">Invalidates student behavioral caches. The AI tutor models revert back to standard WAEC/JAMB syllabus defaults.</p>
                  </div>
                  <Button onClick={resetAIMemory} variant="outline" className="rounded-xl border-purple-500/20 text-purple-400 bg-purple-950/10 hover:bg-purple-950/20 w-fit self-start py-2.5 h-10 text-xs font-bold">
                    <RefreshCw className="w-4 h-4 mr-2" /> Reset AI Memory
                  </Button>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2 text-white"><Download className="w-4 h-4 text-cyan-400" /> Export JSON Study backup</h4>
                    <p className="text-xs text-zinc-500 mt-1">Acquire an offline export containing all academic streaks, study records, and custom syllabus trackers.</p>
                  </div>
                  <Button onClick={downloadPersonalData} variant="outline" className="rounded-xl border-cyan-500/20 text-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/20 w-fit self-start py-2.5 h-10 text-xs font-bold">
                    <Download className="w-4 h-4 mr-2" /> Export Backup
                  </Button>
                </div>
              </div>

              {!isMobile && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSave('AI Memory Preferences', privacySettings, 'edu_privacy_settings')}
                    className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-6 px-6 font-bold flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save Preferences
                  </Button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            {!isMobile && (
              <div>
                <h1 className="text-2xl font-black text-rose-500 flex items-center gap-2">
                  <ShieldAlert className="w-7 h-7" /> System Danger Zone
                </h1>
                <p className="text-sm text-zinc-400">Irreversible, dangerous operations. Execute with caution.</p>
              </div>
            )}

            <Card className="bg-rose-950/10 border-rose-500/20 p-5 sm:p-6 md:p-8 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-zinc-950 rounded-2xl border border-rose-500/10">
                <div className="max-w-md">
                  <h4 className="font-extrabold text-sm text-rose-400">Wipe Performance History Data</h4>
                  <p className="text-xs text-zinc-400 mt-1">Clears all WAEC, JAMB, and NECO results, study streaks, and AI accuracy telemetry records.</p>
                </div>
                <Button onClick={resetProgress} variant="destructive" className="rounded-xl bg-rose-600 hover:bg-rose-500 font-bold px-4 py-3 h-11 text-xs sm:text-sm">
                  <Trash2 className="w-4 h-4 mr-2 animate-pulse" /> Wipe History
                </Button>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-zinc-950 rounded-2xl border border-rose-500/10">
                <div className="max-w-md">
                  <h4 className="font-extrabold text-sm text-rose-400">Purge Student Account</h4>
                  <p className="text-xs text-zinc-400 mt-1">Permanently deactivates current Guest session indices and clears cached database tokens.</p>
                </div>
                <Button onClick={() => toast.error("Please contact your CBT platform administrator to authorize account purge.")} variant="destructive" className="rounded-xl bg-rose-900 hover:bg-rose-800 font-bold px-4 py-3 h-11 text-xs sm:text-sm">
                  Purge Profile Indices
                </Button>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const activeAccordionTabObj = tabs.find(t => t.id === expandedMobileTab);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-4rem)] flex flex-col relative">
      
      {/* 1. DESKTOP/TABLET TWO-COLUMNS PANEL */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Sidebar tabs list */}
        <aside className="w-72 border-r border-white/10 bg-zinc-900/40 p-6 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
              <h2 className="font-black text-xl tracking-tight">CBT System Control</h2>
            </div>
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${tab.color}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
            <p className="text-xs text-zinc-500 font-mono font-medium block">Cloud Sync Integration</p>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-300">FULLY OPERATIONAL</span>
            </div>
          </div>
        </aside>

        {/* Content detail right viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl space-y-8 pb-12"
            >
              {renderPanelContent(activeTab, false)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 2. MOBILE RESPONSIVE ACCORDION SYSTEM COLLAPSED STACK */}
      <div className="md:hidden flex-1 p-4 space-y-3 pb-24">
        <div className="pb-2">
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-cyan-400" /> Student Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Configure your personal AI coach, notifications, and syllabus focuses.</p>
        </div>

        <div className="space-y-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isExpanded = expandedMobileTab === tab.id;

            return (
              <div 
                key={tab.id} 
                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  isExpanded 
                    ? 'border-cyan-500 bg-zinc-900 shadow-md shadow-cyan-500/5' 
                    : 'border-white/5 bg-zinc-900/50'
                }`}
              >
                {/* Accordion Header row */}
                <button
                  onClick={() => setExpandedMobileTab(isExpanded ? null : tab.id)}
                  className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-950 rounded-xl border border-white/5">
                      <Icon className={`w-4 h-4 ${tab.color}`} />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-zinc-200 block">{tab.label}</span>
                      {tab.id === 'profile' && (
                        <span className="text-[10px] text-zinc-500 font-mono">Exam Goal: {profile.examTarget}</span>
                      )}
                      {tab.id === 'ai' && (
                        <span className="text-[10px] text-zinc-500 font-mono">Style: {aiSettings.teachingStyle}</span>
                      )}
                      {tab.id === 'exams' && (
                        <span className="text-[10px] text-zinc-500 font-mono">{examPreferences.selectedSubjects.length} subjects focus</span>
                      )}
                    </div>
                  </div>
                  <div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Body Content element */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-3 bg-zinc-950/60">
                        {renderPanelContent(tab.id, true)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. STICKY MOBILE SAVE TRIGGER ROW */}
      {expandedMobileTab && expandedMobileTab !== 'danger' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 border-t border-white/10 backdrop-blur-md z-40 flex justify-between items-center bg-opacity-95 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-zinc-400 font-mono">Modifying:</span>
            <span className="font-black text-white">{activeAccordionTabObj?.label}</span>
          </div>

          <Button
            onClick={() => handleSaveForTab(expandedMobileTab)}
            className="bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/20 animate-pulse"
          >
            <Save className="w-4 h-4" /> Save {activeAccordionTabObj?.label?.split(' ')[1] || 'Settings'}
          </Button>
        </div>
      )}

    </div>
  );
}
