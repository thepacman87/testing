"use client";

import { useEffect, useRef } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

const SUGGESTIONS = [
  "Remove the background",
  "Enhance and sharpen details",
  "Make it black and white",
  "Warm golden hour look",
  "Blur the background (portrait bokeh)",
  "Make colors more vivid",
  "Reimagine as a cinematic film still",
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
};

export function PromptBar({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  return (
    <div className="border-t border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
        {!disabled && (
          <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => onChange(s)}
                className="shrink-0 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] text-muted transition hover:border-violet-500/40 hover:text-foreground disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-2 p-2 shadow-xl shadow-black/20 focus-within:border-violet-500/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Wand2 className="h-4 w-4" />
          </div>
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled || loading}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && !disabled && value.trim()) onSubmit();
              }
            }}
            placeholder="Describe your edit… e.g. “remove the background” or “cinematic reimagine”"
            className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted/70 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || loading || !value.trim()}
            onClick={onSubmit}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Working…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          Enter to submit · Matched edits on-device · Reimagine uses local
          SD-Turbo (no external AI)
        </p>
      </div>
    </div>
  );
}
