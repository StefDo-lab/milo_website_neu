import React, { useEffect, useState } from "react";

/* ------------------------------------------------------------
   Coach Milo – Vollständige Single-File React App (Canvas)
   Stufe 1B: Markdown-Export (.md) + Write-Fallback (neues Tab)
   + Clipboard-Buttons (Fallback gegen iFrame-Download-Blocker)
------------------------------------------------------------ */

/* ---------- LocalStorage Keys & Utils ---------- */
const LS_KEYS = {
  settings: "cm_site_settings_v1",
  features: "cm_features_v1",
  faqs: "cm_faqs_v1",
  posts: "cm_posts_v1",
  signups: "cm_beta_signups_v1",
  adminPw: "cm_admin_pw",
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// Clipboard Helper (mit Fallback)
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Inhalt wurde in die Zwischenablage kopiert.");
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      alert("Inhalt wurde in die Zwischenablage kopiert.");
    } catch {
      alert("Kopieren fehlgeschlagen. Bitte manuell kopieren.");
    }
  }
}

// Write-Fallback: Öffnet about:blank, schreibt HTML + Download-Button + Copy-Button + <pre>
function tryDownloadOrOpen(filename, text, type = "text/plain") {
  // 1) Regulären Download versuchen
  try {
    download(filename, text, type);
  } catch {}
  // 2) Fallback für Canvas/iframes: neues Tab mit Inhalt generieren
  if (isInIframe()) {
    const w = window.open("", "_blank");
    const b64 = (() => {
      try {
        return btoa(unescape(encodeURIComponent(text)));
      } catch {
        return btoa(text);
      }
    })();
    const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(
      filename
    )}</title>
<style>body{font-family:ui-sans-serif,system-ui,Arial,sans-serif;background:#0b0b0b;color:#e5e7eb;padding:16px}button{display:inline-block;padding:8px 12px;border-radius:8px;margin:4px;background:#10b981;color:#0b0b0b;border:0;cursor:pointer}pre{white-space:pre-wrap;word-break:break-word;background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px}</style>
<h1>${escapeHtml(filename)}</h1>
<p>Speichere die Datei mit <b>Cmd/Ctrl+S</b> oder nutze die Buttons unten.</p>
<button id="dlbtn">Download .md</button>
<button id="cpbtn" style="background:#60a5fa;color:#0b0b0b">Inhalt kopieren</button>
<pre id="content">${escapeHtml(text)}</pre>
<script>
(function(){
  const fname = ${JSON.stringify(filename)};
  const type = ${JSON.stringify(type)};
  const b64 = ${JSON.stringify(b64)};
  const dec=(b64)=>{try{return decodeURIComponent(escape(atob(b64)));}catch(e){return atob(b64)}};
  const text=dec(b64);

  // Inhalt sicherstellen
  const pre=document.getElementById('content'); if(pre && !pre.textContent) pre.textContent=text;

  // Robuster Download auf echten Klick
  document.getElementById('dlbtn').addEventListener('click', function(){
    try {
      const blob=new Blob([text],{type:type||'text/markdown'});
      const url=(window.URL||window.webkitURL).createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=fname; a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ (window.URL||window.webkitURL).revokeObjectURL(url); a.remove(); }, 1000);
    } catch(e) {
      alert('Download konnte nicht gestartet werden: '+e.message+'\nDu kannst den Inhalt unten auch mit Cmd/Ctrl+S speichern oder den Button "Inhalt kopieren" nutzen.');
    }
  }, { once:false });

  // Copy-Button Handler
  document.getElementById('cpbtn').addEventListener('click', function(){
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ alert('Inhalt wurde in die Zwischenablage kopiert.'); }).catch(function(){ throw new Error('Clipboard API verweigert'); });
      } else { throw new Error('Clipboard API nicht verfügbar'); }
    } catch(err) {
      try { var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('Inhalt wurde in die Zwischenablage kopiert.'); }
      catch(e2){ alert('Kopieren fehlgeschlagen. Bitte Text manuell markieren und kopieren.'); }
    }
  }, { once:false });
})();
</script>`;

    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } else {
      // Letzter Fallback: data:URL öffnen
      const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
      const tmp = document.createElement("a");
      tmp.href = dataUrl;
      tmp.target = "_blank";
      document.body.appendChild(tmp);
      tmp.click();
      tmp.remove();
    }
  }
}

function uid() {
  try {
    return crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `id-${Math.random().toString(36).slice(2)}`;
  }
}

/* ---------- Markdown/Frontmatter Helpers ---------- */
function toIsoDateOnly(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function normalizeSlug(slug, publishedAt) {
  // Ziel: yyyy-mm-dd-slug
  const base = (slug || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const hasDate = /^\d{4}-\d{2}-\d{2}-/.test(base);
  const datePart = toIsoDateOnly(publishedAt || new Date());
  return hasDate ? base : `${datePart}-${base || "post"}`;
}

function escapeYaml(str = "") {
  return String(str).replace(/"/g, '\\"');
}

function isPlausibleUrl(u) {
  if (!u) return false;
  try {
    const x = new URL(u);
    return !!x.protocol && !!x.host;
  } catch {
    return false;
  }
}

function postToMarkdown(post) {
  const slug = normalizeSlug(post.slug, post.publishedAt);
  const tags = Array.isArray(post.tags)
    ? post.tags
    : String(post.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
  const fm = [
    "---",
    `id: ${post.id || uid()}`,
    `title: "${escapeYaml(post.title || "Ohne Titel")}"`,
    `excerpt: "${escapeYaml(post.excerpt || "")}"`,
    `slug: "${slug}"`,
    `published: ${!!post.published}`,
    `publishedAt: ${post.publishedAt || new Date().toISOString()}`,
    `tags: [${tags.map((t) => `"${escapeYaml(t)}"`).join(", ")}]`,
    `coverImage: "${escapeYaml(post.coverImage || "")}"`,
    `author: "${escapeYaml(post.author || "")}"`,
    "---",
    (post.bodyMd || "").trim() || "(Inhalt folgt)\n",
  ].join("\n");
  return { slug, content: fm };
}

function exportPostAsMarkdown(post) {
  const { slug, content } = postToMarkdown(post);
  const fname = `content/posts/${slug}.md`;
  tryDownloadOrOpen(fname, content, "text/markdown");
}

function exportAllPostsAsMarkdown(posts) {
  (posts || []).forEach((p) => exportPostAsMarkdown(p));
}

/* ---------- Default Content ---------- */
const DEFAULT_SETTINGS = {
  brand: "Coach Milo",
  heroTitle: "Die Fitness-App mit deinem persönlichen KI-Coach",
  heroSubtitle:
    "Individuelle Trainingspläne, die deine Situation, dein Niveau und deine Fortschritte berücksichtigen.",
  releaseBanner: "Ab Oktober 2025 im App Store & Play Store",
  betaCta: "Teste Coach Milo schon vor dem Release",
  accent: "#4ade80",
  heroImageMode: "inline", // "inline" | "url"
  heroImageUrl: "/hero-image.png",
};

const DEFAULT_FEATURES = [
  {
    id: "f1",
    title: "Individuelle Trainingspläne",
    body:
      "Milo baut deinen Plan aus Zielen, Equipment und Zeit. Passt Sätze/Wdh. automatisch an.",
    icon: "💪",
  },
  {
    id: "f2",
    title: "Fortschritts-Tracking",
    body:
      "Tracke Workouts schnell. Milo erkennt Plateaus und empfiehlt passende Methoden.",
    icon: "📈",
  },
  {
    id: "f3",
    title: "Übungsbibliothek (GIFs)",
    body:
      "Saubere Ausführung dank visueller Beispiele. Alternativen für jedes Niveau.",
    icon: "🎞️",
  },
  {
    id: "f4",
    title: "Feedback-Loops",
    body:
      "Nach jedem Training bekommst du kurzes, konstruktives Feedback – wie vom Coach.",
    icon: "🗣️",
  },
  {
    id: "f5",
    title: "Sharing & Motivation",
    body: "Teile Highlights mit Freunden – für mehr Spaß und Motivation.",
    icon: "✨",
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
  {
    id: "q3",
    question: "Wie funktioniert die Beta?",
    answer:
      "Du meldest dich mit E-Mail an und bekommst frühzeitig Zugang. Feedback hilft uns, Milo zu schärfen.",
  },
];

const DEFAULT_POSTS = [
  {
    id: "p1",
    slug: "2025-08-30-roadmap-oktober",
    title: "Roadmap bis Oktober",
    excerpt: "Was bis zum Release passiert – und wie du mitwirken kannst.",
    bodyMd:
      "## Roadmap\n\n- Feinschliff der Trainingsplan-Engine\n- Beta-Feedback integrieren\n- App & Play Store Listings vorbereiten\n",
    published: true,
    publishedAt: new Date().toISOString(),
    tags: ["roadmap"],
    coverImage: "",
    author: "Coach Milo Team",
  },
];

/* ---------- Router ---------- */
const PAGES = [
  "Home",
  "Features",
  "How",
  "Blog",
  "FAQ",
  "Kontakt",
  "Recht",
  "Admin",
  "Debug",
];

function usePage() {
  const [page, setPage] = useState(() => {
    const hash =
      (typeof window !== "undefined" && location.hash.replace("#", "")) ||
      "Home";
    return PAGES.includes(hash) ? hash : "Home";
  });
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace("#", "");
      if (PAGES.includes(h)) setPage(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (p) => {
    location.hash = p;
    setPage(p);
  };
  return { page, navigate };
}

/* ---------- UI Components ---------- */
const Container = ({ children }) => (
  <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>
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
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
          {title}
        </h2>
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

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "primary"
      ? "bg-emerald-500/90 hover:bg-emerald-400 text-black"
      : variant === "ghost"
      ? "hover:bg-white/10 text-white"
      : "bg-white/10 hover:bg-white/20 text-white";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-400 ${
      props.className || ""
    }`}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400 ${
      props.className || ""
    }`}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-400 ${
      props.className || ""
    }`}
  />
);

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
  // Inline-SVG Platzhalter
  return (
    <div className="mx-auto max-w-3xl w-full rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <svg
        viewBox="0 0 1200 600"
        role="img"
        aria-label="Coach Milo Preview"
        className="w-full h-auto"
      >
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={settings.accent} />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect width="1200" height="600" fill="#0a0a0a" />
        <rect
          x="60"
          y="50"
          width="320"
          height="500"
          rx="36"
          fill="url(#g)"
          opacity="0.25"
        />
        <rect
          x="500"
          y="50"
          width="640"
          height="500"
          rx="24"
          fill="url(#g)"
          opacity="0.15"
        />
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

/* ---------- Beta Signup ---------- */
function BetaForm({ settings }) {
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("Hypertrophie");
  const [exp, setExp] = useState("Fortgeschritten");
  const [consent, setConsent] = useState(false);
  const [ok, setOk] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!email || !consent)
      return setOk("Bitte E-Mail eintragen und Einwilligung bestätigen.");
    const now = new Date().toISOString();
    const current = loadLS(LS_KEYS.signups, []);
    current.push({ id: uid(), email, goal, experience: exp, createdAt: now });
    saveLS(LS_KEYS.signups, current);
    setOk("Danke! Wir melden uns mit Beta-Details.");
    setEmail("");
    setConsent(false);
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
      <Select
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        aria-label="Ziel"
      >
        <option>Hypertrophie</option>
        <option>Fettverlust</option>
        <option>Athletik</option>
        <option>Allgemeine Fitness</option>
      </Select>
      <Select
        value={exp}
        onChange={(e) => setExp(e.target.value)}
        aria-label="Erfahrung"
      >
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
        <Button type="submit">
          {settings?.betaCta || DEFAULT_SETTINGS.betaCta}
        </Button>
      </div>
      {ok && <p className="text-emerald-300 text-sm md:col-span-4">{ok}</p>}
    </form>
  );
}

