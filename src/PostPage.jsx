import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { useHead } from './lib/useHead';

// Helper for building absolute URLs
const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

function stripHtml(html = '') {
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}
function truncate(s = '', n = 160) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

export default function PostPage({ slug, onBack }) {
  const { setTitle, upsertMeta, setLink, setJsonLd } = useHead();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('cms_posts')
          .select('id, slug, title, excerpt, author, cover_url, content_html, published, published_at, updated_at')
          .eq('slug', slug)
          .single();
        if (error) throw error;
        if (!alive) return;
        setPost(data);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Post nicht gefunden');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // SEO head updates when post is available
  useEffect(() => {
    if (!post) return;
    const title = `${post.title} – Coach Milo`;
    const desc = truncate(post.excerpt || stripHtml(post.content_html || 'Individuelle Trainingspläne mit Coach Milo.'), 180);
    const url = `${SITE_URL}/blog/${post.slug}`;
    const img = post.cover_url || undefined;

    setTitle(title);
    upsertMeta('name', 'description', desc);
    setLink('canonical', url);
    // Open Graph
    upsertMeta('property', 'og:type', 'article');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    if (img) upsertMeta('property', 'og:image', img);
    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    if (img) upsertMeta('name', 'twitter:image', img);
    // JSON-LD
    setJsonLd('ld-blogpost', {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: desc,
      image: img ? [img] : undefined,
      datePublished: post.published_at || undefined,
      dateModified: post.updated_at || post.published_at || undefined,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'Coach Milo' },
      publisher: {
        '@type': 'Organization',
        name: 'Coach Milo',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/apple-touch-icon.png` },
      },
    });
  }, [post]);

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8">
        <p className="text-white/70">Lade…</p>
      </section>
    );
  }
  if (error || !post) {
    return (
      <section className="py-12 px-4 md:px-8">
        <p className="text-red-300">{error || 'Post nicht gefunden.'}</p>
        <button className="mt-4 text-brand" onClick={onBack}>Zurück</button>
      </section>
    );
  }

  return (
    <article className="py-12 px-4 md:px-8 max-w-3xl mx-auto">
      <button className="text-brand mb-4" onClick={onBack}>← Zurück</button>
      <h1 className="text-3xl md:text-4xl font-semibold text-white">{post.title}</h1>
      {post.published_at && (
        <p className="text-white/50 text-sm mt-1">{new Date(post.published_at).toLocaleDateString()}</p>
      )}

      {post.cover_url && (
        <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-black">
          <img
            src={post.cover_url}
            alt="Cover"
            loading="lazy"
            className="w-full h-auto object-contain block"
          />
        </div>
      )}


      {post.excerpt && (
        <p className="mt-6 text-white/80 text-lg">{post.excerpt}</p>
      )}

      {post.content_html && (
        <div className="prose prose-invert max-w-none mt-6" dangerouslySetInnerHTML={{ __html: post.content_html }} />
      )}
    </article>
  );
}
