// src/RichTextEditor.jsx
import React, { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { supabase } from "./lib/supabaseClient";

/**
 * RichTextEditor (Tiptap)
 * Props:
 *  - value: string (HTML)
 *  - onChange: (html: string) => void
 *  - bucket?: string (default: "cms_images")
 */
export default function RichTextEditor({ value = "", onChange, bucket = "cms_images" }) {
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-xl border border-white/10 my-3" },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          // Dark-friendly Editorfläche
          "prose prose-invert max-w-none leading-7 md:leading-8 " +
          "min-h-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:outline-none",
      },
    },
    content: value || "<p></p>",
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  // ---- Toolbar-Helpers ----
  async function promptLink() {
    const prev = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Link-URL eingeben:", prev);
    if (url === null) return; // Abbruch
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function chooseImage() {
    fileInputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sichere, einfache Pfad-Erzeugung
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      alert("Upload fehlgeschlagen: " + error.message);
      e.target.value = "";
      return;
    }
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = publicUrl?.publicUrl;
    if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    e.target.value = "";
  }

  // Ein Button-Element, das den Editor-Fokus NICHT verliert
  const Btn = ({ active, disabled, onAction, children, title }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        // Wichtig: verhindert Fokusverlust/Selektion
        e.preventDefault();
        if (!disabled) onAction?.();
      }}
      className={
        "appearance-none [-webkit-appearance:none] bg-transparent border-0 " +
        "px-2 py-1 rounded-md text-sm focus:outline-none select-none " +
        (disabled
          ? "text-white/30 cursor-not-allowed"
          : active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:text-white")
      }
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1">
        <Btn
          title="Absatz"
          active={editor.isActive("paragraph")}
          onAction={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </Btn>
        <Btn
          title="Überschrift 2"
          active={editor.isActive("heading", { level: 2 })}
          onAction={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Btn>
        <Btn
          title="Überschrift 3"
          active={editor.isActive("heading", { level: 3 })}
          onAction={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Btn>

        <span className="mx-1 text-white/20">|</span>

        <Btn
          title="Fett"
          active={editor.isActive("bold")}
          onAction={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Btn>
        <Btn
          title="Kursiv"
          active={editor.isActive("italic")}
          onAction={() => editor.chain().focus().toggleItalic().run()}
        >
          i
        </Btn>
        <Btn
          title="Zitat"
          active={editor.isActive("blockquote")}
          onAction={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </Btn>

        <span className="mx-1 text-white/20">|</span>

        <Btn
          title="Aufzählungsliste"
          active={editor.isActive("bulletList")}
          onAction={() => editor.chain().focus().toggleBulletList().run()}
        >
          ••
        </Btn>
        <Btn
          title="Nummerierte Liste"
          active={editor.isActive("orderedList")}
          onAction={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </Btn>

        <span className="mx-1 text-white/20">|</span>

        <Btn title="Link setzen/entfernen" onAction={promptLink}>🔗</Btn>
        <Btn title="Bild einfügen (Upload)" onAction={chooseImage}>🖼️</Btn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <span className="mx-1 text-white/20">|</span>

        <Btn title="Rückgängig" onAction={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn title="Wiederholen" onAction={() => editor.chain().focus().redo().run()}>↷</Btn>
        <Btn
          title="Formatierung entfernen"
          onAction={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          ⌫
        </Btn>
      </div>

      {/* Editor-Fläche */}
      <EditorContent editor={editor} />

      {/* Mini-Dark-Styles für Tiptap */}
      <style>{`
        .ProseMirror p { margin: 0.5rem 0; }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { margin: 1rem 0 0.5rem; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.25rem; }
        .ProseMirror blockquote {
          border-left: 3px solid rgba(255,255,255,0.2);
          margin: 0.75rem 0;
          padding-left: 0.75rem;
          color: rgba(255,255,255,0.8);
        }
        .ProseMirror a { color: #93c5fd; text-decoration: underline; }
        .ProseMirror img { max-width: 100%; height: auto; }
        .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  );
}
