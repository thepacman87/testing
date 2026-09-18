"use client";

import { X, Cpu, Cloud, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "local" | "cloud";
  onModeChange: (m: "local" | "cloud") => void;
  cloudAvailable: boolean;
  capsWebgpu: boolean | null;
  onLoadGenerator: () => void;
  sidecarReady?: boolean;
};

export function SettingsModal({
  open,
  onClose,
  mode,
  onModeChange,
  cloudAvailable,
  capsWebgpu,
  onLoadGenerator,
  sidecarReady,
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
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted">
            <div className="mb-1 flex items-center gap-2 font-medium text-emerald-200">
              <Cpu className="h-3.5 w-3.5" />
              Local model · no external AI
            </div>
            <p>
              Text-to-image uses open-weight <strong className="text-foreground/90">SD-Turbo</strong> on
              this machine via a localhost Python sidecar (
              <code className="text-foreground/80">npm run ai</code>). No
              Pollinations, FAL, OpenAI, or other remote model APIs for default
              generate.
            </p>
            <p className="mt-2">
              Sidecar:{" "}
              <span className={sidecarReady ? "text-emerald-300" : "text-amber-300"}>
                {sidecarReady ? "ready" : "not detected — run npm run ai / npm run dev"}
              </span>
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
                  Local (default)
                </div>
                <p className="text-xs text-muted">
                  Local SD-Turbo generate + on-device WASM edits. No API key.
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
                    ? "Optional only — not used for default generate."
                    : "Unavailable — no FAL_KEY."}
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs text-muted">
            <p className="mb-2 font-medium text-foreground/90">Optional browser WebGPU</p>
            <ul className="mb-3 list-inside list-disc space-y-1">
              <li>
                WebGPU:{" "}
                {capsWebgpu === null
                  ? "detecting…"
                  : capsWebgpu
                    ? "available"
                    : "not available (CPU sidecar is the default)"}
              </li>
              <li>
                Quality is below cloud Grok Imagine — open-weight 1-step Turbo on
                CPU/GPU.
              </li>
            </ul>
            <button
              type="button"
              onClick={onLoadGenerator}
              disabled={capsWebgpu === false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Preload browser SD-Turbo (WebGPU)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
