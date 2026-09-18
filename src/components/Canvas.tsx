"use client";

import { Download, Loader2, RotateCcw } from "lucide-react";

type Props = {
  imageUrl: string | null;
  loading: boolean;
  promptLabel?: string;
  onDownload: () => void;
  onReset: () => void;
};

export function Canvas({
  imageUrl,
  loading,
  promptLabel,
  onDownload,
  onReset,
}: Props) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="truncate text-xs text-muted">
          {promptLabel ? (
            <>
              <span className="text-foreground/80">Latest: </span>
              {promptLabel}
            </>
          ) : (
            "Ready to edit"
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New photo
          </button>
          <button
            type="button"
            disabled={!imageUrl || loading}
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
        {imageUrl ? (
          <div className="relative max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Edited result"
              className={`max-h-[min(70vh,720px)] max-w-full rounded-xl object-contain shadow-2xl shadow-black/50 ring-1 ring-white/10 transition ${
                loading ? "opacity-40 blur-[1px]" : ""
              }`}
            />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/30 backdrop-blur-[2px]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/30 ring-1 ring-violet-400/40 animate-pulse-glow">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-200" />
                </div>
                <p className="text-sm font-medium text-white/90">
                  Forging your edit…
                </p>
                <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shimmer" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No image selected</p>
        )}
      </div>
    </div>
  );
}
