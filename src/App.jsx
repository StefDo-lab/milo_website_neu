import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { AuthProvider, useAuth } from "./lib/auth";
import PostPage from "./PostPage";

/* ------------------------------------------------------------
   Coach Milo – Vollständige App.jsx (mit Blog-Detailseite)
   - Öffentliche Seiten (Hero, Warum, Schritte, Features, FAQ, Blog, Kontakt, Recht, Debug)
   - Admin: Supabase (Login E-Mail+Passwort), CRUD für cms_posts, Bild-Upload in cms_images
   - Beta-Signups: schreiben in cms_signups
------------------------------------------------------------ */

/* ---------- Utils ---------- */
function uid() {
  try {
    return crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}
function isPlausibleUrl(u) { try { return !!new URL(u).host; } catch { return false; } }
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ---------- Layout / UI ---------- */
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
  const base = "inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm transition outline-none appearance-none focus:ring-2 focus:ring-emerald-400 bg-transparent";
  const st = variant === "primary"
    ? "bg-emerald-500 text-black hover:bg-emerald-400 border border-emerald-400/20"
    : "text-white border border-white/20 hover:bg-white/10";
  return <button type={type} onClick={onClick} className={`${base} ${st} ${className}`}>{children}</button>;
};
const Input=(p)=>(<input {...p} className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-400 ${p.className||""}`}/>);
const Select=(p)=>(<select {...p} className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400 ${p.className||""}`}/>);
const Textarea=(p)=>(<textarea {...p} className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-400 ${p.className||""}`}/>);

/* ---------- Content Defaults (Features/FAQ lokal; Blog via Supabase) ---------- */
const DEFAULT_SETTINGS = {
  brand: "Coach Milo",
  heroTitle: "Die Fitness-App mit deinem persönlichen KI-Coach",
  heroSubtitle: "Individuelle Trainingspläne, die deine Situation, dein Niveau und deine Fortschritte berücksichtigen.",
  releaseBanner: "Ab Oktober 2025 im App Store & Play Store",
  betaCta: "Teste Coach Milo schon vor dem Release",
  accent: "#4ade80",
  heroImageMode: "inline", // "inline" | "url"
  heroImageUrl: "/hero-image.png",
};
const DEFAULT_FEATURES = [
  { id: "f1", title: "Individuelle Trainingspläne", body: "Milo baut deinen Plan aus Zielen, Equipment und Zeit. Passt Sätze/Wdh. automatisch an.", icon: "💪" },
  { id: "f2", title: "Fortschritts-Tracking", body: "Tracke Workouts schnell. Milo erkennt Plateaus und empfiehlt passende Methoden.", icon: "📈" },
  { id: "f3", title: "Übungsbibliothek (GIFs)", body: "Saubere Ausführung dank visueller Beispiele. Alternativen für jedes Niveau.", icon: "🎞️" },
  { id: "f4", title: "Feedback-Loops", body: "Nach jedem Training bekommst du kurzes, konstruktives Feedback – wie vom Coach.", icon: "🗣️" },
  { id: "f5", title: "Sharing & Motivation", body: "Teile Highlights mit Freunden – für mehr Spaß und Motivation.", icon: "✨" },
];
const DEFAULT_FAQS = [
  { id: "q1", question: "Für wen ist Coach Milo geeignet?", answer: "Für Einsteiger bis Fortgeschrittene. Milo passt Volumen und Intensität an deine Erfahrung an." },
  { id: "q2", question: "Brauche ich spezielles Equipment?", answer: "Nein. Du kannst im Studio, zu Hause oder unterwegs trainieren – Milo berücksichtigt dein Setup." },
  { id: "q3", question: "Wie funktioniert die Beta?", answer: "Melde dich mit E-Mail an und erhalte frühzeitig Zugang. Feedback hilft uns, Milo zu schärfen." },
];

/* ---------- Hero Image ---------- */
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
  // Inline SVG Platzhalter
  return (
    <div className="mx-auto max-w-3xl w-full rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <svg viewBox="0 0 1200 600" className="w-full h-auto" role="img" aria-label="Coach Milo Preview">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={settings.accent} />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect width="1200" height="600" fill="#0a0a0a" />
        <rect x="60" y="50" width="320" height="500" rx="36" fill="url(#g)" opacity="0.25" />
        <rect x="500" y="50" width="640" height="500" rx="24" fill="url(#g)" opacity="0.15" />
        <g>
          <rect x="520" y="90" width="600" height="60" rx="12" fill="#111827" />
          <rect x="540" y="105" width="220" height="30" rx="8" fill="#10b981" opacity="0.7" />
          <rect x="520" y="170" width="600" height="320" rx="12" fill="#111827" />
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <rect x="540" y={190 + i * 60} width="340" height="24" rx="6" fill="#e5e7eb" opacity="0.15" />
              <rect x="900" y={190 + i * 60} width="180" height="24" rx="6" fill="#10b981" opacity="0.6" />
            </g>
          ))}
        </g>
        <g>
          <rect x="80" y="90" width="280" height="420" rx="24" fill="#0b0f13" stroke="#1f2937" />
          <rect x="100" y="120" width="240" height="24" rx="6" fill="#e5e7eb" opacity="0.2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="100" y={160 + i * 40} width="240" height="24" rx="6" fill="#10b981" opacity={0.2 + i * 0.1} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ---------- Beta Signup (Supabase) ---------- */
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
      const { error } = await supabase.from("cms_signups").insert({
        email,
        goal,
        experience: exp,
      });
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
      {ok && <p className="text-emerald-300 text-sm md:col-span-4">{ok}</p>}
    </form>
  );
}

/* ---------- Markdown (minimal für lokale Texte, nicht für Blog) ---------- */
function renderMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/^###\s(.+)$/gm, "\n$1\n——————————")
    .replace(/^##\s(.+)$/gm, "\n$1\n————————")
    .replace(/^#\s(.+)$/gm, "\n$1\n———————")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

/* ---------- Public: Blog Post Karte (aus Supabase) ---------- */
function PostCard({ post, compact=false, onOpen }) {
  const Wrapper = ({ children }) =>
    onOpen ? (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(post.slug)}
        onKeyDown={(e) => (e.key === "Enter" ? onOpen(post.slug) : null)}
        className="w-full text-left hover:opacity-90 transition cursor-pointer select-none"
        aria-label={`Öffne Artikel: ${post.title}`}
      >
        {children}
      </div>
    ) : (
      <>{children}</>
    );

  return (
    <Card>
      <Wrapper>
        <h3 className="text-white font-medium">{post.title}</h3>
        {post.cover_url && isPlausibleUrl(post.cover_url) && (
          <img src={post.cover_url} alt="Cover" className="mt-2 rounded border border-white/10" />
        )}
        {post.excerpt && <p className="text-white/60 text-sm mt-1">{post.excerpt}</p>}
        {!compact && post.content_html && (
          <article
            className="prose prose-invert mt-3 text-white/80"
            dangerouslySetInnerHTML={{ __html: post.content_html }}
          />
        )}
        {onOpen && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-emerald-300 text-sm">
              Weiterlesen →
            </span>
          </div>
        )}
      </Wrapper>
    </Card>
  );
}


/* ---------- Seiten ---------- */
function HomePage({ settings, features, faqs, publishedPosts, onOpenPost }) {
  const latest = (publishedPosts || []).slice(0, 2);

  return (
    <>
      {/* Hero */}
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

      {/* Was ist Coach Milo? */}
      <Section title="Was ist Coach Milo?">
        <div className="text-white/80 max-w-3xl space-y-3">
          <p>
            Coach Milo ist eine Fitness-App, die dir einen echten KI-Coach an die Seite stellt.
            Kein Rätselraten mehr, sondern klare, individuell angepasste Pläne.
          </p>
        </div>
      </Section>

      {/* Warum brauchst du das? */}
      <Section title="Warum Coach Milo?">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-white font-medium mb-2">Pläne, die zu dir passen</h3>
            <p className="text-white/70 text-sm">
              Milo berücksichtigt deine Ziele, dein Equipment und deinen Alltag.
              Jede Einheit ist auf dich zugeschnitten.
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

      {/* Steps */}
      <Section title="So bringt dich Milo weiter">
        <div className="grid md:grid-cols-5 gap-4">
          {[
            "Deine Ausgangslage verstehen",
            "Ziele festlegen",
            "Plan entwickeln",
            "Trainieren & Feedback bekommen",
            "Anpassen & Fortschritt sichern",
          ].map((step, idx) => (
            <Card key={idx}>
              <div className="text-white/60 text-xs">Schritt {idx + 1}</div>
              <div className="text-white mt-1 font-medium">{step}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Beta CTA unten */}
      <Section>
        <div className="flex flex-col items-center text-center gap-3">
          <h3 className="text-white text-xl font-semibold">Frühen Zugang sichern</h3>
          <p className="text-white/70">Melde dich für die Beta an und werde Teil der Entwicklung.</p>
          <div className="w-full max-w-2xl">
            <BetaForm settings={settings} />
          </div>
        </div>
      </Section>

      {/* Features */}
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

      {/* FAQ */}
      <Section title="FAQ">
        <div className="space-y-3">
          {faqs.map((q) => (
            <Card key={q.id}>
              <details>
                <summary className="text-white font-medium cursor-pointer">{q.question}</summary>
                <p className="text-white/70 text-sm mt-2">{q.answer}</p>
              </details>
            </Card>
          ))}
        </div>
      </Section>

      {/* Neu im Blog */}
      <Section title="Neu im Blog">
        <div className="space-y-4">
          {latest.length === 0 && (
            <p className="text-white/60 text-sm">Noch keine Artikel veröffentlicht.</p>
          )}
          {latest.map((p) => (
  <PostCard key={p.id} post={p} compact onOpen={onOpenPost} />
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

function HowPage() {
  return (
    <Section title="So funktioniert’s" subtitle="Der Coach-Kreislauf – iterativ zur Bestform.">
      <ol className="list-decimal list-inside text-white/80 space-y-2">
        <li>Status erfassen (Ziele, Erfahrung, Equipment, Zeitbudget)</li>
        <li>Strategie ableiten (Volumen, Intensität, Frequenz)</li>
        <li>Plan erstellen (Übungen, Sätze/Wdh., Progression)</li>
        <li>Training umsetzen & tracken (Feedback-Impulse)</li>
        <li>Erfolg messen & anpassen (Plateau-Methoden, Deloads)</li>
      </ol>
    </Section>
  );
}

function BlogPage({ publishedPosts, onOpen }) {
  return (
    <Section title="Blog & Updates" subtitle="Transparente Roadmap, Einblicke, Learnings.">
      <div className="space-y-4">
        {(publishedPosts || []).length === 0 && (
          <p className="text-white/60 text-sm">Noch keine Artikel veröffentlicht.</p>
        )}
        {(publishedPosts || []).map((p) => (
          <PostCard key={p.id} post={p} compact onOpen={onOpen} />
        ))}
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
              <summary className="text-white font-medium cursor-pointer">{q.question}</summary>
              <p className="text-white/70 text-sm mt-2">{q.answer}</p>
            </details>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function KontaktPage() {
  return (
    <Section title="Kontakt" subtitle="Fragen? Schreib uns – wir freuen uns.">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-white/80 text-sm">E-Mail: hello@coachmilo.app</p>
          <p className="text-white/60 text-xs mt-2">
            Hinweis: Während der Beta antworten wir in der Regel innerhalb von 48 Stunden.
          </p>
        </Card>
        <Card>
          <p className="text-white/80 text-sm">Geschäftlich/PR: press@coachmilo.app</p>
          <p className="text-white/60 text-xs mt-2">Wir schicken dir gern unser Factsheet.</p>
        </Card>
      </div>
    </Section>
  );
}

function LegalPage() {
  return (
    <Section title="Rechtliches" subtitle="Impressum & Datenschutz (Kurzfassung)">
      <div className="space-y-4 text-white/70 text-sm">
        <div>
          <h3 className="text-white font-medium">Impressum</h3>
          <p>Lakeview Solutions – Coach Milo (Platzhalter-Daten)</p>
          <p>Adresse, AT-UID, Kontakt folgen.</p>
        </div>
        <div>
          <h3 className="text-white font-medium">Datenschutz</h3>
          <p>
            Wir verarbeiten Beta-E-Mails ausschließlich zur Kontaktaufnahme im Rahmen der Beta.
            Auf Anfrage löschen wir deine Daten umgehend.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Debug Tests (leicht) ---------- */
function runTests(state) {
  const results = [];
  function test(name, fn) {
    try { results.push({ name, ok: !!fn() }); }
    catch (e) { results.push({ name, ok: false }); }
  }
  test("Release-Banner vorhanden", () => typeof state.settings.releaseBanner === "string" && state.settings.releaseBanner.length > 5);
  test("Hero hat Bild-Konfiguration", () => ["inline", "url"].includes(state.settings.heroImageMode));
  test("Mind. 3 Features vorhanden", () => state.features.length >= 3);
  test("FAQ nicht leer", () => state.faqs.length >= 1);
  return results;
}
function DebugPage({ settings, features, faqs }) {
  const tests = runTests({ settings, features, faqs });
  return (
    <Section title="Debug & Tests" subtitle="Schnelle Checks für Inhalte & Flows.">
      <Card>
        <div className="space-y-2">
          {tests.map((t, i) => (
            <div key={i} className={`flex items-center justify-between text-sm ${t.ok ? "text-emerald-300" : "text-red-300"}`}>
              <span>{t.name}</span>
              <span>{t.ok ? "PASS" : "FAIL"}</span>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}

/* ---------- Admin: Supabase CRUD (Posts + Upload) ---------- */
function AdminPage() {
  const { session, loading, signInWithPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("cms_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return alert(error.message);
      setPosts(data || []);
    })();
  }, [session]);

  async function createPost() {
    const draft = {
      slug: `draft-${Date.now()}`,
      title: "Neuer Artikel",
      excerpt: "",
      content_html: "<p></p>", // RichText folgt
      cover_url: "",
      tags: [],
      author: "",
      published: false,
      published_at: null,
    };
    const { data, error } = await supabase.from("cms_posts").insert(draft).select().single();
    if (error) return alert(error.message);
    setPosts([data, ...posts]); setEditing(data);
  }

  async function savePost(p) {
    setSaving(true);
    try {
      const patch = {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content_html: p.content_html || "<p></p>",
        cover_url: p.cover_url,
        tags: p.tags,
        author: p.author,
        published: p.published,
        published_at: p.published ? (p.published_at || new Date().toISOString()) : p.published_at,
      };
      const { data, error } = await supabase.from("cms_posts").update(patch).eq("id", p.id).select().single();
      if (error) throw error;
      setPosts(posts.map(x => x.id === p.id ? data : x));
      setEditing(data);
      alert("Gespeichert.");
    } catch (e) {
      alert(e.message);
    } finally { setSaving(false); }
  }

  async function removePost(id) {
    if (!confirm("Diesen Post wirklich löschen?")) return;
    const { error } = await supabase.from("cms_posts").delete().eq("id", id);
    if (error) return alert(error.message);
    setPosts(posts.filter(p => p.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    try {
      const path = `posts/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("cms_images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from("cms_images").getPublicUrl(path);
      setEditing({ ...editing, cover_url: publicUrl.publicUrl });
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  }

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
          <Input placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input type="password" placeholder="Passwort" value={pw} onChange={e=>setPw(e.target.value)} />
          <Button onClick={async () => { try { await signInWithPassword(email, pw); } catch(e){ alert(e.message); } }}>
            Einloggen
          </Button>
          <p className="text-white/50 text-xs">
            Hinweis: Für Magic-Link-Login brauchst du SMTP – später optional.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Admin" subtitle="Beiträge verwalten (Supabase)">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Beiträge</h3>
            <Button onClick={createPost}>+ Neuer Post</Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {posts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <div
  role="button"
  tabIndex={0}
  onClick={() => setEditing(p)}
  onKeyDown={(e)=> e.key==="Enter" ? setEditing(p) : null}
  className="text-left text-white/80 hover:text-white cursor-pointer select-none"
>
  {p.title || "(Ohne Titel)"} {p.published ? "• LIVE" : ""}
</div>

                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">{p.slug}</span>
                  <Button variant="ghost" onClick={() => removePost(p.id)}>Löschen</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          {!editing ? (
            <p className="text-white/60 text-sm">Post auswählen oder erstellen.</p>
          ) : (
            <div className="space-y-2">
              <Input value={editing.title} onChange={e=>setEditing({ ...editing, title: e.target.value })} placeholder="Titel" />
              <Input value={editing.slug} onChange={e=>setEditing({ ...editing, slug: e.target.value })} placeholder="slug" />
              <Textarea rows={2} value={editing.excerpt || ""} onChange={e=>setEditing({ ...editing, excerpt: e.target.value })} placeholder="Kurzbeschreibung" />

              <div>
                <label className="text-white/70 text-sm">Cover Bild</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={editing.cover_url || ""} onChange={e=>setEditing({ ...editing, cover_url: e.target.value })} placeholder="https://..." />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])} />
                  </label>
                </div>
                {uploading && <p className="text-white/50 text-xs mt-1">Upload…</p>}
                {editing.cover_url && <img src={editing.cover_url} alt="cover" className="mt-2 rounded border border-white/10" />}
              </div>

              <div>
                <label className="text-white/70 text-sm">Inhalt (HTML – Rich Text folgt)</label>
                <Textarea
                  rows={10}
                  value={editing.content_html || ""}
                  onChange={e=>setEditing({ ...editing, content_html: e.target.value })}
                  placeholder="<p>Dein HTML-Inhalt hier. (Tiptap folgt im nächsten Schritt)</p>"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.published}
                    onChange={e=>setEditing({ ...editing, published: e.target.checked })}
                  />
                  Veröffentlicht
                </label>
                <Button onClick={() => savePost(editing)}>{saving ? "Speichern…" : "Speichern"}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}

