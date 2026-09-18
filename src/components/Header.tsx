"use client";

import { Sparkles, ExternalLink } from "lucide-react";

type Props = {
  providerLabel?: string;
  mock?: boolean;
};

export function Header({ providerLabel, mock }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">
              PixForge
            </h1>
            <p className="hidden text-[11px] text-muted sm:block">
              Natural-language photo editing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {providerLabel && (
            <span
              className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
                mock
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-violet-500/40 bg-violet-500/10 text-violet-300"
              }`}
            >
              {providerLabel}
            </span>
          )}
          <a
            href="https://github.com/thepacman87/testing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition hover:border-violet-500/50 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Repo</span>
          </a>
        </div>
      </div>
    </header>
  );
}
