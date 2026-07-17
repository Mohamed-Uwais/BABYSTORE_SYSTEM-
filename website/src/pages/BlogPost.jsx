import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, Loader2 } from 'lucide-react';
import api from '../api/client';
import SEO from '../components/SEO';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/blog/${slug}`)
      .then(r => setPost(r.data.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="mb-4 text-5xl">📝</span>
        <h2 className="text-xl font-bold text-slate-800">Post Not Found</h2>
        <Link to="/blog" className="mt-6 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO
        title={post.title}
        path={`/blog/${post.slug}`}
        description={post.meta_description || post.excerpt}
        type="article"
        image={post.cover_image}
      />
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link to="/blog" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600">
            <ChevronLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="mb-8 aspect-video w-full rounded-2xl object-cover shadow-sm"
          />
        )}

        <div className="mb-6 flex items-center gap-3 text-sm text-slate-400">
          <span>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>&middot;</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.read_time_min} min read</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl leading-tight">{post.title}</h1>

        <div
          className="prose prose-slate mt-8 max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-primary-600 prose-strong:text-slate-800"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-12 rounded-2xl bg-primary-50 p-6 text-center">
          <p className="text-sm font-medium text-primary-800">Looking for baby products mentioned in this article?</p>
          <Link
            to="/shop"
            className="mt-3 inline-block rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Shop Now
          </Link>
        </div>
      </article>
    </motion.div>
  );
}