/* ---------- Markdown (mini, safe) ---------- */
function renderMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/^###\s(.+)$/gm, "\n$1\n——————————")
    .replace(/^##\s(.+)$/gm, "\n$1\n————————")
    .replace(/^#\s(.+)$/gm, "\n$1\n———————")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
}

/* ---------- Pages ---------- */
function HomePage({ settings, features, faqs, posts }) {
  const latestPosts = (posts || [])
    .filter((p) => p.published)
    .sort(
      (a, b) =>
        new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    )
    .slice(0, 2);

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black py-16 md:py-24"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
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
            Coach Milo ist eine Fitness-App, die dir einen echten KI-Coach an
            die Seite stellt. Kein Rätselraten mehr, sondern klare, individuell
            angepasste Pläne.
          </p>
        </div>
      </Section>

      {/* Warum brauchst du das? */}
      <Section title="Warum Coach Milo?">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-white font-medium mb-2">
              Pläne, die zu dir passen
            </h3>
            <p className="text-white/70 text-sm">
              Milo berücksichtigt deine Ziele, dein Equipment und deinen Alltag.
              Jede Einheit ist auf dich zugeschnitten.
            </p>
          </Card>
          <Card>
            <h3 className="text-white font-medium mb-2">
              Mit dir besser werden
            </h3>
            <p className="text-white/70 text-sm">
              Deine Fortschritte fließen direkt in den Plan ein. So bleibst du
              motiviert – ohne Stagnation.
            </p>
          </Card>
        </div>
      </Section>

      {/* Wie bringt Milo dich weiter? */}
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

      {/* CTA (unten) */}
      <Section>
        <div className="flex flex-col items-center text-center gap-3">
          <h3 className="text-white text-xl font-semibold">
            Frühen Zugang sichern
          </h3>
          <p className="text-white/70">
            Melde dich für die Beta an und werde Teil der Entwicklung.
          </p>
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
                <summary className="text-white font-medium cursor-pointer">
                  {q.question}
                </summary>
                <p className="text-white/70 text-sm mt-2">{q.answer}</p>
              </details>
            </Card>
          ))}
        </div>
      </Section>

      {/* Letzte zwei Blogartikel */}
      <Section title="Neu im Blog">
        <div className="space-y-4">
          {latestPosts.length === 0 && (
            <p className="text-white/60 text-sm">
              Noch keine Artikel veröffentlicht.
            </p>
          )}
          {latestPosts.map((p) => (
            <Card key={p.id}>
              <h3 className="text-white font-medium">{p.title}</h3>
              {p.coverImage && isPlausibleUrl(p.coverImage) && (
                <img
                  src={p.coverImage}
                  alt="Cover"
                  className="mt-2 rounded-lg border border-white/10"
                />
              )}
              <p className="text-white/60 text-sm mt-1">{p.excerpt}</p>
              <details className="mt-3">
                <summary className="cursor-pointer text-white/70 text-sm">
                  Lesen
                </summary>
                <article className="prose prose-invert mt-2 text-white/80 text-sm whitespace-pre-wrap">
                  {renderMarkdown(p.bodyMd)}
                </article>
              </details>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}

function FeaturesPage({ features }) {
  return (
    <Section
      title="Features"
      subtitle="Mehr als Tracking: Milo denkt mit."
    >
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
    <Section
      title="So funktioniert’s"
      subtitle="Der Coach-Kreislauf – iterativ zur Bestform."
    >
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

function BlogPage({ posts }) {
  const published = posts.filter((p) => p.published);
  return (
    <Section
      title="Blog & Updates"
      subtitle="Transparente Roadmap, Einblicke, Learnings."
    >
      <div className="space-y-4">
        {published.map((p) => (
          <Card key={p.id}>
            <h3 className="text-white font-medium">{p.title}</h3>
            {p.coverImage && isPlausibleUrl(p.coverImage) && (
              <img
                src={p.coverImage}
                alt="Cover"
                className="mt-2 rounded-lg border border-white/10"
              />
            )}
            <p className="text-white/60 text-sm mt-1">{p.excerpt}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-white/70 text-sm">
                Lesen
              </summary>
              <article className="prose prose-invert mt-2 text-white/80 text-sm whitespace-pre-wrap">
                {renderMarkdown(p.bodyMd)}
              </article>
            </details>
          </Card>
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

function KontaktPage() {
  return (
    <Section
      title="Kontakt"
      subtitle="Fragen? Schreib uns – wir freuen uns."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-white/80 text-sm">E-Mail: hello@coachmilo.app</p>
          <p className="text-white/60 text-xs mt-2">
            Hinweis: Während der Beta antworten wir in der Regel innerhalb von
            48 Stunden.
          </p>
        </Card>
        <Card>
          <p className="text-white/80 text-sm">Geschäftlich/PR: press@coachmilo.app</p>
          <p className="text-white/60 text-xs mt-2">
            Wir schicken dir gern unser Factsheet.
          </p>
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
            Wir verarbeiten Beta-E-Mails ausschließlich zur Kontaktaufnahme im
            Rahmen der Beta. Auf Anfrage löschen wir deine Daten umgehend.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Admin ---------- */
function AdminPage({
  settings,
  setSettings,
  features,
  setFeatures,
  faqs,
  setFaqs,
  posts,
  setPosts,
}) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");

  function tryLogin(e) {
    e.preventDefault();
    const stored = loadLS(LS_KEYS.adminPw, null) || "milo-admin";
    if (pw === stored) setAuthed(true);
    else alert("Falsches Passwort");
  }

  function changePw() {
    const npw = prompt("Neues Admin-Passwort setzen:");
    if (npw && npw.length >= 6)
      localStorage.setItem(LS_KEYS.adminPw, JSON.stringify(npw));
    else alert("Mindestens 6 Zeichen.");
  }

  function addFeature() {
    setFeatures([
      ...features,
      { id: uid(), title: "Neues Feature", body: "Beschreibung", icon: "⭐" },
    ]);
  }
  function addFaq() {
    setFaqs([
      ...faqs,
      { id: uid(), question: "Neue Frage?", answer: "Antwort…" },
    ]);
  }
  function addPost() {
    setPosts([
      ...posts,
      {
        id: uid(),
        slug: normalizeSlug("neuer-post", new Date().toISOString()),
        title: "Neuer Post",
        excerpt: "Kurzbeschreibung",
        bodyMd: "# Überschrift\n\nInhalt…",
        published: false,
        publishedAt: new Date().toISOString(),
        tags: [],
        coverImage: "",
        author: "",
      },
    ]);
  }

  function saveAll() {
    saveLS(LS_KEYS.settings, settings);
    saveLS(LS_KEYS.features, features);
    saveLS(LS_KEYS.faqs, faqs);
    saveLS(LS_KEYS.posts, posts);
    alert("Gespeichert.");
  }

  function exportAll() {
    const payload = {
      settings,
      features,
      faqs,
      posts,
      exportedAt: new Date().toISOString(),
    };
    tryDownloadOrOpen(
      "coach-milo-content.json",
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function exportSiteJsonOnly() {
    const site = { settings, exportedAt: new Date().toISOString() };
    tryDownloadOrOpen(
      "site.json",
      JSON.stringify(site, null, 2),
      "application/json"
    );
  }

  function importAll(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.settings) setSettings(data.settings);
        if (data.features) setFeatures(data.features);
        if (data.faqs) setFaqs(data.faqs);
        if (data.posts) setPosts(data.posts);
        alert("Import erfolgreich.");
      } catch (e) {
        alert("Import fehlgeschlagen: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function exportSignupsCsv() {
    const rows = loadLS(LS_KEYS.signups, []);
    const header = ["id", "email", "goal", "experience", "createdAt"].join(",");
    const lines = rows.map((r) =>
      [r.id, r.email, r.goal, r.experience, r.createdAt].join(",")
    );
    const csv = [header, ...lines].join("\n");
    tryDownloadOrOpen("beta-signups.csv", csv, "text/csv");
  }

  return !authed ? (
    <Section
      title="Admin Login"
      subtitle="Übergangs-Login (clientseitig). Bitte Passwort später ändern."
    >
      <div className="max-w-sm">
        <form onSubmit={tryLogin} className="space-y-3">
          <Input
            type="password"
            placeholder="Passwort"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Button type="submit">Login</Button>
          <p className="text-white/50 text-xs">Default: milo-admin</p>
        </form>
      </div>
    </Section>
  ) : (
    <Section
      title="Admin"
      subtitle="Inhalte bearbeiten & exportieren (file-basiert)"
    >
      <div className="grid gap-4">
        <Card>
          <h3 className="text-white font-medium mb-3">Site Settings</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              value={settings.brand}
              onChange={(e) =>
                setSettings({ ...settings, brand: e.target.value })
              }
              placeholder="Brand"
            />
            <Input
              value={settings.releaseBanner}
              onChange={(e) =>
                setSettings({ ...settings, releaseBanner: e.target.value })
              }
              placeholder="Release-Banner"
            />
            <Input
              value={settings.heroTitle}
              onChange={(e) =>
                setSettings({ ...settings, heroTitle: e.target.value })
              }
              placeholder="Hero Titel"
            />
            <Input
              value={settings.heroSubtitle}
              onChange={(e) =>
                setSettings({ ...settings, heroSubtitle: e.target.value })
              }
              placeholder="Hero Untertitel"
            />
            <Input
              value={settings.betaCta}
              onChange={(e) =>
                setSettings({ ...settings, betaCta: e.target.value })
              }
              placeholder="Beta CTA"
            />
            <Input
              value={settings.accent}
              onChange={(e) =>
                setSettings({ ...settings, accent: e.target.value })
              }
              placeholder="Akzentfarbe (#hex)"
            />
            <div className="md:col-span-1">
              <label className="text-white/70 text-sm">Hero-Bild Modus</label>
              <Select
                value={settings.heroImageMode}
                onChange={(e) =>
                  setSettings({ ...settings, heroImageMode: e.target.value })
                }
              >
                <option value="inline">Inline (SVG Platzhalter)</option>
                <option value="url">Bild-URL</option>
              </Select>
            </div>
            <Input
              value={settings.heroImageUrl}
              onChange={(e) =>
                setSettings({ ...settings, heroImageUrl: e.target.value })
              }
              placeholder="Hero Bild URL (bei Modus: url)"
            />
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button onClick={saveAll}>Speichern</Button>
            <Button variant="ghost" onClick={exportAll}>
              Export JSON
            </Button>
            <Button variant="ghost" onClick={exportSiteJsonOnly}>
              site.json speichern
            </Button>
            <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <span className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">
                Import JSON
              </span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={importAll}
              />
            </label>
            <Button variant="ghost" onClick={exportSignupsCsv}>
              Beta-Signups CSV
            </Button>
            <Button variant="ghost" onClick={changePw}>
              Passwort ändern
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Features</h3>
            <Button onClick={addFeature}>+ Feature</Button>
          </div>
          <div className="grid gap-3">
            {features.map((f, idx) => (
              <div
                key={f.id}
                className="grid md:grid-cols-12 gap-2 items-start"
              >
                <Input
                  className="md:col-span-1"
                  value={f.icon}
                  onChange={(e) => {
                    const v = [...features];
                    v[idx] = { ...v[idx], icon: e.target.value };
                    setFeatures(v);
                  }}
                />
                <Input
                  className="md:col-span-3"
                  value={f.title}
                  onChange={(e) => {
                    const v = [...features];
                    v[idx] = { ...v[idx], title: e.target.value };
                    setFeatures(v);
                  }}
                />
                <Input
                  className="md:col-span-7"
                  value={f.body}
                  onChange={(e) => {
                    const v = [...features];
                    v[idx] = { ...v[idx], body: e.target.value };
                    setFeatures(v);
                  }}
                />
                <Button
                  variant="ghost"
                  className="md:col-span-1"
                  onClick={() =>
                    setFeatures(features.filter((x) => x.id !== f.id))
                  }
                >
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">FAQ</h3>
            <Button onClick={addFaq}>+ Frage</Button>
          </div>
          <div className="grid gap-3">
            {faqs.map((q, idx) => (
              <div
                key={q.id}
                className="grid md:grid-cols-12 gap-2 items-start"
              >
                <Input
                  className="md:col-span-5"
                  value={q.question}
                  onChange={(e) => {
                    const v = [...faqs];
                    v[idx] = { ...v[idx], question: e.target.value };
                    setFaqs(v);
                  }}
                />
                <Input
                  className="md:col-span-6"
                  value={q.answer}
                  onChange={(e) => {
                    const v = [...faqs];
                    v[idx] = { ...v[idx], answer: e.target.value };
                    setFaqs(v);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => setFaqs(faqs.filter((x) => x.id !== q.id))}
                >
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Blog-Posts</h3>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => exportAllPostsAsMarkdown(posts)}>
                Alle Posts als .md speichern
              </Button>
              <Button onClick={addPost}>+ Post</Button>
            </div>
          </div>
          <p className="text-white/50 text-xs mb-2">
            Hinweis: In eingebetteten Umgebungen (Canvas/iframe) kann der
            automatische Download blockiert sein. In dem Fall öffnet sich ein
            neuer Tab mit dem Markdown – dort mit Cmd/Ctrl+S speichern oder
            „Inhalt kopieren“ nutzen.
          </p>
          <div className="grid gap-3">
            {posts.map((p, idx) => (
              <div key={p.id} className="grid gap-2">
                <div className="grid md:grid-cols-12 gap-2 items-start">
                  <Input
                    className="md:col-span-3"
                    value={p.slug}
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, {
                        slug: e.target.value,
                      })
                    }
                    placeholder="yyyy-mm-dd-slug"
                  />
                  <Input
                    className="md:col-span-3"
                    value={p.title}
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, {
                        title: e.target.value,
                      })
                    }
                    placeholder="Titel"
                  />
                  <Input
                    className="md:col-span-3"
                    value={p.excerpt}
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, {
                        excerpt: e.target.value,
                      })
                    }
                    placeholder="Kurzbeschreibung"
                  />
                  <Input
                    className="md:col-span-3"
                    value={p.author || ""}
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, {
                        author: e.target.value,
                      })
                    }
                    placeholder="Author"
                  />
                </div>
                <div className="grid md:grid-cols-12 gap-2 items-start">
                  <Input
                    className="md:col-span-6"
                    value={
                      (Array.isArray(p.tags) ? p.tags.join(", ") : p.tags) || ""
                    }
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, { tags: e.target.value })
                    }
                    placeholder="Tags (kommagetrennt)"
                  />
                  <Input
                    className="md:col-span-6"
                    value={p.coverImage || ""}
                    onChange={(e) =>
                      updatePost(setPosts, posts, idx, {
                        coverImage: e.target.value,
                      })
                    }
                    placeholder="Cover-Image-URL"
                  />
                </div>
                <Textarea
                  rows={8}
                  value={p.bodyMd}
                  onChange={(e) =>
                    updatePost(setPosts, posts, idx, { bodyMd: e.target.value })
                  }
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-2 text-white/80 text-sm">
                    <input
                      type="checkbox"
                      checked={!!p.published}
                      onChange={(e) =>
                        updatePost(setPosts, posts, idx, {
                          published: e.target.checked,
                          publishedAt: e.target.checked
                            ? p.publishedAt || new Date().toISOString()
                            : p.publishedAt,
                        })
                      }
                    />
                    Veröffentlicht
                  </label>
                  <label className="inline-flex items-center gap-2 text-white/60 text-xs">
                    <span>Datum:</span>
                    <Input
                      type="datetime-local"
                      value={
                        p.publishedAt
                          ? new Date(p.publishedAt).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        updatePost(setPosts, posts, idx, {
                          publishedAt: new Date(e.target.value).toISOString(),
                          slug: normalizeSlug(
                            p.slug,
                            new Date(e.target.value).toISOString()
                          ),
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    onClick={() => exportPostAsMarkdown(posts[idx])}
                  >
                    Als .md speichern
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const { content } = postToMarkdown(posts[idx]);
                      copyToClipboard(content);
                    }}
                  >
                    .md in Zwischenablage
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setPosts(posts.filter((x) => x.id !== p.id))
                    }
                  >
                    Entfernen
                  </Button>
                </div>
                <div className="h-px bg-white/10" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

function updatePost(setter, posts, idx, patch) {
  const v = [...posts];
  v[idx] = { ...v[idx], ...patch };
  setter(v);
}

/* ---------- Debug / Tests ---------- */
function runTests(state) {
  const results = [];
  function test(name, fn) {
    try {
      const ok = !!fn();
      results.push({ name, ok });
    } catch (e) {
      results.push({ name, ok: false, err: e?.message || String(e) });
    }
  }

  test(
    "Release-Banner vorhanden",
    () =>
      typeof state.settings.releaseBanner === "string" &&
      state.settings.releaseBanner.length > 5
  );
  test(
    "Hero-Titel erwähnt Fitness-App",
    () => /Fitness\-?App/i.test(state.settings.heroTitle)
  );
  test("Hero hat Bild-Konfiguration", () =>
    ["inline", "url"].includes(state.settings.heroImageMode));
  test(
    "Beta-CTA Text gesetzt",
    () => typeof state.settings.betaCta === "string" && /Teste|Beta/i.test(state.settings.betaCta)
  );
  test("Mind. 3 Features vorhanden", () => state.features.length >= 3);
  test("FAQ nicht leer", () => state.faqs.length >= 1);
  test("Blog-Post Beispiel vorhanden", () =>
    state.posts.some((p) => p.published));
  test("Slug-Schema korrekt", () =>
    state.posts.every((p) =>
      /^\d{4}-\d{2}-\d{2}-[a-z0-9\-]+$/.test(normalizeSlug(p.slug, p.publishedAt))
    ));
  test("published -> publishedAt gesetzt", () =>
    state.posts.every((p) => !p.published || !!p.publishedAt));
  test("Cover-URL plausibel (falls gesetzt)", () =>
    state.posts.every((p) => !p.coverImage || isPlausibleUrl(p.coverImage)));
  test("Signup persistiert & wird zurückgerollt", () => {
    const before = loadLS(LS_KEYS.signups, []);
    const temp = {
      id: uid(),
      email: "test@example.com",
      goal: "Hypertrophie",
      experience: "Einsteiger",
      createdAt: new Date().toISOString(),
    };
    const next = [...before, temp];
    saveLS(LS_KEYS.signups, next);
    const after = loadLS(LS_KEYS.signups, []);
    const ok =
      after.length === before.length + 1 &&
      after[after.length - 1].email === "test@example.com";
    saveLS(LS_KEYS.signups, before);
    return ok;
  });
  test(
    "Admin Default-Passwort greift",
    () => (loadLS(LS_KEYS.adminPw, null) || "milo-admin") === "milo-admin"
  );

  return results;
}

function DebugPage({ settings, features, faqs, posts }) {
  const tests = runTests({ settings, features, faqs, posts });
  return (
    <Section title="Debug & Tests" subtitle="Schnelle Checks für Inhalte & Flows.">
      <Card>
        <div className="space-y-2">
          {tests.map((t, i) => (
            <div
              key={i}
              className={`flex items-center justify-between text-sm ${
                t.ok ? "text-emerald-300" : "text-red-300"
              }`}
            >
              <span>{t.name}</span>
              <span>
                {t.ok ? "PASS" : "FAIL"}
                {t.err ? ` – ${t.err}` : ""}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}

/* ---------- Shell ---------- */
function Shell({ settings, onNavigate, active }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/40">
      <Container>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${settings.accent}, #22c55e)`,
              }}
              aria-hidden
            />
            <span className="text-white font-semibold">{settings.brand}</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {PAGES.map((p) => (
              <button
                key={p}
                onClick={() => onNavigate(p)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  active === p ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
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

/* ---------- App Root ---------- */
export default function App() {
  const { page, navigate } = usePage();
  const [settings, setSettings] = useState(() =>
    loadLS(LS_KEYS.settings, DEFAULT_SETTINGS)
  );
  const [features, setFeatures] = useState(() =>
    loadLS(LS_KEYS.features, DEFAULT_FEATURES)
  );
  const [faqs, setFaqs] = useState(() => loadLS(LS_KEYS.faqs, DEFAULT_FAQS));
  const [posts, setPosts] = useState(() => loadLS(LS_KEYS.posts, DEFAULT_POSTS));

  useEffect(() => saveLS(LS_KEYS.settings, settings), [settings]);
  useEffect(() => saveLS(LS_KEYS.features, features), [features]);
  useEffect(() => saveLS(LS_KEYS.faqs, faqs), [faqs]);
  useEffect(() => saveLS(LS_KEYS.posts, posts), [posts]);
  useEffect(() => {
    document.documentElement.className = "bg-black";
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Shell settings={settings} onNavigate={navigate} active={page} />

      {page === "Home" && (
        <HomePage
          settings={settings}
          features={features}
          faqs={faqs}
          posts={posts}
        />
      )}
      {page === "Features" && <FeaturesPage features={features} />}
      {page === "How" && <HowPage />}
      {page === "Blog" && <BlogPage posts={posts} />}
      {page === "FAQ" && <FAQPage faqs={faqs} />}
      {page === "Kontakt" && <KontaktPage />}
      {page === "Recht" && <LegalPage />}
      {page === "Admin" && (
        <AdminPage
          settings={settings}
          setSettings={setSettings}
          features={features}
          setFeatures={setFeatures}
          faqs={faqs}
          setFaqs={setFaqs}
          posts={posts}
          setPosts={setPosts}
        />
      )}
      {page === "Debug" && (
        <DebugPage
          settings={settings}
          features={features}
          faqs={faqs}
          posts={posts}
        />
      )}

      <footer className="border-t border-white/10 mt-10">
        <Container>
          <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-white/50 text-sm">
            <div>© {new Date().getFullYear()} {settings.brand}</div>
            <div className="flex items-center gap-3">
              <a className="hover:text-white" onClick={() => (location.hash = "Recht")}>
                Impressum & Datenschutz
              </a>
              <span>•</span>
              <a className="hover:text-white" onClick={() => (location.hash = "Admin")}>
                Admin
              </a>
              <span>•</span>
              <span>Ab Oktober 2025</span>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}

