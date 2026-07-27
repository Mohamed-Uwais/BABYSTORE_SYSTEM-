import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const api = axios.create({ baseURL: '/api/public' });

function getSessionId() {
  let id = localStorage.getItem('liya_session');
  if (!id) {
    id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('liya_session', id);
  }
  return id;
}

function getSavedMessages() {
  try {
    const raw = sessionStorage.getItem('liya_messages');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(getSavedMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open) {
      setShowPulse(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem('liya_messages', JSON.stringify(messages.slice(-50)));
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text || sending) return;
    setInput('');
    setSending(true);

    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);

    try {
      const res = await api.post('/chat', { message: text, session_id: sessionId.current });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply, images: res.data.images || [], ts: Date.now() }]);
      if (res.data.session_id) sessionId.current = res.data.session_id;
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again!", ts: Date.now() }]);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [sending]);

  const send = useCallback(() => sendMessage(input.trim()), [input, sendMessage]);

  const greeting = messages.length === 0;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-16 right-0 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🤖</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Liya</p>
                <p className="text-[11px] text-white/70">Your shopping assistant</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {greeting && (
                <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:bg-primary-900/20 dark:text-primary-200">
                  <p className="font-semibold">Hi there! 👋</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">I'm Liya, your Littora shopping assistant. Ask me about products, prices, delivery, or track your order!</p>
                </div>
              )}
              {greeting && (
                <div className="flex flex-wrap gap-1.5">
                  {['What products do you have?', 'Delivery fees', 'Track my order'].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-full border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-400 dark:hover:bg-primary-900/30"
                    >{q}</button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.images?.length > 0 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {msg.images.map((url, j) => (
                          <img key={j} src={url} alt="" className="h-20 w-20 rounded-lg object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 px-3 py-2.5 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask Liya anything..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-110 hover:bg-primary-700 active:scale-95"
      >
        {showPulse && !open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-40" />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.svg key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="relative h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></motion.svg>
          ) : (
            <motion.svg key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></motion.svg>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
