"use client";

import { X, Cpu, Cloud, Globe, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "local" | "cloud";
  onModeChange: (m: "local" | "cloud") => void;
  cloudAvailable: boolean;
  capsWebgpu: boolean | null;
  onLoadGenerator: () => void;
};

export function SettingsModal({
  open,
  onClose,
  mode,
  onModeChange,
  cloudAvailable,
  capsWebgpu,
  onLoadGenerator,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-muted">
            <div className="mb-1 flex items-center gap-2 font-medium text-cyan-200">
              <Globe className="h-3.5 w-3.5" />
              Default generate (no API key)
            </div>
            <p>
              Text-to-image and open-ended “reimagine” use{" "}
              <strong className="text-foreground/90">Pollinations.ai</strong> —
              a free public endpoint. Prompts leave your device. Matched edits
              (bg remove, enhance, grades…) stay on-device via WASM.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Edit backend
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onModeChange("local")}
                className={`rounded-xl border p-3 text-left transition ${
                  mode === "local"
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : "border-border bg-surface-2 hover:border-emerald-500/40"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Cpu className="h-4 w-4 text-emerald-300" />
                  Local + free generate
                </div>
                <p className="text-xs text-muted">
                  No API key. On-device tools + Pollinations for generate /
                  reimagine.
                </p>
              </button>
              <button
                type="button"
                disabled={!cloudAvailable}
                onClick={() => cloudAvailable && onModeChange("cloud")}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === "cloud"
                    ? "border-violet-400/60 bg-violet-500/10"
                    : "border-border bg-surface-2 hover:border-violet-500/40"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Cloud className="h-4 w-4 text-violet-300" />
                  Cloud upgrade (FAL)
                </div>
                <p className="text-xs text-muted">
                  {cloudAvailable
                    ? "Optional FLUX Kontext when FAL_KEY is set on the server."
                    : "Unavailable — no FAL_KEY on server."}
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs text-muted">
            <p className="mb-2 font-medium text-foreground/90">Upgrades</p>
            <ul className="mb-3 list-inside list-disc space-y-1">
              <li>
                WebGPU:{" "}
                {capsWebgpu === null
                  ? "detecting…"
                  : capsWebgpu
                    ? "available — you can preload SD-Turbo for private on-device generate"
                    : "not available — Pollinations remains the default"}
              </li>
              <li>
                Fully offline edits still use local WASM models only (no
                Pollinations).
              </li>
            </ul>
            <button
              type="button"
              onClick={onLoadGenerator}
              disabled={capsWebgpu === false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Preload on-device SD-Turbo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
