import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import api from '../api/client';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';

const placeholder = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="#fdf2f8" width="600" height="400"/><text x="300" y="200" text-anchor="middle" font-family="system-ui" font-size="18" fill="#f9a8d4">Blog Cover</text></svg>`
);

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/blog?limit=20')
      .then(r => { setPosts(r.data.data.posts); setTotal(r.data.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Blog" path="/blog" description="Parenting tips, baby care guides, and product reviews from LITTORA. Expert advice for new parents." />
      <PageHero backgroundImage="/images/hero/hero-blog.jpg" headline="Tips & Guides" subtitle="Helpful advice for Sri Lankan parents" focusPoint="center 40%" />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <span className="mb-4 text-5xl">📝</span>
            <h3 className="text-lg font-semibold text-slate-700">No posts yet</h3>
            <p className="mt-1 text-sm text-slate-500">Check back soon for parenting tips and guides</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="aspect-video overflow-hidden bg-slate-50">
                    <img
                      src={post.cover_image || placeholder}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>&middot;</span>
                      <span>{post.read_time_min} min read</span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
