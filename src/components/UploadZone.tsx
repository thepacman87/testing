"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";

type Props = {
  onImage: (dataUrl: string, name: string) => void;
  disabled?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 8 * 1024 * 1024;

export function UploadZone({ onImage, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [disabled, readFile]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`group relative flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 transition ${
          dragging
            ? "border-violet-400 bg-violet-500/10"
            : "border-border bg-surface/60 hover:border-violet-500/50 hover:bg-surface-2/80"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 transition group-hover:opacity-100" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 ring-1 ring-violet-400/30">
          <ImagePlus className="h-7 w-7 text-violet-300" />
        </div>
        <div className="relative text-center">
          <p className="text-lg font-medium">Drop a photo to start</p>
          <p className="mt-1 text-sm text-muted">
            or click to browse · JPEG, PNG, WebP · up to 8 MB
          </p>
        </div>
        <button
          type="button"
          className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-violet-400"
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
      {error && (
        <p className="mt-4 text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
