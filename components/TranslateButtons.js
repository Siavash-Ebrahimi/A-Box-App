"use client";

// Reusable "EN / AR / FA" language toggle. Drop above any A-Box analysis or
// AI report and pass the source text; the component handles caching, an
// in-flight spinner state, and emits the translated text back to the parent
// via `onTranslated(text, lang)`.
//
// Usage:
//   <TranslateButtons text={report} onTranslated={(t, lang) => setShown(t)} />
//
// The endpoint at /api/translate is a thin OpenRouter wrapper and degrades
// to a "[AR — offline] …" prefix when the LLM is unreachable, so this
// component never throws on the user.

import { useEffect, useRef, useState } from "react";

const LANGS = [
  { code: "en", label: "EN", title: "English (original)",          rtl: false },
  { code: "ar", label: "AR", title: "العربية · Arabic",              rtl: true  },
  { code: "fa", label: "FA", title: "فارسی · Farsi / Persian",       rtl: true  },
];

export default function TranslateButtons({
  text,                  // the source text to translate
  onTranslated,          // (translatedText, langCode, isRtl) => void
  className = "",        // optional wrapper class for layout tweaks
  compact = false,       // smaller padding when squeezed into headers
}) {
  const [active, setActive] = useState("en");
  const [busy, setBusy] = useState(false);
  const cacheRef = useRef({});  // { [langCode]: translatedText } — per source text

  // Wipe the per-language cache when the source text changes so a fresh
  // translation runs after the underlying report updates.
  useEffect(() => {
    cacheRef.current = {};
    setActive("en");
  }, [text]);

  async function pick(code) {
    if (busy || code === active) return;
    const lang = LANGS.find((l) => l.code === code);
    if (!lang) return;
    if (code === "en") {
      setActive("en");
      onTranslated?.(text, "en", false);
      return;
    }
    // Cache hit?
    if (cacheRef.current[code]) {
      setActive(code);
      onTranslated?.(cacheRef.current[code], code, lang.rtl);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: code }),
      });
      const data = await res.json();
      const translated = data?.translated || text;
      cacheRef.current[code] = translated;
      setActive(code);
      onTranslated?.(translated, code, lang.rtl);
    } catch {
      // Show original text but mark active so the user gets a visual cue.
      onTranslated?.(text, "en", false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className={`text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mr-1 ${compact ? "hidden md:inline" : ""}`}>
        Translate
      </span>
      {LANGS.map((l) => {
        const on = active === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => pick(l.code)}
            disabled={busy && !on}
            title={l.title}
            className={`text-[10.5px] font-semibold rounded border transition disabled:opacity-50 disabled:cursor-progress ${
              compact ? "px-1.5 py-0.5" : "px-2 py-1"
            } ${
              on
                ? "border-amber-500 bg-amber-500/20 text-amber-200"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-slate-100"
            }`}
          >
            {l.label}
          </button>
        );
      })}
      {busy ? (
        <span className="text-[10px] text-cyan-300 italic ml-1.5">translating…</span>
      ) : null}
    </div>
  );
}
