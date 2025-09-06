import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { AuthProvider, useAuth } from "./lib/auth";
import PostPage from "./PostPage";

/* =============================================================
   Coach Milo – App.jsx (vollständig)
   - Public: Features & FAQs aus Supabase (Fallback aktiv)
   - Admin: Tabs (Beiträge | Features | FAQ | Einstellungen)
   - Einstellungen: Hero-Bild (inline/url) inkl. Upload in cms_images
   - Bewahrt Dark/Orange-Style (Tailwind)
============================================================= */

/* ---------- UI/Infrastructure ---------- */
const Container = ({ children }) => (
  <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">{children}</div>
);
const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
    {children}
  </span>
);
const Section = ({ title, subtitle, children }) => (
  <section className="py-12 md:py-16">
    <Container>
      {title && (
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">{title}</h2>
      )}
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
const Button = ({ children, onClick, variant = "primary", type = "button", className = "" }) => {
  const base =
    "inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm transition outline-none appearance-none [-webkit-appearance:none] focus:ring-2";
  const st =
    variant === "primary"
      ? "bg-brand text-black hover:brightness-105 focus:ring-brand border border-[rgba(255,154,62,0.2)]"
      : variant === "ghost"
      ? "bg-transparent text-white/70 hover:text-white"
      : "text-white border border-white/20 hover:bg-white/10";
  return (
    <button type={type} onClick={onClick} className={`${base} ${st} ${className}`}>
      {children}
    </button>
  );
};
const Input = (p) => (
  <input
    {...p}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand ${
      p.className || ""
    }`}
  />
);
const Select = (p) => (
  <select
    {...p}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand ${
      p.className || ""
    }`}
  />
);
const Textarea = (p) => (
  <textarea
    {...p}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand ${
      p.className || ""
    }`}
  />
);

/* ---------- Defaults ---------- */
const DEFAULT_SETTINGS = {
  brand: "Coach Milo",
  heroTitle: "Die Fitness-App mit deinem persönlichen KI-Coach",
  heroSubtitle:
    "Individuelle Trainingspläne, die deine Situation, dein Niveau und deine Fortschritte berücksichtigen.",
  releaseBanner: "Ab Oktober 2025 im App Store & Play Store",
  betaCta: "Teste Coach Milo schon vor dem Release",
  accent: "#ff9a3e",
  heroImageMode: "inline", // 'inline' | 'url'
  heroImageUrl: "", // gesetzt wenn 'url'
};
const DEFAULT_FEATURES = [
  {
    id: "f1",
    title: "Individuelle Trainingspläne",
    body: "Milo baut deinen Plan aus Zielen, Equipment und Zeit. Passt Sätze/Wdh. automatisch an.",
    icon: "💪",
  },
  {
    id: "f2",
    title: "Fortschritts-Tracking",
    body: "Tracke Workouts schnell. Milo erkennt Plateaus und empfiehlt passende Methoden.",
    icon: "📈",
  },
  {
    id: "f3",
    title: "Übungsbibliothek (GIFs)",
    body: "Saubere Ausführung dank visueller Beispiele. Alternativen für jedes Niveau.",
    icon: "🎞️",
  },
];
const DEFAULT_FAQS = [
  {
    id: "q1",
    question: "Für wen ist Coach Milo geeignet?",
    answer:
      "Für Einsteiger bis Fortgeschrittene. Milo passt Volumen und Intensität an deine Erfahrung an.",
  },
  {
    id: "q2",
    question: "Brauche ich spezielles Equipment?",
    answer:
      "Nein. Du kannst im Studio, zu Hause oder unterwegs trainieren – Milo berücksichtigt dein Setup.",
  },
];

/* ---------- Hero ---------- */
function HeroImage({ settings }) {
  if (settings.heroImageMode === "url" && settings.heroImageUrl) {
    return (
      <img
        src={settings.heroImageUrl}
        alt="Coach Milo App Preview"
        className="mx-auto max-w-3xl w-full rounded-2xl shadow-lg border border-white/10"
      />
    );
  }
  // Inline SVG Fallback
  return (
    <div className="mx-auto max-w-3xl w-full rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <svg viewBox="0 0 1200 600" className="w-full h-auto" role="img" aria-label="Coach Milo Preview">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={DEFAULT_SETTINGS.accent} />
            <stop offset="100%" stopColor="#ff7a00" />
          </linearGradient>
        </defs>
        <rect width="1200" height="600" fill="#0a0a0a" />
        <rect x="60" y="50" width="320" height="500" rx="36" fill="url(#g)" opacity="0.25" />
        <rect x="500" y="50" width="640" height="500" rx="24" fill="url(#g)" opacity="0.15" />
        <g>
          <rect x="520" y="90" width="600" height="60" rx="12" fill="#111827" />
          <rect x="540" y="105" width="220" height="30" rx="8" fill="#ff9a3e" opacity="0.7" />
          <rect x="520" y="170" width="600" height="320" rx="12" fill="#111827" />
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <rect x="540" y={190 + i * 60} width="340" height="24" rx="6" fill="#e5e7eb" opacity="0.15" />
              <rect x="900" y={190 + i * 60} width="180" height="24" rx="6" fill="#ff9a3e" opacity="0.6" />
            </g>
          ))}
        </g>
        <g>
          <rect x="80" y="90" width="280" height="420" rx="24" fill="#0b0f13" stroke="#1f2937" />
          <rect x="100" y="120" width="240" height="24" rx="6" fill="#e5e7eb" opacity="0.2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="100" y={160 + i * 40} width="240" height="24" rx="6" fill="#ff9a3e" opacity={0.2 + i * 0.1} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ---------- Beta Signup (optional, unverändert nutzbar) ---------- */
function BetaForm({ settings }) {
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("Hypertrophie");
  const [exp, setExp] = useState("Fortgeschritten");
  const [consent, setConsent] = useState(false);
  const [ok, setOk] = useState("");

  async function submit(e) {
    e.preventDefault();
    setOk("");
    if (!email || !consent) {
      setOk("Bitte E-Mail eintragen und Einwilligung bestätigen.");
      return;
    }
    try {
      const { error } = await supabase
        .from("cms_signups")
        .insert({ email, goal, experience: exp });
      if (error) throw error;
      setOk("Danke! Wir melden uns mit Beta-Details.");
      setEmail("");
      setConsent(false);
    } catch (err) {
      setOk("Fehler beim Anmelden: " + (err?.message || "Unbekannt"));
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
      <Input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="md:col-span-2"
        aria-label="E-Mail"
      />
      <Select value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Ziel">
        <option>Hypertrophie</option>
        <option>Fettverlust</option>
        <option>Athletik</option>
        <option>Allgemeine Fitness</option>
      </Select>
      <Select value={exp} onChange={(e) => setExp(e.target.value)} aria-label="Erfahrung">
        <option>Einsteiger</option>
        <option>Fortgeschritten</option>
        <option>Pro</option>
      </Select>
      <div className="md:col-span-3 flex items-center gap-2">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="consent" className="text-xs text-white/70">
          Ich willige ein, dass meine E-Mail zum Beta-Kontakt genutzt wird.
        </label>
      </div>
      <div className="md:col-span-1">
        <Button type="submit">{settings?.betaCta || DEFAULT_SETTINGS.betaCta}</Button>
      </div>
      {ok && <p className="text-brand text-sm md:col-span-4">{ok}</p>}
    </form>
  );
}

/* ---------- Supabase Hooks (Public) ---------- */
function useSettings(defaults) {
  const [state, setState] = useState({
    heroImageMode: defaults.heroImageMode ?? "inline",
    heroImageUrl: defaults.heroImageUrl ?? "",
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("cms_settings")
        .select("hero_image_mode, hero_image_url")
        .eq("id", 1)
        .single();
      if (!alive) return;
      if (!error && data) {
        setState({
          heroImageMode: data.hero_image_mode ?? (defaults.heroImageMode || "inline"),
          heroImageUrl: data.hero_image_url ?? (defaults.heroImageUrl || ""),
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return {
    ...DEFAULT_SETTINGS,
    heroImageMode: state.heroImageMode,
    heroImageUrl: state.heroImageUrl,
  };
}

function useFeatures(defaults) {
  const [state, setState] = useState({ data: [], loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cms_features")
          .select("id, title, body, icon, position, published, created_at")
          .eq("published", true)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!alive) return;
        setState({ data: data || [], loading: false, error: "" });
      } catch (e) {
        if (!alive) return;
        setState({ data: [], loading: false, error: e?.message || "Load error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const list = state.data?.length
    ? state.data.map((f) => ({ id: f.id, title: f.title, body: f.body, icon: f.icon ?? "✨" }))
    : defaults;
  return { list, loading: state.loading, error: state.error };
}

function useFaqs(defaults) {
  const [state, setState] = useState({ data: [], loading: true, error: "" });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cms_faqs")
          .select("id, question, answer, position, published, created_at")
          .eq("published", true)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!alive) return;
        setState({ data: data || [], loading: false, error: "" });
      } catch (e) {
        if (!alive) return;
        setState({ data: [], loading: false, error: e?.message || "Load error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const list = state.data?.length
    ? state.data.map((q) => ({ id: q.id, question: q.question, answer: q.answer }))
    : defaults;
  return { list, loading: state.loading, error: state.error };
}

/* ---------- Public Pages ---------- */
function HomePage({ settings, features, faqs, publishedPosts, onOpenPost }) {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black py-16 md:py-24 border-b border-white/10">
        <Container>
          <div className="mb-6">
            <Badge>{settings.releaseBanner}</Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-white max-w-3xl leading-tight">
            {settings.heroTitle}
          </h1>
          <p className="text-white/70 mt-3 max-w-2xl">{settings.heroSubtitle}</p>
          <div className="mt-8">
            <HeroImage settings={settings} />
          </div>
        </Container>
      </section>

      <Section title="Warum Coach Milo?">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-white font-medium mb-2">Pläne, die zu dir passen</h3>
            <p className="text-white/70 text-sm">
              Milo berücksichtigt deine Ziele, dein Equipment und deinen Alltag. Jede Einheit ist auf dich zugeschnitten.
            </p>
          </Card>
          <Card>
            <h3 className="text-white font-medium mb-2">Mit dir besser werden</h3>
            <p className="text-white/70 text-sm">
              Deine Fortschritte fließen direkt in den Plan ein. So bleibst du motiviert – ohne Stagnation.
            </p>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-center text-center gap-3">
          <h3 className="text-white text-xl font-semibold">Frühen Zugang sichern</h3>
          <p className="text-white/70">Melde dich für die Beta an und werde Teil der Entwicklung.</p>
          <div className="w-full max-w-2xl">
            <BetaForm settings={settings} />
          </div>
        </div>
      </Section>

      <Section title="Features">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.id}>
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-white font-medium">{f.title}</h3>
              <p className="text-white/70 text-sm mt-1">{f.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="FAQ">
        <div className="space-y-3">
          {faqs.map((q) => (
            <Card key={q.id}>
              <details>
                <summary className="text-white font-medium cursor-pointer">
                  {q.question}
                </summary>
                <p className="text-white/70 text-sm mt-2">{q.answer}</p>
              </details>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Neu im Blog">
        <div className="space-y-4">
          {(publishedPosts || []).slice(0, 2).length === 0 && (
            <p className="text-white/60 text-sm">Noch keine Artikel veröffentlicht.</p>
          )}
          {(publishedPosts || [])
            .slice(0, 2)
            .map((p) => (
              <Card key={p.id}>
                <h3 className="text-white font-medium">{p.title}</h3>
                {p.excerpt && (
                  <p className="text-white/70 text-sm mt-2">{p.excerpt}</p>
                )}
                <button
                  type="button"
                  onClick={() => onOpenPost(p.slug)}
                  className="mt-3 inline-flex items-center gap-1 text-brand hover:opacity-90"
                >
                  Weiterlesen →
                </button>
              </Card>
            ))}
        </div>
      </Section>
    </>
  );
}

function FeaturesPage({ features }) {
  return (
    <Section title="Features" subtitle="Mehr als Tracking: Milo denkt mit.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.id}>
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="text-white font-medium">{f.title}</h3>
            <p className="text-white/70 text-sm mt-1">{f.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function BlogPage({ publishedPosts, onOpen }) {
  return (
    <Section title="Blog & Updates" subtitle="Transparente Roadmap, Einblicke, Learnings.">
      <div className="space-y-4">
        {(publishedPosts || []).map((p) => (
          <Card key={p.id}>
            <h3 className="text-white font-medium">{p.title}</h3>
            {p.excerpt && <p className="text-white/70 text-sm mt-2">{p.excerpt}</p>}
            <button
              type="button"
              onClick={() => onOpen(p.slug)}
              className="mt-3 inline-flex items-center gap-1 text-brand hover:opacity-90"
            >
              Weiterlesen →
            </button>
          </Card>
        ))}
        {(publishedPosts || []).length === 0 && (
          <p className="text-white/60 text-sm">Noch keine Beiträge veröffentlicht.</p>
        )}
      </div>
    </Section>
  );
}

function FAQPage({ faqs }) {
  return (
    <Section title="FAQ" subtitle="Häufige Fragen – kurz beantwortet.">
      <div className="space-y-3">
        {faqs.map((q) => (
          <Card key={q.id}>
            <details>
              <summary className="text-white font-medium cursor-pointer">
                {q.question}
              </summary>
              <p className="text-white/70 text-sm mt-2">{q.answer}</p>
            </details>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Admin (Tabs + CRUD + Einstellungen) ---------- */
function AdminPage() {
  const { session, loading, signInWithPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const TABS = ["Beiträge", "Features", "FAQ", "Einstellungen"];
  const [tab, setTab] = useState(TABS[0]);

  /* ===================== POSTS (CRUD) ===================== */
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [savingPost, setSavingPost] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("cms_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setPosts(data || []);
    })();
  }, [session]);

  async function createPost() {
    const draft = {
      slug: `draft-${Date.now()}`,
      title: "Neuer Artikel",
      excerpt: "",
      content_html: "<p></p>",
      cover_url: "",
      tags: [],
      author: "",
      published: false,
      published_at: null,
    };
    const { data, error } = await supabase
      .from("cms_posts")
      .insert(draft)
      .select()
      .single();
    if (!error && data) {
      setPosts([data, ...posts]);
      setEditingPost(data);
    }
  }

  async function savePost(p) {
    setSavingPost(true);
    try {
      const patch = {
        title: p.title ?? "",
        slug: p.slug ?? "",
        excerpt: p.excerpt ?? "",
        content_html: p.content_html || "<p></p>",
        cover_url: p.cover_url ?? "",
        tags: p.tags ?? [],
        author: p.author ?? "",
        published: !!p.published,
        published_at: p.published ? p.published_at || new Date().toISOString() : p.published_at,
      };
      const { data, error } = await supabase
        .from("cms_posts")
        .update(patch)
        .eq("id", p.id)
        .select()
        .single();
      if (error) throw error;
      setPosts(posts.map((x) => (x.id === p.id ? data : x)));
      setEditingPost(data);
      alert("Gespeichert.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingPost(false);
    }
  }

  async function removePost(id) {
    if (!confirm("Diesen Post wirklich löschen?")) return;
    const { error } = await supabase.from("cms_posts").delete().eq("id", id);
    if (!error) {
      setPosts(posts.filter((p) => p.id !== id));
      if (editingPost?.id === id) setEditingPost(null);
    }
  }

  /* ===================== FEATURES (CRUD) ===================== */
  const [features, setFeatures] = useState([]);
  const [editingFeature, setEditingFeature] = useState(null);
  const [savingFeature, setSavingFeature] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("cms_features")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error) setFeatures(data || []);
    })();
  }, [session]);

  async function createFeature() {
    const draft = {
      title: "Neues Feature",
      body: "",
      icon: "✨",
      position: (features?.length || 0) + 1,
      published: false,
    };
    const { data, error } = await supabase
      .from("cms_features")
      .insert(draft)
      .select()
      .single();
    if (!error && data) {
      setFeatures([data, ...features]);
      setEditingFeature(data);
    }
  }

  async function saveFeature(f) {
    setSavingFeature(true);
    try {
      const patch = {
        title: f.title ?? "",
        body: f.body ?? "",
        icon: f.icon ?? "✨",
        position: Number(f.position) || 0,
        published: !!f.published,
      };
      const { data, error } = await supabase
        .from("cms_features")
        .update(patch)
        .eq("id", f.id)
        .select()
        .single();
      if (error) throw error;
      setFeatures(features.map((x) => (x.id === f.id ? data : x)));
      setEditingFeature(data);
      alert("Gespeichert.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingFeature(false);
    }
  }

  async function removeFeature(id) {
    if (!confirm("Dieses Feature wirklich löschen?")) return;
    const { error } = await supabase.from("cms_features").delete().eq("id", id);
    if (!error) {
      setFeatures(features.filter((x) => x.id !== id));
      if (editingFeature?.id === id) setEditingFeature(null);
    }
  }

  /* ===================== FAQ (CRUD) ===================== */
  const [faqs, setFaqs] = useState([]);
  const [editingFaq, setEditingFaq] = useState(null);
  const [savingFaq, setSavingFaq] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("cms_faqs")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error) setFaqs(data || []);
    })();
  }, [session]);

  async function createFaq() {
    const draft = {
      question: "Neue Frage",
      answer: "",
      position: (faqs?.length || 0) + 1,
      published: false,
    };
    const { data, error } = await supabase
      .from("cms_faqs")
      .insert(draft)
      .select()
      .single();
    if (!error && data) {
      setFaqs([data, ...faqs]);
      setEditingFaq(data);
    }
  }

  async function saveFaq(q) {
    setSavingFaq(true);
    try {
      const patch = {
        question: q.question ?? "",
        answer: q.answer ?? "",
        position: Number(q.position) || 0,
        published: !!q.published,
      };
      const { data, error } = await supabase
        .from("cms_faqs")
        .update(patch)
        .eq("id", q.id)
        .select()
        .single();
      if (error) throw error;
      setFaqs(faqs.map((x) => (x.id === q.id ? data : x)));
      setEditingFaq(data);
      alert("Gespeichert.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingFaq(false);
    }
  }

  async function removeFaq(id) {
    if (!confirm("Diese FAQ wirklich löschen?")) return;
    const { error } = await supabase.from("cms_faqs").delete().eq("id", id);
    if (!error) {
      setFaqs(faqs.filter((x) => x.id !== id));
      if (editingFaq?.id === id) setEditingFaq(null);
    }
  }

  /* ===================== SETTINGS (Hero) ===================== */
  const [settingsRow, setSettingsRow] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("cms_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (!error) setSettingsRow(data);
    })();
  }, [session]);

  async function saveSettings(next) {
    setSavingSettings(true);
    try {
      const { data, error } = await supabase
        .from("cms_settings")
        .update({
          hero_image_mode: next.hero_image_mode ?? "url",
          hero_image_url: next.hero_image_url ?? null,
        })
        .eq("id", 1)
        .select()
        .single();
      if (error) throw error;
      setSettingsRow(data);
      alert("Einstellungen gespeichert.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function uploadHero(file) {
    if (!file) return;
    try {
      const path = `settings/hero-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("cms_images")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("cms_images")
        .getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setSettingsRow({ ...(settingsRow || { id: 1, hero_image_mode: "url" }), hero_image_url: url });
    } catch (e) {
      alert(e.message);
    }
  }

  /* ===================== AUTH UI ===================== */
  if (loading) {
    return (
      <Section title="Admin">
        <p className="text-white/70">Lade…</p>
      </Section>
    );
  }
  if (!session) {
    return (
      <Section title="Admin Login" subtitle="E-Mail und Passwort eingeben">
        <div className="max-w-sm space-y-3">
          <Input
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Passwort"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Button
            onClick={async () => {
              try {
                await signInWithPassword(email, pw);
              } catch (e) {
                alert(e.message);
              }
            }}
          >
            Einloggen
          </Button>
          <p className="text-white/50 text-xs">
            Hinweis: Für Magic-Link-Login brauchst du SMTP – später optional.
          </p>
        </div>
      </Section>
    );
  }

  /* ===================== TABS UI ===================== */
  return (
    <Section title="Admin" subtitle="Beiträge, Features, FAQs & Einstellungen (Supabase)">
      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              tab === t
                ? "bg-white/10 text-white border-white/20"
                : "bg-transparent text-white/80 hover:text-white border-white/20"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Beiträge */}
      {tab === "Beiträge" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Beiträge</h3>
              <Button onClick={createPost}>+ Neuer Post</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {posts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingPost(p)}
                    onKeyDown={(e) => (e.key === "Enter" ? setEditingPost(p) : null)}
                    className="text-left text-white/80 hover:text-white cursor-pointer select-none"
                  >
                    {p.title || "(Ohne Titel)"} {p.published ? "• LIVE" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">{p.slug}</span>
                    <Button variant="ghost" onClick={() => removePost(p.id)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            {!editingPost ? (
              <p className="text-white/60 text-sm">Post auswählen oder erstellen.</p>
            ) : (
              <div className="space-y-2">
                <Input
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="Titel"
                />
                <Input
                  value={editingPost.slug}
                  onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                  placeholder="slug"
                />
                <Textarea
                  rows={2}
                  value={editingPost.excerpt || ""}
                  onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  placeholder="Kurzbeschreibung"
                />
                <div>
                  <label className="text-white/70 text-sm">Inhalt (HTML)</label>
                  <Textarea
                    rows={10}
                    value={editingPost.content_html || ""}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, content_html: e.target.value })
                    }
                    placeholder="<p>Dein HTML-Inhalt hier.</p>"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-white/80 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editingPost.published}
                      onChange={(e) =>
                        setEditingPost({ ...editingPost, published: e.target.checked })
                      }
                    />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => savePost(editingPost)}>
                    {savingPost ? "Speichern…" : "Speichern"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Features */}
      {tab === "Features" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Features</h3>
              <Button onClick={createFeature}>+ Neues Feature</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {features.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingFeature(f)}
                    onKeyDown={(e) => (e.key === "Enter" ? setEditingFeature(f) : null)}
                    className="text-left text-white/80 hover:text-white cursor-pointer select-none"
                  >
                    {f.title || "(Ohne Titel)"} {f.published ? "• LIVE" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">#{f.position ?? 0}</span>
                    <Button variant="ghost" onClick={() => removeFeature(f.id)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            {!editingFeature ? (
              <p className="text-white/60 text-sm">Feature auswählen oder erstellen.</p>
            ) : (
              <div className="space-y-2">
                <Input
                  value={editingFeature.title || ""}
                  onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
                  placeholder="Titel"
                />
                <Textarea
                  rows={3}
                  value={editingFeature.body || ""}
                  onChange={(e) => setEditingFeature({ ...editingFeature, body: e.target.value })}
                  placeholder="Beschreibung"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={editingFeature.icon || ""}
                    onChange={(e) => setEditingFeature({ ...editingFeature, icon: e.target.value })}
                    placeholder="Icon (Emoji oder Text)"
                  />
                  <Input
                    type="number"
                    value={editingFeature.position ?? 0}
                    onChange={(e) => setEditingFeature({ ...editingFeature, position: e.target.value })}
                    placeholder="Position"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={!!editingFeature.published}
                      onChange={(e) =>
                        setEditingFeature({ ...editingFeature, published: e.target.checked })
                      }
                    />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => saveFeature(editingFeature)}>
                    {savingFeature ? "Speichern…" : "Speichern"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FAQ */}
      {tab === "FAQ" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">FAQ</h3>
              <Button onClick={createFaq}>+ Neue Frage</Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {faqs.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingFaq(q)}
                    onKeyDown={(e) => (e.key === "Enter" ? setEditingFaq(q) : null)}
                    className="text-left text-white/80 hover:text-white cursor-pointer select-none"
                  >
                    {q.question || "(Ohne Frage)"} {q.published ? "• LIVE" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">#{q.position ?? 0}</span>
                    <Button variant="ghost" onClick={() => removeFaq(q.id)}>
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            {!editingFaq ? (
              <p className="text-white/60 text-sm">Frage auswählen oder erstellen.</p>
            ) : (
              <div className="space-y-2">
                <Input
                  value={editingFaq.question || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  placeholder="Frage"
                />
                <Textarea
                  rows={6}
                  value={editingFaq.answer || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  placeholder="Antwort"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={editingFaq.position ?? 0}
                    onChange={(e) => setEditingFaq({ ...editingFaq, position: e.target.value })}
                    placeholder="Position"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={!!editingFaq.published}
                      onChange={(e) =>
                        setEditingFaq({ ...editingFaq, published: e.target.checked })
                      }
                    />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => saveFaq(editingFaq)}>
                    {savingFaq ? "Speichern…" : "Speichern"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Einstellungen */}
      {tab === "Einstellungen" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-white font-medium mb-2">Hero Bild</h3>
            {!settingsRow ? (
              <p className="text-white/60 text-sm">Lade Einstellungen…</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-sm">Modus</label>
                  <Select
                    value={settingsRow.hero_image_mode || "url"}
                    onChange={(e) =>
                      setSettingsRow({ ...settingsRow, hero_image_mode: e.target.value })
                    }
                  >
                    <option value="url">URL</option>
                    <option value="inline">Inline (SVG)</option>
                  </Select>
                </div>

                <div>
                  <label className="text-white/70 text-sm">Bild-URL (öffentlich)</label>
                  <Input
                    placeholder="https://…"
                    value={settingsRow.hero_image_url || ""}
                    onChange={(e) =>
                      setSettingsRow({ ...settingsRow, hero_image_url: e.target.value })
                    }
                  />
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => uploadHero(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => saveSettings(settingsRow)}>
                    {savingSettings ? "Speichern…" : "Speichern"}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-white font-medium mb-2">Vorschau</h3>
            {settingsRow?.hero_image_mode === "url" && settingsRow?.hero_image_url ? (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img
                  src={settingsRow.hero_image_url}
                  alt="Hero Preview"
                  className="w-full h-auto object-contain"
                />
              </div>
            ) : (
              <p className="text-white/60 text-sm">
                Aktuell „Inline“ – es wird die eingebaute SVG verwendet.
              </p>
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}

/* ---------- Shell / Navigation ---------- */
const PAGES = ["Home", "Features", "Blog", "FAQ", "Admin"];
function Shell({ settings, onNavigate, active }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/40">
      <Container>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-xl"
              style={{ background: "linear-gradient(135deg, #ff9a3e, #ff7a00)" }}
              aria-hidden
            />
            <span className="text-white font-semibold">{settings.brand}</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {PAGES.map((p) => (
              <button
                key={p}
                onClick={() => onNavigate(p)}
                className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                  active === p
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-transparent text-white/80 hover:text-white border-white/20"
                }`}
              >
                {p}
              </button>
            ))}
          </nav>
        </div>
      </Container>
    </header>
  );
}

/* ---------- Root App ---------- */
export default function App() {
  const settings = useSettings(DEFAULT_SETTINGS);
  const { list: features } = useFeatures(DEFAULT_FEATURES);
  const { list: faqs } = useFaqs(DEFAULT_FAQS);
  const [page, setPage] = useState("Home");
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [publishedPosts, setPublishedPosts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cms_posts")
          .select("id, slug, title, excerpt, cover_url, content_html, published_at")
          .eq("published", true)
          .order("published_at", { ascending: false });
        if (error) throw error;
        setPublishedPosts(data || []);
      } catch {
        setPublishedPosts([]);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.className = "bg-black";
    try {
      document.body.style.margin = "0";
      document.body.style.background = "#000";
    } catch {}
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-black text-white">
        <Shell
          settings={settings}
          onNavigate={(p) => {
            setPage(p);
            if (p !== "Post") setSelectedSlug(null);
          }}
          active={page}
        />

        {page === "Home" && (
          <HomePage
            settings={settings}
            features={features}
            faqs={faqs}
            publishedPosts={publishedPosts}
            onOpenPost={(slug) => {
              setSelectedSlug(slug);
              setPage("Post");
            }}
          />
        )}
        {page === "Features" && <FeaturesPage features={features} />}
        {page === "Blog" && (
          <BlogPage
            publishedPosts={publishedPosts}
            onOpen={(slug) => {
              setSelectedSlug(slug);
              setPage("Post");
            }}
          />
        )}
        {page === "FAQ" && <FAQPage faqs={faqs} />}
        {page === "Admin" && <AdminPage />}
        {page === "Post" && selectedSlug && (
          <PostPage slug={selectedSlug} onBack={() => setPage("Blog")} />
        )}

        <footer className="border-t border-white/10 mt-10">
          <Container>
            <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-white/50 text-sm">
              <div>© {new Date().getFullYear()} {settings.brand}</div>
              <div className="flex items-center gap-3">
                <a className="hover:text-white" onClick={() => setPage("Admin")}>Admin</a>
                <span>•</span>
                <span>Ab Oktober 2025</span>
              </div>
            </div>
          </Container>
        </footer>
      </div>
    </AuthProvider>
  );
}
