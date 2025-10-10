/* App.jsx – Coach Milo
   - Paste Sanitizer (Button + Auto beim Speichern)
   - Robustes createPost (mehrere Insert-Varianten + Fehlermeldung)
   - WYSIWYG only (RichTextEditor)
   - Tags + SEO-Overrides
   - Admin-Link nur im Footer
   - Impressum-Seite + Footer-Link auf /privacy-policy.html
*/
import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { AuthProvider, useAuth } from "./lib/auth";
import PostPage from "./PostPage";
import RichTextEditor from "./RichTextEditor";
import { useHead } from "./lib/useHead";
import {
  STORAGE_BUCKET_IMAGES,
  STORAGE_BUCKET_MEDIA,
  MEDIA_UPLOAD_BUCKETS,
  formatBucketChoices,
  isMissingBucketError,
} from "./lib/storageBuckets";

/* ---------- UI ---------- */
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

const ASPECT_CLASS_MAP = {
  "16:9": "aspect-video",
  "16/9": "aspect-video",
  landscape: "aspect-video",
  "9:16": "aspect-[9/16]",
  "9/16": "aspect-[9/16]",
  hochformat: "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
  "4/5": "aspect-[4/5]",
  story: "aspect-[4/5]",
  "1:1": "aspect-square",
  "1/1": "aspect-square",
  square: "aspect-square",
};
const DEFAULT_ASPECT_CLASS = ASPECT_CLASS_MAP["16:9"];

function getAspectClass(ratio) {
  if (!ratio) return DEFAULT_ASPECT_CLASS;
  const key = ratio.toString().trim().toLowerCase();
  return ASPECT_CLASS_MAP[key] || DEFAULT_ASPECT_CLASS;
}

