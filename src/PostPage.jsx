// src/PostPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

/** Kleine UI-Helfer wie in App.jsx */
const Container = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">{children}</div>
);
const Section = ({ title, subtitle, children }) => (
  <section className="py-12 md:py-16">
    <Container>
      {title && <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">{title}</h2>}
      {subtitle && <p className="text-white/70 mb-6 max-w-3xl">{subtitle}</p>}
      {children}
    </Container>
  </section>
);
const Card = ({ children }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-5">
    {children}
  </div>
);
const Button = ({ children, onClick, variant="primary", type="button", className="" }) => {
  const base =
    "inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm transition outline-none appearance-none focus:ring-2";
  const st =
    variant === "primary"
      ? "bg-[#ff9a3e] text-black hover:bg-[#ff8a1e] focus:ring-[#ff9a3e] border border-[rgba(255,154,62,0.2)]"
      : variant === "ghost"
      ? "bg-transparent text-white/70 hover:text-white"
      : "text-white border border-white/20 hover:bg-white/10";
  return (
    <button type={type} onClick={onClick} className={`${base} ${st} ${className}`}>
      {children}
    </button>
  );
};

export default function PostPage({ slug, onBack }) {
  const [post, setPost] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      setState({ loading: true, error: "" });
      try {
        const { data, error } = await supabase
          .from("cms_posts")
          .select("id, slug, title, excerpt, cover_url, content_html, author, published_at")
          .eq("slug", slug)
          .eq("published", true)
          .single();
        if (error) throw error;
        if (!alive) return;
        setPost(data);
        setState({ loading: false, error: "" });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, error: e?.message || "Nicht gefunden" });
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  // Fallback, falls content_html mal Plaintext/Markdown ist
  function toReadableHtml(src = "") {
    const raw = String(src).trim();
    const looksLikeHtml = /<\s*[a-z][\s\S]*>/i.test(raw);
    if (looksLikeHtml) return raw;
    const withHeads = raw
      .replace(/^###\s*(.+)$/gm, "<h3>$1</h3>")
      .replace(/^##\s*(.+)$/gm, "<h2>$1</h2>")
      .replace(/^#\s*(.+)$/gm, "<h1>$1</h1>");
    const paragraphs = withHeads
      .split(/\n{2,}/).map((p) => p.replace(/\n+/g, " ").trim()).filter(Boolean);
    return paragraphs.map((p) => `<p>${p}</p>`).join("");
  }

  return (
    <Section>
      <div className="mb-4">
        <Button variant="ghost" onClick={onBack}>← Zurück zum Blog</Button>
      </div>

      {state.loading && <p className="text-white/70">Lade Artikel…</p>}

      {!state.loading && state.error && (
        <Card><p className="text-red-300 text-sm">Fehler: {state.error}</p></Card>
      )}

      {!state.loading && !state.error && post && (
        <article className="space-y-4">
          {/* Gemeinsamer Content-Wrapper: gleiche Breite, LINKS bündig (kein mx-auto!) */}
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-semibold text-white">{post.title}</h1>

            <div className="text-white/50 text-sm">
              {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
              {post.author ? ` • ${post.author}` : ""}
            </div>

            {post.excerpt && <p className="text-white/70">{post.excerpt}</p>}

            {post.cover_url && (
              <img
                src={post.cover_url}
                alt="Cover"
                className="w-full h-auto rounded-2xl border border-white/10 shadow-lg my-2 object-contain max-h-[70vh]"
                loading="lazy"
              />
            )}

            <div
              className="prose prose-invert md:prose-lg prose-a:text-brand hover:prose-a:text-orange-200 prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: toReadableHtml(post.content_html || "") }}
            />
          </div>
        </article>
      )}
    </Section>
  );
}
