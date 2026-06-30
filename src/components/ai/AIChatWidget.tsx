import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAIStore, Message } from '@/src/store/useAIStore';
import { aiRouter } from '@/src/lib/aiRouter';
import { Send, Bot, X, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function AIChatWidget() {
  const { isChatOpen, toggleChat, messages, addMessage } = useAIStore();

  const [input,     setInput]     = useState('');
  const [isTyping,  setIsTyping]  = useState(false);

  const endRef        = useRef<HTMLDivElement>(null);
  const msgCounterRef = useRef(0); // guaranteed unique IDs

  // Seed welcome message on first open
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      addMessage({
        id:        `msg-${++msgCounterRef.current}-welcome`,
        sender:    'tutor',
        text:      "E don set! I'm Tutor Chuks. Ask me anything about your WAEC, JAMB, or NECO prep — I dey here for you! 🎓",
        timestamp: Date.now(),
      });
    }
  }, [isChatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll only when messages change, not on open/close
  useEffect(() => {
    if (isChatOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    // Block if input is empty or if typing is in progress
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id:        `msg-${++msgCounterRef.current}-student`,
      sender:    'student',
      text:      input.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    setInput('');
    setIsTyping(true);

    // try/catch/finally so isTyping always resets on error
    try {
      const res = await aiRouter.askTutorChuks(userMsg.text, messages);
      addMessage({
        id:        `msg-${++msgCounterRef.current}-tutor`,
        sender:    'tutor',
        text:      res.answer,
        source:    res.source,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error('[AIChatWidget] handleSend failed:', err);
      addMessage({
        id:        `msg-${++msgCounterRef.current}-error`,
        sender:    'tutor',
        text:      'Omo, my connection had a hiccup! Try again shortly.',
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false); // always clears
    }
  };

  return (
    <>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-[400px] h-[550px] z-50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)] border border-white/10 bg-slate-950 flex flex-col font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900/40 to-slate-900/80 p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 relative">
                  <div className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full animate-pulse" />
                  <Bot className="w-5 h-5 text-cyan-400 relative z-10" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm tracking-wide">Tutor Chuks</h3>
                  <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Online & Monitoring
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                aria-label="Close chat"
                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${
                    msg.sender === 'student'
                      ? 'bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Source badge */}
                  {msg.source && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 shadow-inner">
                      <BookOpen className="w-3.5 h-3.5" /> Source: {msg.source}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-600 mt-1 select-none">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold bg-slate-900 w-fit px-4 py-2.5 rounded-xl border border-white/5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Searching Knowledge Base (RAG)...
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-slate-950/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    // Skip IME composition events
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      handleSend();
                    }
                  }}
                  placeholder="Ask a question..."
                  className="bg-black/50 border-white/10 focus-visible:ring-cyan-500/50 text-white placeholder:text-slate-500 rounded-xl h-12"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl h-12 w-12 p-0 shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-40"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        onClick={toggleChat}
        aria-label={isChatOpen ? 'Close Tutor Chuks chat' : 'Open Tutor Chuks chat'}
        aria-expanded={isChatOpen}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_40px_rgba(34,211,238,0.5)] flex items-center justify-center z-50 text-white border-2 border-cyan-200/30 hover:scale-110 transition-transform"
      >
        <Bot className="w-7 h-7" />
      </motion.button>
    </>
  );
}

