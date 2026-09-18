"use client";

import { Sparkles, ExternalLink, Settings2, Cpu, Cloud, Globe } from "lucide-react";

type Props = {
  mode: "local" | "cloud";
  onToggleSettings: () => void;
  statusLabel?: string;
  cloudAvailable?: boolean;
};

export function Header({
  mode,
  onToggleSettings,
  statusLabel,
  cloudAvailable,
}: Props) {
  const label = statusLabel || "Free public generate · no API key";
  const isPollinations = /pollinations|free public/i.test(label);
  const isSdTurbo = /sd-turbo|webgpu/i.test(label);
  const isCloud = mode === "cloud" || /fal|cloud/i.test(label);

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
              Imagine-style editing · no API key
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className={`inline-flex max-w-[14rem] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium sm:max-w-none ${
              isCloud
                ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                : isSdTurbo
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : isPollinations
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            }`}
            title={label}
          >
            {isCloud ? (
              <Cloud className="h-3 w-3 shrink-0" />
            ) : isPollinations ? (
              <Globe className="h-3 w-3 shrink-0" />
            ) : (
              <Cpu className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{label}</span>
          </span>

          <button
            type="button"
            onClick={onToggleSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition hover:border-violet-500/50 hover:text-foreground"
            title="Settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {cloudAvailable ? "Mode" : "About"}
            </span>
          </button>

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
