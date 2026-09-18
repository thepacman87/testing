"use client";

import { X, Cpu, Cloud } from "lucide-react";

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
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Inference mode
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
                  No API key. Models download into your browser cache and run
                  on-device.
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
                  Cloud upgrade
                </div>
                <p className="text-xs text-muted">
                  {cloudAvailable
                    ? "Optional FAL FLUX Kontext when FAL_KEY is set on the server."
                    : "Unavailable — server has no FAL_KEY. Local mode works fine."}
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs text-muted">
            <p className="mb-2 font-medium text-foreground/90">Capabilities</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                WebGPU:{" "}
                {capsWebgpu === null
                  ? "detecting…"
                  : capsWebgpu
                    ? "available (SD-Turbo enabled)"
                    : "not available (synth fallback for generate)"}
              </li>
              <li>
                Quality is below cloud Grok Imagine / FLUX — this is open-weight
                on-device AI for privacy and zero cost.
              </li>
            </ul>
            <button
              type="button"
              onClick={onLoadGenerator}
              className="mt-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Preload SD-Turbo generator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
