"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Upload, Wand2 } from "lucide-react";

type Props = {
  onImage: (dataUrl: string, name: string) => void;
  onGenerate: (prompt: string) => void;
  disabled?: boolean;
  generating?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 8 * 1024 * 1024;

export function UploadZone({
  onImage,
  onGenerate,
  disabled,
  generating,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genPrompt, setGenPrompt] = useState("");
  const [tab, setTab] = useState<"upload" | "generate">("upload");

  const readFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file (JPEG, PNG, WebP, GIF).");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image must be under 8 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImage(reader.result, file.name);
        }
      };
      reader.onerror = () => setError("Could not read that file.");
      reader.readAsDataURL(file);
    },
    [onImage]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="mb-5 flex rounded-full border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === "upload"
              ? "bg-violet-600 text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Upload photo
        </button>
        <button
          type="button"
          onClick={() => setTab("generate")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === "generate"
              ? "bg-violet-600 text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Generate from text
        </button>
      </div>

      {tab === "upload" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (disabled) return;
            const file = e.dataTransfer.files?.[0];
            if (file) readFile(file);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`group relative flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-14 transition ${
            dragging
              ? "border-violet-400 bg-violet-500/10"
              : "border-border bg-surface/60 hover:border-violet-500/50 hover:bg-surface-2/80"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 ring-1 ring-violet-400/30">
            <ImagePlus className="h-7 w-7 text-violet-300" />
          </div>
          <div className="relative text-center">
            <p className="text-lg font-medium">Drop a photo to edit</p>
            <p className="mt-1 text-sm text-muted">
              or click to browse · JPEG, PNG, WebP · up to 8 MB
            </p>
          </div>
          <button
            type="button"
            className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-600/30"
          >
            <Upload className="h-4 w-4" />
            Upload image
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-xl rounded-2xl border border-border bg-surface/60 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-600/30 ring-1 ring-cyan-400/30">
              <Wand2 className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <p className="font-medium">Generate an image</p>
              <p className="text-xs text-muted">
                Free public Pollinations generate — no API key required
              </p>
            </div>
          </div>
          <textarea
            rows={3}
            value={genPrompt}
            disabled={disabled || generating}
            onChange={(e) => setGenPrompt(e.target.value)}
            placeholder="A cozy cabin in the snowy woods at dusk, watercolor…"
            className="mb-3 w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-muted/70 focus:border-violet-500/50"
          />
          <button
            type="button"
            disabled={disabled || generating || !genPrompt.trim()}
            onClick={() => onGenerate(genPrompt.trim())}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 disabled:opacity-40"
          >
            <Wand2 className="h-4 w-4" />
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      <p className="mt-6 max-w-md text-center text-xs text-muted">
        Generate uses the free public Pollinations endpoint (no API key; prompts
        leave the device). Background removal, enhance, and color grades run
        on-device via WASM.
      </p>
    </div>
  );
}
