import React, { useEffect, useState } from "react";
import { detectLanguageFromName } from "./detectLanguage";

/**
 * CodeBlock adaptif tema (gelap & terang) — TIDAK memaksa blok kode gelap.
 *
 * Pendekatan: Shiki "dual themes" → menghasilkan CSS variable (--shiki-light & --shiki-dark).
 * Warna token berpindah otomatis lewat kelas `.dark` di root (lihat code-viewer.css).
 * Tidak perlu re-highlight saat ganti tema → mulus & cocok GitHub-like.
 *
 * npm i shiki
 */
let _highlighter = null;
async function getHighlighter() {
  if (_highlighter) return _highlighter;
  const { createHighlighter } = await import("shiki");
  _highlighter = await createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: ["python", "javascript", "typescript", "tsx", "json", "yaml",
            "bash", "sql", "markdown", "r", "go", "rust", "dockerfile"],
  });
  return _highlighter;
}

export default function CodeBlock({ code, filename = "", language }) {
  const lang = language || detectLanguageFromName(filename);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let alive = true;
    if (lang === "binary") return;
    getHighlighter().then((hl) => {
      if (!alive) return;
      const out = hl.codeToHtml(code, {
        lang: hl.getLoadedLanguages().includes(lang) ? lang : "text",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false, // wajib agar memakai CSS var (bukan warna tetap)
      });
      setHtml(out);
    });
    return () => { alive = false; };
  }, [code, lang]);

  if (lang === "binary") {
    return <div className="code-binary">Berkas biner — tidak dapat ditampilkan.</div>;
  }
  // Shiki menulis <pre class="shiki">…</pre> dengan CSS var; tema diatur via .dark di root.
  return <div className="code-viewer" dangerouslySetInnerHTML={{ __html: html }} />;
}