/* ---------- Shell / Navigation ---------- */
const PAGES = ["Home", "Features", "How", "Blog", "FAQ", "Kontakt", "Recht", "Admin", "Debug"];
function Shell({ settings, onNavigate, active }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/40">
      <Container>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-xl"
              style={{ background: `linear-gradient(135deg, ${settings.accent}, #22c55e)` }}
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
  const [settings] = useState(DEFAULT_SETTINGS);
  const [features] = useState(DEFAULT_FEATURES);
  const [faqs] = useState(DEFAULT_FAQS);

  const [page, setPage] = useState("Home");
  const [selectedSlug, setSelectedSlug] = useState(null);

  // Veröffentliche Posts aus Supabase lesen (Public)
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
        // Fallback: keine Posts
        setPublishedPosts([]);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.className = "bg-black";
    try { document.body.style.margin = "0"; document.body.style.background = "#000"; } catch {}
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-black text-white">
        <Shell settings={settings} onNavigate={setPage} active={page} />

        {page === "Home" && (
  <HomePage
    settings={settings}
    features={features}
    faqs={faqs}
    publishedPosts={publishedPosts}
    onOpenPost={(slug) => { setSelectedSlug(slug); setPage("Post"); }}
  />
)}

        {page === "Features" && <FeaturesPage features={features} />}
        {page === "How" && <HowPage />}
        {page === "Blog" && (
          <BlogPage
            publishedPosts={publishedPosts}
            onOpen={(slug) => { setSelectedSlug(slug); setPage("Post"); }}
          />
        )}
        {page === "Post" && (
          <PostPage
            slug={selectedSlug}
            onBack={() => setPage("Blog")}
          />
        )}
        {page === "FAQ" && <FAQPage faqs={faqs} />}
        {page === "Kontakt" && <KontaktPage />}
        {page === "Recht" && <LegalPage />}
        {page === "Admin" && <AdminPage />}
        {page === "Debug" && <DebugPage settings={settings} features={features} faqs={faqs} />}

        <footer className="border-t border-white/10 mt-10">
          <Container>
            <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-white/50 text-sm">
              <div>© {new Date().getFullYear()} {settings.brand}</div>
              <div className="flex items-center gap-3">
                <a className="hover:text-white" onClick={() => setPage("Recht")}>Impressum & Datenschutz</a>
                <span>•</span>
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
