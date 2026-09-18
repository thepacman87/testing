"use client";

import { Clock } from "lucide-react";

export type HistoryItem = {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: number;
  isOriginal?: boolean;
};

type Props = {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function HistoryRail({ items, activeId, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <aside className="flex w-full flex-col border-t border-border bg-surface/40 lg:w-56 lg:border-t-0 lg:border-r">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Clock className="h-3.5 w-3.5 text-muted" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          History
        </span>
        <span className="ml-auto rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
          {items.length}
        </span>
      </div>
      <div className="scrollbar-thin flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
        {items.map((item, idx) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group relative shrink-0 overflow-hidden rounded-xl border text-left transition ${
                active
                  ? "border-violet-400 ring-2 ring-violet-500/40"
                  : "border-border hover:border-violet-500/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.isOriginal ? "Original" : item.prompt}
                className="h-20 w-28 object-cover lg:h-24 lg:w-full"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
                <p className="truncate text-[10px] font-medium text-white/90">
                  {item.isOriginal
                    ? "Original"
                    : item.prompt || `Edit ${idx}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
