import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, MessageCircle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../api/client';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/contact', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Contact" path="/contact" description="Get in touch with Littora Diapers. Call, email, or WhatsApp us for product inquiries, order support, or wholesale information." />
      <PageHero backgroundImage="/images/hero/hero-contact.jpg" headline="Get in Touch" subtitle="We're here to help — chat, call, or visit us" focusPoint="center 30%" />

      <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Contact info */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
            <p className="mt-2 text-sm text-slate-500">Feel free to reach out through any of these channels</p>

            <div className="mt-8 space-y-6">
              {[
                { icon: MapPin, title: 'Visit Us', lines: ['Colombo, Sri Lanka'] },
                { icon: Phone, title: 'Call Us', lines: ['+94 77 123 4567'] },
                { icon: Mail, title: 'Email Us', lines: ['hello@littoradiapers.com'] },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    {item.lines.map((line, j) => <p key={j} className="text-sm text-slate-500">{line}</p>)}
                  </div>
                </div>
              ))}
            </div>

            <a
              href="https://wa.me/94771234567?text=Hi!%20I%20have%20a%20question"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-600"
            >
              <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
            </a>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-emerald-50 p-12 text-center"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <h3 className="mt-4 text-lg font-bold text-emerald-800">Message Sent!</h3>
                <p className="mt-2 text-sm text-emerald-600">We'll get back to you as soon as possible.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Send a Message</h3>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => updateForm('phone', e.target.value)}
                        placeholder="077 123 4567"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => updateForm('email', e.target.value)}
                        placeholder="you@email.com"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Message *</label>
                    <textarea
                      value={form.message}
                      onChange={e => updateForm('message', e.target.value)}
                      placeholder="How can we help you?"
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.name.trim() || !form.message.trim()}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
