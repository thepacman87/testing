"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./Header";
import { UploadZone } from "./UploadZone";
import { HistoryRail, type HistoryItem } from "./HistoryRail";
import { PromptBar } from "./PromptBar";
import { Canvas } from "./Canvas";
import { ModelLoader } from "./ModelLoader";
import { SettingsModal } from "./SettingsModal";
import type { EngineMode, ProgressEvent } from "@/lib/local/types";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Editor() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<EngineMode>("local");
  const [cloudAvailable, setCloudAvailable] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [capsWebgpu, setCapsWebgpu] = useState<boolean | null>(null);
  const [statusLabel, setStatusLabel] = useState("Free public generate · no API key");
  const [editorBooted, setEditorBooted] = useState(false);

  // Boot: detect caps + optional cloud + preload editor pack
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetch("/api/health").then((r) => r.json());
        if (!cancelled) {
          setCloudAvailable(Boolean(health.cloudAvailable));
        }
      } catch {
        /* ignore */
      }

      try {
        const engine = await import("@/lib/local/engine");
        const caps = await engine.detectCapabilities();
        if (cancelled) return;
        setCapsWebgpu(caps.webgpu);
        setModelLoading(true);
        setProgress({
          stage: "loading-editor",
          progress: 0,
          message: "Starting on-device editor…",
        });
        await engine.loadEditorPack((e) => {
          if (!cancelled) setProgress(e);
        });
        if (!cancelled) {
          setEditorBooted(true);
          setModelLoading(false);
          setStatusLabel("Free public generate · no API key");
          setNotice(
            "Generate uses Pollinations (no key). Matched edits (bg remove, enhance…) run on-device. Generate prompts leave the device."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setModelLoading(false);
          setEditorBooted(true);
          setError(
            err instanceof Error
              ? err.message
              : "Could not initialize local engine"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => history.find((h) => h.id === activeId) ?? null,
    [history, activeId]
  );

  const onUpload = useCallback((dataUrl: string, name: string) => {
    const item: HistoryItem = {
      id: uid(),
      imageUrl: dataUrl,
      prompt: name || "Original",
      createdAt: Date.now(),
      isOriginal: true,
    };
    setHistory([item]);
    setActiveId(item.id);
    setPrompt("");
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setHistory([]);
    setActiveId(null);
    setPrompt("");
    setError(null);
    setLoading(false);
  }, []);

  const runLocalGenerate = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    setModelLoading(true);
    try {
      const engine = await import("@/lib/local/engine");
      await engine.loadGenerator((e) => setProgress(e));
      setModelLoading(false);
      const result = await engine.generateImage(text, undefined, (e) =>
        setProgress(e)
      );
      const item: HistoryItem = {
        id: uid(),
        imageUrl: result.imageDataUrl,
        prompt: text,
        createdAt: Date.now(),
      };
      setHistory([item]);
      setActiveId(item.id);
      setStatusLabel(result.meta);
      setNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setLoading(false);
      setModelLoading(false);
    }
  }, []);

  const runLocalEdit = useCallback(
    async (imageUrl: string, text: string) => {
      setLoading(true);
      setError(null);
      try {
        const engine = await import("@/lib/local/engine");
        if (!engine.isEditorReady()) {
          setModelLoading(true);
          await engine.loadEditorPack((e) => setProgress(e));
          setModelLoading(false);
        }
        const result = await engine.editImage(imageUrl, text, (e) => {
          if (e.stage === "loading-generator" || e.stage === "loading-editor") {
            setModelLoading(true);
            setProgress(e);
          } else {
            setProgress(e);
          }
        });
        setModelLoading(false);
        const item: HistoryItem = {
          id: uid(),
          imageUrl: result.imageDataUrl,
          prompt: text,
          createdAt: Date.now(),
        };
        setHistory((prev) => [...prev, item]);
        setActiveId(item.id);
        setPrompt("");
        setStatusLabel(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Edit failed");
      } finally {
        setLoading(false);
        setModelLoading(false);
      }
    },
    []
  );

  const runCloudEdit = useCallback(async (imageUrl: string, text: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, image: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Edit failed (${res.status})`);
      const item: HistoryItem = {
        id: uid(),
        imageUrl: data.imageUrl,
        prompt: text,
        createdAt: Date.now(),
      };
      setHistory((prev) => [...prev, item]);
      setActiveId(item.id);
      setPrompt("");
      setStatusLabel(data.providerLabel || "Cloud");
      if (data.mock) setNotice(data.notice || "Cloud mock");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cloud edit failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!active || !prompt.trim() || loading) return;
    if (mode === "cloud" && cloudAvailable) {
      await runCloudEdit(active.imageUrl, prompt.trim());
    } else {
      await runLocalEdit(active.imageUrl, prompt.trim());
    }
  }, [
    active,
    prompt,
    loading,
    mode,
    cloudAvailable,
    runCloudEdit,
    runLocalEdit,
  ]);

  const download = useCallback(async () => {
    if (!active?.imageUrl) return;
    try {
      let href = active.imageUrl;
      let filename = `pixforge-${active.id}.jpg`;
      if (active.imageUrl.startsWith("http")) {
        const res = await fetch(active.imageUrl);
        const blob = await res.blob();
        href = URL.createObjectURL(blob);
        const ext = blob.type.split("/")[1] || "jpg";
        filename = `pixforge-${active.id}.${ext}`;
      } else if (active.imageUrl.startsWith("data:image/")) {
        const match = /^data:image\/([\w+]+)/.exec(active.imageUrl);
        if (match) filename = `pixforge-${active.id}.${match[1].replace("+xml", "")}`;
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      if (href.startsWith("blob:")) URL.revokeObjectURL(href);
    } catch {
      setError("Could not download image.");
    }
  }, [active]);

  const preloadGenerator = useCallback(async () => {
    setSettingsOpen(false);
    setModelLoading(true);
    try {
      const engine = await import("@/lib/local/engine");
      await engine.loadGenerator((e) => setProgress(e), { preloadSdTurbo: true });
      setStatusLabel(
        engine.isPreferOnDeviceGenerate()
          ? "SD-Turbo · on-device WebGPU"
          : "Free public generate · no API key"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generator load failed");
    } finally {
      setModelLoading(false);
    }
  }, []);

  const hasImage = history.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        mode={mode}
        onToggleSettings={() => setSettingsOpen(true)}
        statusLabel={statusLabel}
        cloudAvailable={cloudAvailable}
      />

      <ModelLoader
        visible={modelLoading && !hasImage}
        progress={progress}
        capsWebgpu={capsWebgpu ?? undefined}
      />
      {/* compact progress when already editing */}
      {modelLoading && hasImage && (
        <div className="border-b border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-center text-xs text-cyan-100">
          {progress?.message || "Loading model…"}{" "}
          {typeof progress?.progress === "number"
            ? `(${Math.round(progress.progress)}%)`
            : ""}
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setStatusLabel(
            m === "local"
              ? "Free public generate · no API key"
              : "Cloud · FAL FLUX"
          );
        }}
        cloudAvailable={cloudAvailable}
        capsWebgpu={capsWebgpu}
        onLoadGenerator={preloadGenerator}
      />

      {(error || notice) && (
        <div
          className={`border-b px-4 py-2 text-center text-sm ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {error || notice}
          {(error || notice) && (
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => {
                setError(null);
                setNotice(null);
              }}
            >
              dismiss
            </button>
          )}
        </div>
      )}

      {!hasImage ? (
        <UploadZone
          onImage={onUpload}
          onGenerate={runLocalGenerate}
          disabled={loading || (!editorBooted && modelLoading)}
          generating={loading}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <HistoryRail
            items={history}
            activeId={activeId}
            onSelect={setActiveId}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Canvas
              imageUrl={active?.imageUrl ?? null}
              loading={loading}
              promptLabel={
                active?.isOriginal ? "Original upload" : active?.prompt
              }
              onDownload={download}
              onReset={reset}
            />
            <PromptBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={submit}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
