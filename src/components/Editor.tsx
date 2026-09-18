"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./Header";
import { UploadZone } from "./UploadZone";
import { HistoryRail, type HistoryItem } from "./HistoryRail";
import { PromptBar } from "./PromptBar";
import { Canvas } from "./Canvas";

type Health = {
  providerLabel: string;
  mock: boolean;
};

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
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) =>
        setHealth({
          providerLabel: d.providerLabel ?? "Unknown",
          mock: Boolean(d.mock),
        })
      )
      .catch(() =>
        setHealth({ providerLabel: "Unavailable", mock: true })
      );
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
    setNotice(null);
  }, []);

  const reset = useCallback(() => {
    setHistory([]);
    setActiveId(null);
    setPrompt("");
    setError(null);
    setNotice(null);
    setLoading(false);
  }, []);

  const submit = useCallback(async () => {
    if (!active || !prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image: active.imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Edit failed (${res.status})`);
      }

      const item: HistoryItem = {
        id: uid(),
        imageUrl: data.imageUrl,
        prompt: prompt.trim(),
        createdAt: Date.now(),
      };
      setHistory((prev) => [...prev, item]);
      setActiveId(item.id);
      setPrompt("");
      if (data.mock && data.notice) setNotice(data.notice);
      if (data.providerLabel) {
        setHealth({
          providerLabel: data.providerLabel,
          mock: Boolean(data.mock),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setLoading(false);
    }
  }, [active, prompt, loading]);

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
        const match = /^data:image\/(\w+)/.exec(active.imageUrl);
        if (match) filename = `pixforge-${active.id}.${match[1]}`;
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

  const hasImage = history.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        providerLabel={health?.providerLabel}
        mock={health?.mock}
      />

      {(error || notice) && (
        <div
          className={`border-b px-4 py-2 text-center text-sm ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {error || notice}
          {error && (
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => setError(null)}
            >
              dismiss
            </button>
          )}
        </div>
      )}

      {!hasImage ? (
        <UploadZone onImage={onUpload} disabled={loading} />
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
                active?.isOriginal
                  ? "Original upload"
                  : active?.prompt
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
