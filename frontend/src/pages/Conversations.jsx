import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import PageWrapper, { fadeUp } from '../components/PageWrapper';

const CHANNEL_ICONS = {
  whatsapp: { emoji: '💬', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  instagram: { emoji: '📸', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  messenger: { emoji: '💙', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  simulator: { emoji: '🤖', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  web: { emoji: '🌐', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

const PROVIDER_BADGES = {
  pattern_matcher: { label: 'DB', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  gemini: { label: 'Gemini', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  claude: { label: 'Claude', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  fallback: { label: 'Fallback', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  owner: { label: 'You', color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function ProductSearchPopup({ conversationId, onClose, onSent }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await client.get(`/chatbot/products/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.data || []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const send = async (variant) => {
    setSendingId(variant.variant_id);
    try {
      await client.post(`/chatbot/conversations/${conversationId}/send-product-image`, { variant_id: variant.variant_id });
      onSent();
      onClose();
    } catch { /* ignore */ }
    setSendingId(null);
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {searching && <p className="p-3 text-center text-xs text-slate-400">Searching...</p>}
        {!searching && query.length >= 2 && results.length === 0 && (
          <p className="p-3 text-center text-xs text-slate-400">No products with images found</p>
        )}
        {results.map(r => (
          <button
            key={r.variant_id}
            onClick={() => send(r)}
            disabled={sendingId === r.variant_id}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {r.image_url && (
              <img src={r.image_url.startsWith('http') ? r.image_url : `${r.image_url}`} className="h-10 w-10 rounded-lg object-cover" alt="" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{r.name}</p>
              <p className="text-xs text-slate-500">{r.variant_label} · Rs. {Number(r.retail_price).toLocaleString()}</p>
            </div>
            {sendingId === r.variant_id ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            ) : (
              <span className="text-lg">📤</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await client.get('/chatbot/conversations');
      setConversations(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const res = await client.get(`/chatbot/conversations/${id}`);
      setDetail(res.data.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    fetchList();
    const interval = setInterval(fetchList, 10000);
    return () => clearInterval(interval);
  }, [fetchList]);

  useEffect(() => {
    if (selected) {
      fetchDetail(selected);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchDetail(selected), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, fetchDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || !selected) return;
    setSending(true);
    try {
      await client.post(`/chatbot/conversations/${selected}/message`, { message: text });
      setReplyText('');
      await fetchDetail(selected);
      await fetchList();
    } catch { /* ignore */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleTakeover = async () => {
    if (!detail) return;
    const next = !detail.conversation.owner_takeover;
    try {
      await client.put(`/chatbot/conversations/${selected}/takeover`, { takeover: next });
      await fetchDetail(selected);
      await fetchList();
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append('image', file);
      await client.post(`/chatbot/conversations/${selected}/send-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchDetail(selected);
      await fetchList();
    } catch { /* ignore */ }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const refreshAfterMedia = async () => {
    await fetchDetail(selected);
    await fetchList();
  };

  const conv = detail?.conversation;
  const messages = detail?.messages || [];
  const isTakeover = conv?.owner_takeover;

  return (
    <PageWrapper className="h-full">
      <div className="flex h-full">
        {/* ──── Conversation List ──── */}
        <div className={`flex w-full flex-col border-r border-slate-200 dark:border-slate-800 lg:w-[380px] ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Conversations</h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {conversations.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <span className="mb-3 text-4xl">💬</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-500">When customers message Liya, conversations will appear here</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map(c => {
                const ch = CHANNEL_ICONS[c.channel] || CHANNEL_ICONS.simulator;
                const isActive = selected === c.id;
                const isCustomerLast = c.last_sender === 'customer';
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors dark:border-slate-800 ${
                      isActive ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${ch.color}`}>
                      {ch.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {c.customer_name || c.customer_phone || c.channel_user_id || 'Unknown'}
                        </span>
                        {c.owner_takeover === 1 && (
                          <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">MANUAL</span>
                        )}
                      </div>
                      <p className={`mt-0.5 truncate text-xs ${isCustomerLast ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                        {isCustomerLast ? '' : '🤖 '}{truncate(c.last_message, 50)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{timeAgo(c.last_message_at)}</span>
                        <span>·</span>
                        <span>{c.message_count} msgs</span>
                        <span>·</span>
                        <span className="capitalize">{c.channel}</span>
                      </div>
                    </div>
                    {isCustomerLast && (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ──── Chat Detail ──── */}
        <div className={`flex flex-1 flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="mb-3 text-5xl">🤖</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-500">Choose a chat on the left to view the thread</p>
            </div>
          ) : detailLoading && !detail ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {conv?.customer_name || conv?.customer_phone || conv?.channel_user_id || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {conv?.channel} · {conv?.status} · {messages.length} messages
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleTakeover}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    conv?.owner_takeover
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {conv?.owner_takeover ? '🤖 Hand Back to Liya' : '✋ Take Over'}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map(msg => {
                  const isCustomer = msg.sender === 'customer';
                  const isOwner = msg.sender === 'owner';
                  const provider = PROVIDER_BADGES[msg.handled_by];
                  const isImage = msg.message_type === 'image' && msg.image_url;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isCustomer
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                          : isOwner
                            ? 'bg-brand-600 text-white'
                            : 'bg-emerald-50 text-slate-900 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-100 dark:ring-emerald-800'
                      }`}>
                        {isImage && (
                          <img
                            src={msg.image_url}
                            alt=""
                            className="mb-2 max-h-48 rounded-xl object-cover cursor-pointer"
                            onClick={() => window.open(msg.image_url, '_blank')}
                          />
                        )}
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <div className={`mt-1 flex items-center gap-2 text-[10px] ${
                          isCustomer ? 'text-slate-400' : isOwner ? 'text-white/60' : 'text-emerald-600/60 dark:text-emerald-400/60'
                        }`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</span>
                          {provider && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${provider.color}`}>
                              {provider.label}
                            </span>
                          )}
                          {msg.response_time_ms > 0 && (
                            <span>{msg.response_time_ms}ms</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input with Media Buttons */}
              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                {isTakeover && (
                  <div className="relative mb-2 flex items-center gap-1">
                    <button
                      onClick={() => setShowProductSearch(!showProductSearch)}
                      title="Send product image"
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >📷</button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload & send image"
                      disabled={uploadingFile}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >{uploadingFile ? '⏳' : '📎'}</button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <AnimatePresence>
                      {showProductSearch && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowProductSearch(false)} />
                          <ProductSearchPopup
                            conversationId={selected}
                            onClose={() => setShowProductSearch(false)}
                            onSent={refreshAfterMedia}
                          />
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={isTakeover ? 'Type a reply (manual mode)…' : 'Take over to reply manually…'}
                    disabled={!isTakeover}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!isTakeover || !replyText.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  </button>
                </div>
                {!isTakeover && (
                  <p className="mt-1.5 text-[11px] text-slate-400">Liya is handling this conversation. Click "Take Over" to reply manually.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