function guessVideoMime(url) {
  if (!url) return "video/mp4";
  const clean = url.split("?")[0]?.toLowerCase() || "";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogv") || clean.endsWith(".ogg")) return "video/ogg";
  if (clean.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

const MediaPlayer = ({ settings }) => {
  const videoUrl = typeof settings?.teaserVideoUrl === "string" ? settings.teaserVideoUrl.trim() : "";
  const posterUrl =
    typeof settings?.teaserVideoPosterUrl === "string" && settings.teaserVideoPosterUrl.trim().length
      ? settings.teaserVideoPosterUrl.trim()
      : settings?.teaserVideoPosterFallback;
      : DEFAULT_SETTINGS.teaserVideoPosterUrl;
  const aspectClass = getAspectClass(settings?.teaserVideoRatio);
  const hasVideo = Boolean(videoUrl);
  const videoMime = guessVideoMime(videoUrl);

  return (
    <Card>
      <div className="space-y-4" aria-labelledby="media-player-heading">
        <div>
          <h3 id="media-player-heading" className="text-white font-medium">
            Coach Milo in Aktion
          </h3>
          <p className="text-white/70 text-sm">Ein kurzer Einblick in das Erlebnis mit deinem KI-Coach.</p>
        </div>
        <div
          className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${aspectClass}`}
          aria-describedby="media-player-description"
        >
          {hasVideo ? (
            <video
              controls
              preload="metadata"
              playsInline
              poster={posterUrl || undefined}
              className="h-full w-full object-cover"
              controlsList="nodownload noremoteplayback"
            >
              <source src={videoUrl} type={videoMime} />
              Dein Browser unterstützt das Abspielen dieses Videos nicht.
            </video>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center">
              <p className="text-white/50 text-sm leading-relaxed">Derzeit steht kein Teaser-Video zur Verfügung.</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Lade dein Teaser-Video im Admin unter <strong>Einstellungen → Teaser Video</strong> hoch. Das Hosting
                erfolgt im Supabase Storage-Bucket <code>cms_media</code>.
              </p>
            </div>
          )}
        </div>
        <div className="space-y-1" id="media-player-description">
          <p className="text-white/50 text-xs">Sobald das Teaser-Video verfügbar ist, wird es hier abgespielt.</p>
          <p className="text-white/50 text-xs">Verwalte Video, Poster &amp; Seitenverhältnis direkt im CMS.</p>
          <p className="text-white/40 text-[11px] leading-relaxed">
            Öffne den Admin-Bereich → <strong>Einstellungen</strong> → <strong>Teaser Video</strong>. Dort kannst du die
            Datei nach Supabase hochladen, ein Vorschaubild setzen und zwischen 16:9, 9:16 oder anderen Formaten
            wechseln.
          </p>
        </div>
      </div>
    </Card>
  );
};

const mergeSettingsRow = (row) => ({
  ...SETTINGS_ROW_DEFAULTS,
  ...(row || {}),
  id: row?.id ?? SETTINGS_ROW_DEFAULTS.id,
});

const toStoragePath = (prefix, fileName) => {
  const clean = (fileName || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return `${prefix}/${Date.now()}-${clean || "upload"}`;
};

const Button = ({ children, onClick, variant = "primary", type = "button", className = "" }) => {
  const base = "inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm transition outline-none focus:ring-2";
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
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand ${p.className || ""}`}
  />
);
const Select = (p) => (
  <select
    {...p}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand ${p.className || ""}`}
  />
);
const Textarea = (p) => (
  <textarea
    {...p}
    className={`w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand ${p.className || ""}`}
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
  heroImageMode: "inline",
  heroImageUrl: "",
  teaserVideoUrl: "",
  teaserVideoPosterUrl: "",
  teaserVideoPosterFallback: "/preview.jpg",
  teaserVideoPosterUrl: "/preview.jpg",
  teaserVideoRatio: "16:9",
};
const SETTINGS_ROW_DEFAULTS = {
  id: 1,
  hero_image_mode: "url",
  hero_image_url: "",
  teaser_video_url: "",
  teaser_video_poster_url: "",
  teaser_video_ratio: "16:9",
};

const ASPECT_CLASS_MAP = {
  "16:9": "aspect-video",
  "16/9": "aspect-video",
  "landscape": "aspect-video",
  "9:16": "aspect-[9/16]",
  "9/16": "aspect-[9/16]",
  "hochformat": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
  "4/5": "aspect-[4/5]",
  "story": "aspect-[4/5]",
  "1:1": "aspect-square",
  "1/1": "aspect-square",
  "square": "aspect-square",
};
const DEFAULT_ASPECT_CLASS = ASPECT_CLASS_MAP["16:9"];

function getAspectClass(ratio) {
  if (!ratio) return DEFAULT_ASPECT_CLASS;
  const key = ratio.toString().trim().toLowerCase();
  return ASPECT_CLASS_MAP[key] || DEFAULT_ASPECT_CLASS;
}

function guessVideoMime(url) {
  if (!url) return "video/mp4";
  const clean = url.split("?")[0]?.toLowerCase() || "";
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogv") || clean.endsWith(".ogg")) return "video/ogg";
  if (clean.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

const mergeSettingsRow = (row) => ({
  ...SETTINGS_ROW_DEFAULTS,
  ...(row || {}),
  id: row?.id ?? SETTINGS_ROW_DEFAULTS.id,
});

const toStoragePath = (prefix, fileName) => {
  const clean = (fileName || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return `${prefix}/${Date.now()}-${clean || "upload"}`;
};
const DEFAULT_FEATURES = [
  { id: "f1", title: "Individuelle Trainingspläne", body: "Milo baut deinen Plan aus Zielen, Equipment und Zeit. Passt Sätze/Wdh. automatisch an.", icon: "💪" },
  { id: "f2", title: "Fortschritts-Tracking", body: "Tracke Workouts schnell. Milo erkennt Plateaus und empfiehlt passende Methoden.", icon: "📈" },
  { id: "f3", title: "Übungsbibliothek (GIFs)", body: "Saubere Ausführung dank visueller Beispiele. Alternativen für jedes Niveau.", icon: "🎞️" },
];
const DEFAULT_FAQS = [
  { id: "q1", question: "Für wen ist Coach Milo geeignet?", answer: "Für Einsteiger bis Fortgeschrittene. Milo passt Volumen und Intensität an deine Erfahrung an." },
  { id: "q2", question: "Brauche ich spezielles Equipment?", answer: "Nein. Du kannst im Studio, zu Hause oder unterwegs trainieren – Milo berücksichtigt dein Setup." },
];

/* ---------- Sanitizer ---------- */
/** Entfernt problematische Inhalte aus HTML:
 * - Tags: script, style, iframe, object, embed, form
 * - Inline-Events: on*
 * - href/src mit javascript:
 * - data:-Bilder (werden komplett entfernt)
 * - Inline style Attribute
 * - Leere Wrapper
 */
function sanitizeHTML(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "<p></p>";
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, "text/html");

  const removeTags = ["script", "style", "iframe", "object", "embed", "form"];
  removeTags.forEach((t) => doc.querySelectorAll(t).forEach((n) => n.remove()));

  const walk = (el) => {
    if (el.nodeType !== 1) return;
    // remove inline styles
    el.removeAttribute("style");

    // remove all on* attributes + dangerous URLs
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && attr.value) {
        const val = attr.value.trim().toLowerCase();
        if (val.startsWith("javascript:")) el.removeAttribute(attr.name);
        if (name === "src" && val.startsWith("data:image")) {
          if (el.tagName === "IMG") {
            el.remove();
            return;
          }
          el.removeAttribute("src");
        }
      }
    });

    [...el.children].forEach(walk);
  };
  [...doc.body.children].forEach(walk);

  // Entferne komplett leere Container
  doc.querySelectorAll("p,div,figure").forEach((n) => {
    if (!n.textContent.trim() && !n.querySelector("img,video,ul,ol,pre,code,blockquote,figcaption")) {
      n.remove();
    }
  });

  const html = doc.body.innerHTML.trim();
  return html || "<p></p>";
}

/* ---------- Hero ---------- */
// <- in App.jsx die gesamte HeroImage-Funktion so ersetzen
function HeroImage({ settings }) {
  // transparenter 1×1-Placeholder (nicht ändern)
  const PLACEHOLDER =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  // Wenn URL schon da, nutzen wir sie; sonst den Placeholder
  const src = settings.heroImageUrl || PLACEHOLDER;

  return (
    <img
      src={src}
      alt="Coach Milo App Preview"
      width={1600}
      height={900}
      // Hero ist wichtig fürs LCP → nicht lazy
      loading="eager"
      decoding="async"
      fetchPriority="high"
      // falls du responsive Varianten hast, kannst du srcSet/sizes ergänzen
      // srcSet={`${src}?w=640 640w, ${src}?w=960 960w, ${src}?w=1280 1280w, ${src}?w=1600 1600w`}
      // sizes="(max-width: 768px) 95vw, (max-width: 1280px) 80vw, 1200px"
      className="mx-auto max-w-3xl w-full rounded-2xl shadow-lg border border-white/10"
      // verhindert „harte“ Umbrüche auf dunklem Hintergrund
      style={{ backgroundColor: "#0b0b0b" }}
    />
  );
}


/* ---------- Beta Signup ---------- */
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
      const { error } = await supabase.from("cms_signups").insert({ email, goal, experience: exp });
      if (error) throw error;
      setOk("Danke! Wir melden uns mit Beta-Details.");
      setEmail(""); setConsent(false);
    } catch (err) {
      setOk("Fehler beim Anmelden: " + (err?.message || "Unbekannt"));
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
      <Input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className="md:col-span-2" />
      <Select value={goal} onChange={(e) => setGoal(e.target.value)}><option>Hypertrophie</option><option>Fettverlust</option><option>Athletik</option><option>Allgemeine Fitness</option></Select>
      <Select value={exp} onChange={(e) => setExp(e.target.value)}><option>Einsteiger</option><option>Fortgeschritten</option><option>Pro</option></Select>
      <div className="md:col-span-3 flex items-center gap-2">
        <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4" />
        <label htmlFor="consent" className="text-xs text-white/70">Ich willige ein, dass meine E-Mail zum Beta-Kontakt genutzt wird.</label>
      </div>
      <div className="md:col-span-1"><Button type="submit">{settings?.betaCta || DEFAULT_SETTINGS.betaCta}</Button></div>
      {ok && <p className="text-brand text-sm md:col-span-4">{ok}</p>}
    </form>
  );
}

/* ---------- Data (Public) ---------- */
function useSettings(defaults) {
  const [state, setState] = useState({
    heroImageMode: defaults.heroImageMode,
    heroImageUrl: defaults.heroImageUrl,
    teaserVideoUrl: defaults.teaserVideoUrl,
    teaserVideoPosterUrl: defaults.teaserVideoPosterUrl,
    teaserVideoRatio: defaults.teaserVideoRatio,
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cms_settings")
          .select(
            "hero_image_mode, hero_image_url, teaser_video_url, teaser_video_poster_url, teaser_video_ratio"
          )
          .eq("id", 1)
          .maybeSingle();
        if (!alive) return;
        if (error) throw error;
        if (data) {
          setState({
            heroImageMode: data.hero_image_mode || defaults.heroImageMode,
            heroImageUrl: data.hero_image_url || "",
            teaserVideoUrl: data.teaser_video_url || "",
            teaserVideoPosterUrl: data.teaser_video_poster_url || "",
            teaserVideoRatio: data.teaser_video_ratio || defaults.teaserVideoRatio,
          });
        }
      } catch (err) {
        if (!alive) return;
        console.warn("[CMS] Einstellungen konnten nicht geladen werden", err);
      }
    })();
    return () => (alive = false);
    return () => {
      alive = false;
    };
  }, [defaults.heroImageMode, defaults.heroImageUrl, defaults.teaserVideoRatio]);
  return {
    ...defaults,
    heroImageMode: state.heroImageMode,
    heroImageUrl: state.heroImageUrl,
    teaserVideoUrl: state.teaserVideoUrl,
    teaserVideoPosterUrl: state.teaserVideoPosterUrl,
    teaserVideoRatio: state.teaserVideoRatio,
    teaserVideoPosterFallback: defaults.teaserVideoPosterFallback,
    teaserVideoPosterUrl: state.teaserVideoPosterUrl || defaults.teaserVideoPosterUrl,
    teaserVideoRatio: state.teaserVideoRatio,
  };
}
function useFeatures(defaults) {
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("cms_features")
        .select("id, title, body, icon, position, published, created_at")
        .eq("published", true).order("position", { ascending: true }).order("created_at", { ascending: true });
      if (!alive) return;
      setState({ data: data || [], loading: false });
    })();
    return () => (alive = false);
  }, []);
  return { list: state.data?.length ? state.data.map(f => ({ id: f.id, title: f.title, body: f.body, icon: f.icon ?? "✨" })) : defaults };
}
function useFaqs(defaults) {
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("cms_faqs")
        .select("id, question, answer, position, published, created_at")
        .eq("published", true).order("position", { ascending: true }).order("created_at", { ascending: true });
      if (!alive) return; setState({ data: data || [], loading: false });
    })(); return () => (alive = false);
  }, []);
  return { list: state.data?.length ? state.data.map(q => ({ id: q.id, question: q.question, answer: q.answer })) : defaults };
}

/* ---------- Public Pages ---------- */
function HomePage({ settings, features, faqs, publishedPosts, onOpenPost }) {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black py-16 md:py-24 border-b border-white/10">
        <Container>
          <div className="mb-6"><Badge>{settings.releaseBanner}</Badge></div>
          <h1 className="text-3xl md:text-5xl font-semibold text-white max-w-3xl leading-tight">{settings.heroTitle}</h1>
          <p className="text-white/70 mt-3 max-w-2xl">{settings.heroSubtitle}</p>
          <div className="mt-8"><HeroImage settings={settings} /></div>
        </Container>
      </section>

      <Section title="Warum Coach Milo?">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-start">
          <div className="grid gap-6 md:grid-cols-2">
            <Card><h3 className="text-white font-medium mb-2">Pläne, die zu dir passen</h3><p className="text-white/70 text-sm">Milo berücksichtigt deine Ziele, dein Equipment und deinen Alltag. Jede Einheit ist auf dich zugeschnitten.</p></Card>
            <Card><h3 className="text-white font-medium mb-2">Mit dir besser werden</h3><p className="text-white/70 text-sm">Deine Fortschritte fließen direkt in den Plan ein. So bleibst du motiviert – ohne Stagnation.</p></Card>
          </div>
          <MediaPlayer settings={settings} />
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-center text-center gap-3">
          <h3 className="text-white text-xl font-semibold">Frühen Zugang sichern</h3>
          <p className="text-white/70">Melde dich für die Beta an und werde Teil der Entwicklung.</p>
          <div className="w-full max-w-2xl"><BetaForm settings={settings} /></div>
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
                <summary className="text-white font-medium cursor-pointer">{q.question}</summary>
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
          {(publishedPosts || []).slice(0, 2).map((p) => (
            <Card key={p.id}>
              <h3 className="text-white font-medium">{p.title}</h3>
              {p.excerpt && <p className="text-white/70 text-sm mt-2">{p.excerpt}</p>}
              <button type="button" onClick={() => onOpenPost(p.slug)} className="mt-3 inline-flex items-center gap-1 text-brand hover:opacity-90">Weiterlesen →</button>
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
            <button type="button" onClick={() => onOpen(p.slug)} className="mt-3 inline-flex items-center gap-1 text-brand hover:opacity-90">Weiterlesen →</button>
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
            <details><summary className="text-white font-medium cursor-pointer">{q.question}</summary>
              <p className="text-white/70 text-sm mt-2">{q.answer}</p></details>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Impressum (statisch, im App-Layout) ---------- */
function ImpressumPage() {
  return (
    <Section title="Impressum">
      <div className="prose prose-invert max-w-none">
        {/* TODO: Ersetze die Platzhalter durch deine echten Angaben */}
        <p><strong>Coach Milo</strong></p>
        <p>Aithentica.ai - Stefan Dorfstetter<br/>Pühret 28<br/>4813 Altmünser, Austria</p>
        <p>E-Mail: stefan@aithentica.ai</p>
        <p>USt-IdNr: </p>
      </div>
    </Section>
  );
}

/* ---------- Admin ---------- */
function AdminPage() {
  const { session, loading, signInWithPassword } = useAuth();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");

  const TABS = ["Beiträge", "Features", "FAQ", "Einstellungen"];
  const [tab, setTab] = useState(TABS[0]);

  /* POSTS */
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [savingPost, setSavingPost] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("cms_posts").select("*").order("created_at", { ascending: false });
      setPosts(data || []);
    })();
  }, [session]);

  // --- Robust: Create mit Varianten + klare Fehlerausgabe
  async function createPost() {
    const uid = session?.user?.id || null;

    const baseDraft = {
      slug: `draft-${Date.now()}`,
      title: "Neuer Artikel",
      excerpt: "",
      content_html: "<p></p>",
      cover_url: "",
      tags: [],
      author: session?.user?.email || "",
      published: false,
      published_at: null,
      // SEO lassen wir beim Insert weg
    };

    const variants = [
      baseDraft,
      { ...baseDraft, author: undefined },  // falls 'author' nicht existiert
      { ...baseDraft, created_by: uid },
      { ...baseDraft, author_id: uid },
      { ...baseDraft, user_id: uid },
    ];

    let lastError = null;

    for (const draft of variants) {
      const cleanDraft = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined));
      const { data, error } = await supabase
        .from("cms_posts")
        .insert(cleanDraft)
        .select()
        .single();
      if (!error && data) {
        setPosts((prev) => [data, ...prev]);
        setEditingPost(data);
        return;
      }
      lastError = error || null;
    }

    console.error("Create Post failed:", lastError);
    alert(
      "Post konnte nicht erstellt werden.\n\n" +
        (lastError?.message || "Unbekannter Fehler") +
        "\n\nTipps:\n• Prüfe in Supabase, ob 'cms_posts' eine Pflichtspalte wie created_by/author_id/user_id hat.\n" +
        "• Erlaube Inserts für deinen Admin-User in den RLS-Policies oder nutze die passende Spalte im Draft."
    );
  }

  async function savePost(p) {
    setSavingPost(true);
    try {
         // --- Tags robust normalisieren (DB: text[]) ---
const normTags = Array.isArray(p.tags)
      ? p.tags
      : (p.tags ?? "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
      // 1) Guard: keine Data-URI Bilder
      if ((p.content_html || "").includes('src="data:')) {
        throw new Error("Bitte keine eingebetteten Data-URI-Bilder einfügen. Lade Bilder über den 🖼️-Button hoch.");
      }
      // 2) Auto-Sanitize vor dem Speichern
      const cleanHtml = sanitizeHTML(p.content_html || "<p></p>");

      const patch = {
        title: p.title ?? "",
        slug: p.slug ?? "",
        excerpt: p.excerpt ?? "",
        content_html: cleanHtml,
        cover_url: p.cover_url ?? "",
        tags: normTags,     // DB erwartet text[] → immer Array schicken
        author: p.author ?? "",
        published: !!p.published,
        published_at: p.published ? p.published_at || new Date().toISOString() : p.published_at,
        // SEO
        meta_title: p.meta_title ?? null,
        meta_description: p.meta_description ?? null,
        meta_image_url: p.meta_image_url ?? null,
        canonical_url: p.canonical_url ?? null,
        noindex: p.noindex ?? false,
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
      alert(e.message || "Speichern fehlgeschlagen.");
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

  async function uploadCover(file) {
    if (!file || !editingPost) return;
    try {
      const path = `posts/cover-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("cms_images").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = await supabase.storage.from("cms_images").getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setEditingPost({ ...editingPost, cover_url: url });
    } catch (e) { alert(e.message || "Upload fehlgeschlagen"); }
  }

  // --- Ein-Klick-Inhaltsbereinigung für den aktuellen Post
  function sanitizeCurrentPost() {
    if (!editingPost) return;
    const cleaned = sanitizeHTML(editingPost.content_html || "<p></p>");
    setEditingPost({ ...editingPost, content_html: cleaned });
    alert("Inhalt bereinigt – problematische Tags/Attribute entfernt.");
  }

  /* FEATURES */
  const [features, setFeatures] = useState([]);
  const [editingFeature, setEditingFeature] = useState(null);
  const [savingFeature, setSavingFeature] = useState(false);
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("cms_features")
        .select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
      setFeatures(data || []);
    })();
  }, [session]);
  async function createFeature() {
    const draft = { title: "Neues Feature", body: "", icon: "✨", position: (features?.length || 0) + 1, published: false };
    const { data, error } = await supabase.from("cms_features").insert(draft).select().single();
    if (!error && data) { setFeatures([data, ...features]); setEditingFeature(data); }
  }
  async function saveFeature(f) {
    setSavingFeature(true);
    try {
      const patch = { title: f.title ?? "", body: f.body ?? "", icon: f.icon ?? "✨", position: Number(f.position) || 0, published: !!f.published };
      const { data, error } = await supabase.from("cms_features").update(patch).eq("id", f.id).select().single();
      if (error) throw error; setFeatures(features.map((x) => (x.id === f.id ? data : x))); setEditingFeature(data); alert("Gespeichert.");
    } catch (e) { alert(e.message); } finally { setSavingFeature(false); }
  }
  async function removeFeature(id) {
    if (!confirm("Dieses Feature wirklich löschen?")) return;
    const { error } = await supabase.from("cms_features").delete().eq("id", id);
    if (!error) { setFeatures(features.filter((x) => x.id !== id)); if (editingFeature?.id === id) setEditingFeature(null); }
  }

  /* FAQ */
  const [faqs, setFaqs] = useState([]);
  const [editingFaq, setEditingFaq] = useState(null);
  const [savingFaq, setSavingFaq] = useState(false);
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("cms_faqs")
        .select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
      setFaqs(data || []);
    })();
  }, [session]);
  async function createFaq() {
    const draft = { question: "Neue Frage", answer: "", position: (faqs?.length || 0) + 1, published: false };
    const { data, error } = await supabase.from("cms_faqs").insert(draft).select().single();
    if (!error && data) { setFaqs([data, ...faqs]); setEditingFaq(data); }
  }
  async function saveFaq(q) {
    setSavingFaq(true);
    try {
      const patch = { question: q.question ?? "", answer: q.answer ?? "", position: Number(q.position) || 0, published: !!q.published };
      const { data, error } = await supabase.from("cms_faqs").update(patch).eq("id", q.id).select().single();
      if (error) throw error; setFaqs(faqs.map((x) => (x.id === q.id ? data : x))); setEditingFaq(data); alert("Gespeichert.");
    } catch (e) { alert(e.message); } finally { setSavingFaq(false); }
  }
  async function removeFaq(id) {
    if (!confirm("Diese FAQ wirklich löschen?")) return;
    const { error } = await supabase.from("cms_faqs").delete().eq("id", id);
    if (!error) { setFaqs(faqs.filter((x) => x.id !== id)); if (editingFaq?.id === id) setEditingFaq(null); }
  }

  /* SETTINGS (Hero + Media) */
  const [settingsRow, setSettingsRow] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingTeaserVideo, setUploadingTeaserVideo] = useState(false);
  const [uploadingTeaserPoster, setUploadingTeaserPoster] = useState(false);
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error } = await supabase.from("cms_settings").select("*").eq("id", 1).maybeSingle();
        if (error) throw error;
        setSettingsRow(mergeSettingsRow(data));
      } catch (err) {
        console.warn("[CMS] Einstellungen (Admin) konnten nicht geladen werden", err);
        setSettingsRow(mergeSettingsRow({}));
      }
    })();
  }, [session]);
  async function saveSettings(next) {
    setSavingSettings(true);
    try {
      const payload = {
        id: next?.id ?? SETTINGS_ROW_DEFAULTS.id,
        hero_image_mode: next?.hero_image_mode ?? "url",
        hero_image_url: next?.hero_image_url ? next.hero_image_url : null,
        teaser_video_url: next?.teaser_video_url ? next.teaser_video_url : null,
        teaser_video_poster_url: next?.teaser_video_poster_url ? next.teaser_video_poster_url : null,
        teaser_video_ratio: next?.teaser_video_ratio || SETTINGS_ROW_DEFAULTS.teaser_video_ratio,
      };
      const { data, error } = await supabase
        .from("cms_settings")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      setSettingsRow(mergeSettingsRow(data));
      alert("Einstellungen gespeichert.");
    } catch (e) {
      alert(e.message || "Speichern fehlgeschlagen.");
    } finally {
      setSavingSettings(false);
    }
  }
  async function uploadHero(file) {
    if (!file) return;
    try {
      const path = toStoragePath("settings", file.name);
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET_IMAGES).upload(path, file, { upsert: false });
      const { error: upErr } = await supabase.storage.from("cms_images").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET_IMAGES).getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setSettingsRow((prev) => mergeSettingsRow({ ...(prev || {}), hero_image_url: url }));
    } catch (e) { alert(e.message); }
  }
  async function uploadTeaserVideo(file) {
    if (!file) return;
    setUploadingTeaserVideo(true);
    try {
      const path = toStoragePath("media", file.name);
      const { error: upErr } = await supabase.storage
        .from("cms_media")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("cms_media").getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setSettingsRow((prev) => mergeSettingsRow({ ...(prev || {}), teaser_video_url: url }));
    } catch (e) {
      alert(e.message || "Upload fehlgeschlagen. Prüfe den Bucket 'cms_media'.");
    } finally {
      setUploadingTeaserVideo(false);
    }
  }
  async function uploadTeaserPoster(file) {
    if (!file) return;
    setUploadingTeaserPoster(true);
    try {
      const path = toStoragePath("media", file.name);
      const { error: upErr } = await supabase.storage
        .from("cms_images")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("cms_images").getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setSettingsRow((prev) => mergeSettingsRow({ ...(prev || {}), teaser_video_poster_url: url }));
    } catch (e) {
      alert(e.message || "Upload fehlgeschlagen. Prüfe den Bucket 'cms_images'.");
    } finally {
      setUploadingTeaserPoster(false);
    }
  }

  async function uploadTeaserVideo(file) {
    if (!file) return;
    setUploadingTeaserVideo(true);
    try {
      const path = toStoragePath("media", file.name);
      if (!MEDIA_UPLOAD_BUCKETS.length) {
        throw new Error("Kein Storage-Bucket konfiguriert.");
      }
      let uploadError = null;
      for (const bucket of MEDIA_UPLOAD_BUCKETS) {
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: false, cacheControl: "3600" });
        if (!upErr) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          const url = pub?.publicUrl || "";
          setSettingsRow((prev) => mergeSettingsRow({ ...(prev || {}), teaser_video_url: url }));
          uploadError = null;
          break;
        }
        if (isMissingBucketError(upErr)) {
          uploadError = upErr;
          continue;
        }
        throw upErr;
      }
      if (uploadError) {
        const bucketChoices = formatBucketChoices(MEDIA_UPLOAD_BUCKETS);
        throw new Error(
          bucketChoices
            ? `Kein passender Storage-Bucket gefunden. Lege ${bucketChoices} in Supabase an.`
            : "Kein Storage-Bucket konfiguriert."
        );
      }
    } catch (e) {
      alert(
        e.message ||
          `Upload fehlgeschlagen. Prüfe die Buckets ${formatBucketChoices(MEDIA_UPLOAD_BUCKETS)} in Supabase Storage.`
      );
    } finally {
      setUploadingTeaserVideo(false);
    }
  }

  async function uploadTeaserPoster(file) {
    if (!file) return;
    setUploadingTeaserPoster(true);
    try {
      const path = toStoragePath("media", file.name);
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET_IMAGES)
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET_IMAGES).getPublicUrl(path);
      const url = pub?.publicUrl || "";
      setSettingsRow((prev) => mergeSettingsRow({ ...(prev || {}), teaser_video_poster_url: url }));
    } catch (e) {
      alert(
        e.message ||
          `Upload fehlgeschlagen. Prüfe den Bucket „${STORAGE_BUCKET_IMAGES}“ in Supabase Storage.`
      );
    } finally {
      setUploadingTeaserPoster(false);
    }
  }

  /* AUTH UI */
  if (loading) return <Section title="Admin"><p className="text-white/70">Lade…</p></Section>;
  if (!session) {
    return (
      <Section title="Admin Login" subtitle="E-Mail und Passwort eingeben">
        <div className="max-w-sm space-y-3">
          <Input placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Passwort" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button onClick={async () => { try { await signInWithPassword(email, pw); } catch (e) { alert(e.message); } }}>Einloggen</Button>
          <p className="text-white/50 text-xs">Hinweis: Für Magic-Link-Login brauchst du SMTP – später optional.</p>
        </div>
      </Section>
    );
  }

  /* TABS */
  return (
    <Section title="Admin" subtitle="Beiträge, Features, FAQs & Einstellungen (Supabase)">
      <div className="mb-4 flex items-center gap-2">
        {["Beiträge","Features","FAQ","Einstellungen"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              tab === t ? "bg-white/10 text-white border-white/20" : "bg-transparent text-white/80 hover:text-white border-white/20"}`}>
            {t}
          </button>
        ))}
      </div>

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
                  <div role="button" tabIndex={0} onClick={() => setEditingPost(p)}
                       onKeyDown={(e) => (e.key === "Enter" ? setEditingPost(p) : null)}
                       className="text-left text-white/80 hover:text-white cursor-pointer select-none">
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
            {!editingPost ? (
              <p className="text-white/60 text-sm">Post auswählen oder erstellen.</p>
            ) : (
              <div className="space-y-3">
                <Input value={editingPost.title} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} placeholder="Titel" />
                <Input value={editingPost.slug} onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })} placeholder="slug" />
                <Textarea rows={2} value={editingPost.excerpt || ""} onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })} placeholder="Kurzbeschreibung" />

                {/* Cover Bild */}
                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Cover-Bild (URL)</label>
                  <Input placeholder="https://…" value={editingPost.cover_url || ""}
                         onChange={(e) => setEditingPost({ ...editingPost, cover_url: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                      Cover hochladen
                      <input type="file" className="hidden" accept="image/*"
                             onChange={(e) => uploadCover(e.target.files?.[0])} />
                    </label>
                    {editingPost.cover_url ? <span className="text-xs text-white/50 truncate max-w-[50%]">{editingPost.cover_url}</span> : null}
                  </div>
                  {editingPost.cover_url ? (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                      <img src={editingPost.cover_url} alt="Cover Preview" className="w-full h-auto object-contain" />
                    </div>
                  ) : null}
                </div>

                {/* Tags */}
                <div>
                  <label className="text-white/70 text-sm">Tags (Kommagetrennt oder 1 Begriff)</label>
                  <Input
                    placeholder="z. B. schulter, rehab"
                    value={
                      Array.isArray(editingPost.tags)
                        ? editingPost.tags.join(", ")
                        : (editingPost.tags || "")
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      // Wenn deine Spalte 'tags' ein TEXT ist, einfach String speichern:
                      setEditingPost({ ...editingPost, tags: v });
                      // Wenn deine Spalte 'tags' text[] ist, könntest du hier splitten:
                      // setEditingPost({ ...editingPost, tags: v.split(",").map(t=>t.trim()).filter(Boolean) });
                    }}
                  />
                </div>

                {/* Inhalt – nur WYSIWYG */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-sm">Inhalt (WYSIWYG)</label>
                    <Button variant="outline" onClick={sanitizeCurrentPost} className="text-xs px-2 py-1">
                      Inhalt bereinigen
                    </Button>
                  </div>
                  <RichTextEditor
                    value={editingPost.content_html || "<p></p>"}
                    onChange={(html) => setEditingPost({ ...editingPost, content_html: html })}
                  />
                  <p className="text-[11px] text-white/50">Tipp: Bei Copy/Paste aus Vorlagen → erst „Inhalt bereinigen“. Bilder bitte über den 🖼️-Button einfügen.</p>
                </div>

                {/* SEO */}
                <div className="pt-2">
                  <h4 className="text-white font-medium">SEO</h4>
                  <div className="grid md:grid-cols-2 gap-2 mt-2">
                    <Input placeholder="Meta Title (Override)" value={editingPost.meta_title || ""}
                           onChange={(e) => setEditingPost({ ...editingPost, meta_title: e.target.value })} />
                    <Input placeholder="Meta Description (Override)" value={editingPost.meta_description || ""}
                           onChange={(e) => setEditingPost({ ...editingPost, meta_description: e.target.value })} />
                    <Input placeholder="OG Image URL" value={editingPost.meta_image_url || ""}
                           onChange={(e) => setEditingPost({ ...editingPost, meta_image_url: e.target.value })} />
                    <Input placeholder="Canonical URL (z. B. https://coachmilo.ai/…)" value={editingPost.canonical_url || ""}
                           onChange={(e) => setEditingPost({ ...editingPost, canonical_url: e.target.value })} />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-white/80 mt-2">
                    <input type="checkbox" checked={!!editingPost.noindex}
                           onChange={(e) => setEditingPost({ ...editingPost, noindex: e.target.checked })} />
                    Seite auf „noindex“ setzen
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-white/80 text-sm">
                    <input type="checkbox" checked={!!editingPost.published}
                           onChange={(e) => setEditingPost({ ...editingPost, published: e.target.checked })} />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => savePost(editingPost)}>{savingPost ? "Speichern…" : "Speichern"}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

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
                  <div role="button" tabIndex={0} onClick={() => setEditingFeature(f)}
                       onKeyDown={(e) => (e.key === "Enter" ? setEditingFeature(f) : null)}
                       className="text-left text-white/80 hover:text-white cursor-pointer select-none">
                    {f.title || "(Ohne Titel)"} {f.published ? "• LIVE" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">#{f.position ?? 0}</span>
                    <Button variant="ghost" onClick={() => removeFeature(f.id)}>Löschen</Button>
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
                <Input value={editingFeature.title || ""} onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })} placeholder="Titel" />
                <Textarea rows={3} value={editingFeature.body || ""} onChange={(e) => setEditingFeature({ ...editingFeature, body: e.target.value })} placeholder="Beschreibung" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editingFeature.icon || ""} onChange={(e) => setEditingFeature({ ...editingFeature, icon: e.target.value })} placeholder="Icon (Emoji oder Text)" />
                  <Input type="number" value={editingFeature.position ?? 0} onChange={(e) => setEditingFeature({ ...editingFeature, position: e.target.value })} placeholder="Position" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={!!editingFeature.published}
                           onChange={(e) => setEditingFeature({ ...editingFeature, published: e.target.checked })} />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => saveFeature(editingFeature)}>{savingFeature ? "Speichern…" : "Speichern"}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

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
                  <div role="button" tabIndex={0} onClick={() => setEditingFaq(q)}
                       onKeyDown={(e) => (e.key === "Enter" ? setEditingFaq(q) : null)}
                       className="text-left text-white/80 hover:text-white cursor-pointer select-none">
                    {q.question || "(Ohne Frage)"} {q.published ? "• LIVE" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">#{q.position ?? 0}</span>
                    <Button variant="ghost" onClick={() => removeFaq(q.id)}>Löschen</Button>
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
                <Input value={editingFaq.question || ""} onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })} placeholder="Frage" />
                <Textarea rows={6} value={editingFaq.answer || ""} onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })} placeholder="Antwort" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={editingFaq.position ?? 0} onChange={(e) => setEditingFaq({ ...editingFaq, position: e.target.value })} placeholder="Position" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={!!editingFaq.published}
                           onChange={(e) => setEditingFaq({ ...editingFaq, published: e.target.checked })} />
                    Veröffentlicht
                  </label>
                  <Button onClick={() => saveFaq(editingFaq)}>{savingFaq ? "Speichern…" : "Speichern"}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "Einstellungen" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card>
              <h3 className="text-white font-medium mb-2">Hero</h3>
              {!settingsRow ? (
                <p className="text-white/60 text-sm">Lade Einstellungen…</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/70 text-sm">Modus</label>
                    <Select value={settingsRow.hero_image_mode || "url"}
                            onChange={(e) => setSettingsRow({ ...settingsRow, hero_image_mode: e.target.value })}>
                      <option value="url">URL</option>
                      <option value="inline">Inline (SVG)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Bild-URL (öffentlich)</label>
                    <Input placeholder="https://…" value={settingsRow.hero_image_url || ""}
                           onChange={(e) => setSettingsRow({ ...settingsRow, hero_image_url: e.target.value })} />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                        Upload
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadHero(e.target.files?.[0])} />
                      </label>
                      <span className="text-white/50 text-xs">Speicherort: „{STORAGE_BUCKET_IMAGES}“</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => saveSettings(settingsRow)}>{savingSettings ? "Speichern…" : "Speichern"}</Button>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-white font-medium mb-2">Teaser-Video</h3>
              {!settingsRow ? (
                <p className="text-white/60 text-sm">Lade Einstellungen…</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/70 text-sm">Video-URL</label>
                    <Input
                      placeholder="https://…"
                      value={settingsRow.teaser_video_url || ""}
                      onChange={(e) => setSettingsRow({ ...settingsRow, teaser_video_url: e.target.value })}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                        Video hochladen
                        <input
                          type="file"
                          className="hidden"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={(e) => uploadTeaserVideo(e.target.files?.[0])}
                        />
                      </label>
                      <span className="text-white/50 text-xs">
                        Upload nach {formatBucketChoices(MEDIA_UPLOAD_BUCKETS) || "Supabase Storage"}
                      </span>
                    </div>
                    {uploadingTeaserVideo && <p className="text-white/60 text-xs">Lade Video hoch…</p>}
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Poster-Bild</label>
                    <Input
                      placeholder="https://…"
                      value={settingsRow.teaser_video_poster_url || ""}
                      onChange={(e) => setSettingsRow({ ...settingsRow, teaser_video_poster_url: e.target.value })}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                        Poster hochladen
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => uploadTeaserPoster(e.target.files?.[0])}
                        />
                      </label>
                      <span className="text-white/50 text-xs">Bucket „{STORAGE_BUCKET_IMAGES}“</span>
                    </div>
                    {uploadingTeaserPoster && <p className="text-white/60 text-xs">Lade Poster hoch…</p>}
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Format</label>
                    <Select
                      value={settingsRow.teaser_video_ratio || "16:9"}
                      onChange={(e) => setSettingsRow({ ...settingsRow, teaser_video_ratio: e.target.value })}
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="4:5">4:5 (Story)</option>
                      <option value="1:1">1:1 (Quadrat)</option>
                      <option value="9:16">9:16 (Hochformat)</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => saveSettings(settingsRow)}>{savingSettings ? "Speichern…" : "Speichern"}</Button>
                    <p className="text-white/50 text-xs">
                      Video-Dateien werden automatisch in Supabase veröffentlicht.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-white font-medium mb-2">Hero Vorschau</h3>
              {settingsRow?.hero_image_mode === "url" && settingsRow?.hero_image_url ? (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                  <img src={settingsRow.hero_image_url} alt="Hero Preview" className="w-full h-auto object-contain" />
          <Card>
            <h3 className="text-white font-medium mb-2">Hero Bild</h3>
            {!settingsRow ? (
              <p className="text-white/60 text-sm">Lade Einstellungen…</p>
            ) : (
              <div className="space-y-3">
                <p className="text-white/50 text-sm leading-relaxed">
                  Hero-Visuals liegen in <code>cms_settings</code>. Lege dort (neben den bestehenden Spalten) optional{" "}
                  <code>hero_image_mode</code> und <code>hero_image_url</code> an.
                </p>
                <div>
                  <label className="text-white/70 text-sm">Modus</label>
                  <Select
                    value={settingsRow.hero_image_mode || "url"}
                    onChange={(e) =>
                      setSettingsRow((prev) =>
                        mergeSettingsRow({ ...(prev || {}), hero_image_mode: e.target.value })
                      )
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
                      setSettingsRow((prev) =>
                        mergeSettingsRow({ ...(prev || {}), hero_image_url: e.target.value })
                      )
                    }
                  />
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          uploadHero(e.target.files?.[0]);
                          if (e.target) e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => saveSettings(settingsRow)}>
                    {savingSettings ? "Speichern…" : "Speichern (Hero & Video)"}
                  </Button>
                </div>
              ) : (
                <p className="text-white/60 text-sm">Aktuell „Inline“ – es wird die eingebaute SVG verwendet.</p>
              )}
            </Card>

            <Card>
              <h3 className="text-white font-medium mb-2">Teaser Vorschau</h3>
              <MediaPlayer
                settings={{
                  teaserVideoUrl: settingsRow?.teaser_video_url || "",
                  teaserVideoPosterUrl: settingsRow?.teaser_video_poster_url || "",
                  teaserVideoRatio: settingsRow?.teaser_video_ratio || SETTINGS_ROW_DEFAULTS.teaser_video_ratio,
                  teaserVideoPosterFallback: DEFAULT_SETTINGS.teaserVideoPosterFallback,
                }}
              />
              {!settingsRow?.teaser_video_url && (
                <p className="text-white/50 text-xs mt-3">
                  Lade ein Video hoch oder füge eine URL ein, damit der Teaser sichtbar wird.
                </p>
              )}
            </Card>

            <Card>
              <h3 className="text-white font-medium mb-2">Hinweise zu Supabase Storage</h3>
              <ul className="list-disc list-inside text-white/60 text-xs space-y-1">
                <li>Videos können im Bucket „{STORAGE_BUCKET_MEDIA}“ oder ersatzweise in „{STORAGE_BUCKET_IMAGES}“ liegen.</li>
                <li>
                  Falls ein Bucket fehlt, lege ihn im Supabase Dashboard unter <em>Storage</em> an und erlaube öffentliche Lesezugriffe.
                </li>
                <li>Poster-Bilder gehören immer in „{STORAGE_BUCKET_IMAGES}“.</li>
              </ul>
            </Card>
          </div>
          <Card>
            <h3 className="text-white font-medium mb-2">Hero Vorschau</h3>
            {settingsRow?.hero_image_mode === "url" && settingsRow?.hero_image_url ? (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={settingsRow.hero_image_url} alt="Hero Preview" className="w-full h-auto object-contain" />
              </div>
            ) : (
              <p className="text-white/60 text-sm">Aktuell „Inline“ – es wird die eingebaute SVG verwendet.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-white font-medium mb-2">Teaser Video (Supabase)</h3>
            {!settingsRow ? (
              <p className="text-white/60 text-sm">Lade Einstellungen…</p>
            ) : (
              <div className="space-y-3">
                <p className="text-white/60 text-sm leading-relaxed">
                  So richtest du das Video ein:
                </p>
                <ul className="list-disc list-inside text-white/50 text-xs space-y-1 leading-relaxed">
                  <li>Erstelle in Supabase Storage einen öffentlichen Bucket <code>cms_media</code> (für Videos).</li>
                  <li>
                    Stelle sicher, dass <code>cms_settings</code> die Spalten <code>teaser_video_url</code>,{" "}
                    <code>teaser_video_poster_url</code> und <code>teaser_video_ratio</code> besitzt.
                  </li>
                  <li>
                    Lade Dateien entweder per Upload unten oder direkt im Supabase UI hoch und füge hier die URL ein.
                  </li>
                </ul>
                <div>
                  <label className="text-white/70 text-sm">Video-URL (öffentlich)</label>
                  <Input
                    placeholder="https://..."
                    value={settingsRow.teaser_video_url || ""}
                    onChange={(e) =>
                      setSettingsRow((prev) =>
                        mergeSettingsRow({ ...(prev || {}), teaser_video_url: e.target.value })
                      )
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer ${
                        uploadingTeaserVideo ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      {uploadingTeaserVideo ? "Lädt…" : "Video hochladen"}
                      <input
                        type="file"
                        className="hidden"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        disabled={uploadingTeaserVideo}
                        onChange={(e) => {
                          uploadTeaserVideo(e.target.files?.[0]);
                          if (e.target) e.target.value = "";
                        }}
                      />
                    </label>
                    <label
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10 cursor-pointer ${
                        uploadingTeaserPoster ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      {uploadingTeaserPoster ? "Lädt…" : "Poster hochladen"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        disabled={uploadingTeaserPoster}
                        onChange={(e) => {
                          uploadTeaserPoster(e.target.files?.[0]);
                          if (e.target) e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed mt-1">
                    Tipp: Nutze MP4 (H.264) für maximale Browser-Kompatibilität. Das Poster landet im Bucket{" "}
                    <code>cms_images</code>.
                  </p>
                </div>
                <div>
                  <label className="text-white/70 text-sm">Poster-URL (optional)</label>
                  <Input
                    placeholder="https://.../preview.jpg"
                    value={settingsRow.teaser_video_poster_url || ""}
                    onChange={(e) =>
                      setSettingsRow((prev) =>
                        mergeSettingsRow({ ...(prev || {}), teaser_video_poster_url: e.target.value })
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm">Format</label>
                  <Select
                    value={settingsRow.teaser_video_ratio || SETTINGS_ROW_DEFAULTS.teaser_video_ratio}
                    onChange={(e) =>
                      setSettingsRow((prev) =>
                        mergeSettingsRow({ ...(prev || {}), teaser_video_ratio: e.target.value })
                      )
                    }
                  >
                    <option value="16:9">16:9 – Querformat</option>
                    <option value="9:16">9:16 – Hochformat</option>
                    <option value="4:5">4:5 – Story / Reel</option>
                    <option value="1:1">1:1 – Quadrat</option>
                  </Select>
                </div>
                <div className="flex items-start gap-3">
                  <Button onClick={() => saveSettings(settingsRow)}>
                    {savingSettings ? "Speichern…" : "Speichern (Hero & Video)"}
                  </Button>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Der Button speichert alle Felder in <code>cms_settings</code> (inkl. Hero-Bereich).
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-white font-medium mb-2">Teaser Vorschau</h3>
            {settingsRow?.teaser_video_url ? (
              <div
                className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${getAspectClass(
                  settingsRow?.teaser_video_ratio
                )}`}
              >
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster={
                    settingsRow?.teaser_video_poster_url || DEFAULT_SETTINGS.teaserVideoPosterUrl || undefined
                  }
                  className="h-full w-full object-cover"
                  controlsList="nodownload noremoteplayback"
                >
                  <source src={settingsRow.teaser_video_url} type={guessVideoMime(settingsRow.teaser_video_url)} />
                  Vorschau kann nicht geladen werden.
                </video>
              </div>
            ) : (
              <p className="text-white/60 text-sm">Noch kein Video hinterlegt.</p>
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}

