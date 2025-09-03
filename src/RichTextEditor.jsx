// src/RichTextEditor.jsx
import React, { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { supabase } from "./lib/supabaseClient";

/**
 * Props:
 * - value: string (HTML)
 * - onChange: (html: string) => void
 * - bucket?: string (default: "cms_images")
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
          // Container Styles (Dark / Tailwind)
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

  async function promptLink() {
    const prev = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Link-URL eingeben:", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function chooseImage() {
    fileInputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `posts/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      alert("Upload fehlgeschlagen: " + error.message);
      return;
    }
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    const url = publicUrl?.publicUrl;
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    }
    // reset input so the same file can be selected again later
    e.target.value = "";
  }

// Ersetze den bisherigen Btn in RichTextEditor.jsx
const Btn = ({ active, disabled, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={
      // remove native "pills"
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
          title="Überschrift 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Btn>
        <Btn
          title="Überschrift 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Btn>
        <span className="mx-1 text-white/20">|</span>
        <Btn
          title="Fett"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Btn>
        <Btn
          title="Kursiv"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          i
        </Btn>
        <Btn
          title="Zitat"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </Btn>
        <span className="mx-1 text-white/20">|</span>
        <Btn
          title="Aufzählung"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ••
        </Btn>
        <Btn
          title="Nummeriert"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </Btn>
        <span className="mx-1 text-white/20">|</span>
        <Btn title="Link" onClick={promptLink}>🔗</Btn>
        <Btn title="Bild einfügen (Upload)" onClick={chooseImage}>🖼️</Btn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <span className="mx-1 text-white/20">|</span>
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
        <Btn title="Formatierung entfernen" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          ⌫
        </Btn>
      </div>

      {/* Editor Surface */}
      <EditorContent editor={editor} />

      {/* Minimal Dark Styles (optional) */}
      <style>{`
        .ProseMirror p { margin: 0.5rem 0; }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { margin: 1rem 0 0.5rem; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.25rem; }
        .ProseMirror a { color: #93c5fd; text-decoration: underline; }
        .ProseMirror img { max-width: 100%; height: auto; }
        .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  );
}
