"use client";

import { Cpu, Download, Sparkles } from "lucide-react";
import type { ProgressEvent } from "@/lib/local/types";

type Props = {
  visible: boolean;
  progress: ProgressEvent | null;
  capsWebgpu?: boolean;
};

export function ModelLoader({ visible, progress, capsWebgpu }: Props) {
  if (!visible) return null;
  const pct = Math.round(progress?.progress ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-violet-900/30">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Loading on-device AI</h2>
            <p className="text-xs text-muted">
              Runs in your browser · no API key · models cache locally
            </p>
          </div>
        </div>

        <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mb-4 text-sm text-foreground/90">
          {progress?.message || "Starting…"}
        </p>
        {progress?.file && (
          <p className="mb-4 truncate font-mono text-[10px] text-muted">
            {progress.file}
          </p>
        )}

        <ul className="space-y-2 text-xs text-muted">
          <li className="flex items-start gap-2">
            <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
            <span>
              Editor pack: background removal, enhance, depth bokeh, color
              grades — typically a few hundred MB on first run.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span>
              Text-to-image: SD-Turbo (~2.3&nbsp;GB) when WebGPU is available
              {capsWebgpu === false
                ? " — not detected here, using lightweight synth."
                : capsWebgpu
                  ? " — WebGPU detected."
                  : "."}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