/* ---------- Shell / Nav (ohne Admin in Header) ---------- */
const PAGES = ["Home", "Features", "Blog", "FAQ"];
function Shell({ settings, onNavigate, active }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-black/40">
      <Container>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#ff9a3e] to-[#ff7a00] p-0.5 flex items-center justify-center">
              <img src="/logo-negativ.svg" alt="Coach Milo" className="h-full w-full object-contain" />
            </div>
            <span className="text-white font-semibold">{settings.brand}</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {PAGES.map((p) => (
              <button key={p} onClick={() => onNavigate(p)}
                className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                  active === p ? "bg-white/10 text-white border-white/20" : "bg-transparent text-white/80 hover:text-white border-white/20"}`}>
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
      } catch { setPublishedPosts([]); }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.className = "bg-black";
    try { document.body.style.margin = "0"; document.body.style.background = "#000"; } catch {}
  }, []);

  // Organization JSON-LD for homepage
  const { setJsonLd } = useHead();
  const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  useEffect(() => {
    try {
      setJsonLd('ld-org', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: settings.brand,
        url: SITE_URL,
        logo: `${SITE_URL}/apple-touch-icon.png`,
      });
    } catch {}
  }, [settings.brand]);

  // Mini router: sync state <-> URL
  function navigateTo(p) {
    setSelectedSlug(null);
    setPage(p);
    try {
      const path = p === 'Home' ? '/' :
                   p === 'Features' ? '/features' :
                   p === 'Blog' ? '/blog' :
                   p === 'FAQ' ? '/faq' :
                   p === 'Admin' ? '/admin' :
                   p === 'Impressum' ? '/impressum' : '/';
      window.history.pushState({}, '', path);
    } catch {}
  }
  function openPost(slug) {
    setSelectedSlug(slug);
    setPage('Post');
    try { window.history.pushState({}, '', `/blog/${encodeURIComponent(slug)}`); } catch {}
  }
  function syncFromLocation() {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname || '/';
    const m = path.match(/^\/blog\/([^\/#?]+)/i);
    if (m) { setSelectedSlug(decodeURIComponent(m[1])); setPage('Post'); return; }
    if (path === '/' || path === '') { setPage('Home'); return; }
    if (path.startsWith('/features')) { setPage('Features'); return; }
    if (path.startsWith('/blog')) { setPage('Blog'); return; }
    if (path.startsWith('/faq')) { setPage('FAQ'); return; }
    if (path.startsWith('/admin')) { setPage('Admin'); return; }
    if (path.startsWith('/impressum')) { setPage('Impressum'); return; }
  }
  useEffect(() => {
    syncFromLocation();
    const onPop = () => syncFromLocation();
    try { window.addEventListener('popstate', onPop); } catch {}
    return () => { try { window.removeEventListener('popstate', onPop); } catch {} };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-black text-white">
        <Shell settings={settings} onNavigate={(p) => navigateTo(p)} active={page} />

        {page === "Home" && (
          <HomePage settings={settings} features={features} faqs={faqs}
            publishedPosts={publishedPosts}
            onOpenPost={(slug) => openPost(slug)} />
        )}
        {page === "Features" && <FeaturesPage features={features} />}
        {page === "Blog" && (
          <BlogPage publishedPosts={publishedPosts}
            onOpen={(slug) => openPost(slug)} />
        )}
        {page === "FAQ" && <FAQPage faqs={faqs} />}
        {page === "Admin" && <AdminPage />}
        {page === "Post" && selectedSlug && <PostPage slug={selectedSlug} onBack={() => navigateTo("Blog")} />}
        {page === "Impressum" && <ImpressumPage />}

        <footer className="border-t border-white/10 mt-10">
          <Container>
            <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-white/50 text-sm">
              <div>© {new Date().getFullYear()} {settings.brand}</div>
              <div className="flex items-center gap-3">
                <button className="hover:text-white" onClick={() => navigateTo("Impressum")}>Impressum</button>
                <a className="hover:text-white" href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Datenschutz</a>
                <span>•</span>
                <a className="hover:text-white" onClick={() => navigateTo("Admin")}>Admin</a>
                <span>•</span><span>Ab Oktober 2025</span>
              </div>
            </div>
          </Container>
        </footer>
      </div>
    </AuthProvider>
  );
}
