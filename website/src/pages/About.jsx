import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Truck, Users, Star, MessageCircle } from 'lucide-react';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';

export default function About() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="About" path="/about" description="Learn about LITTORA — Sri Lanka's specialist in diapers, wet wipes, and trending baby items. Better prices, faster delivery, always in stock." />
      <PageHero backgroundImage="/images/hero/hero-about.jpg" headline="Our Story" subtitle="Why thousands of parents trust Littora" focusPoint="center center" />

      {/* Story */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Our Story</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                LITTORA was born from a simple observation — Sri Lankan parents were paying too much for diapers and wipes. We decided to change that by offering genuine brands at better prices with faster delivery.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                We carefully source authentic products from trusted brands like Pampers, Huggies, MamyPoko, Pigeon, and Johnson's, ensuring every item meets the highest quality standards.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                With island-wide delivery and responsive WhatsApp support, we're making baby shopping easier and more convenient for families across Sri Lanka.
              </p>
            </div>
            <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-accent-100 p-12">
              <span className="text-8xl">👶🍼</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Why Parents Trust Us</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShieldCheck, title: '100% Authentic', desc: 'Every product is sourced directly from authorized distributors — no fakes, ever.' },
              { icon: Heart, title: 'Parent-First', desc: 'We prioritize your baby\'s comfort and safety above everything else.' },
              { icon: Truck, title: 'Island-wide Delivery', desc: 'From Colombo to Jaffna, we deliver everywhere in Sri Lanka.' },
              { icon: Star, title: 'Best Prices', desc: 'Competitive pricing with regular discounts and bundle deals.' },
              { icon: Users, title: 'Community', desc: 'Join thousands of happy parents who shop with us regularly.' },
              { icon: MessageCircle, title: '24/7 Support', desc: 'Chat with us anytime on WhatsApp for help or product advice.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-100 p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Ready to Shop?</h2>
          <p className="mt-2 text-sm text-slate-500">Browse our collection of diapers, wet wipes, and trending items</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/shop" className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg">
              Browse Products
            </Link>
            <Link to="/contact" className="rounded-2xl border-2 border-slate-200 px-8 py-3 text-sm font-semibold text-slate-600 hover:border-primary-300">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
