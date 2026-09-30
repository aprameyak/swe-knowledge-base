"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "./ui";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";

type CaptureComposerProps = {
  compact?: boolean;
  onCaptured?: (memory: { id: string }) => void;
  autofocus?: boolean;
};

export function CaptureComposer({
  compact,
  onCaptured,
  autofocus,
}: CaptureComposerProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const save = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setContent("");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      onCaptured?.(data.memory);
      router.refresh();
      if (!onCaptured && data.memory?.id) {
        router.push(`/app/memories/${data.memory.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [content, saving, onCaptured, router]);

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]"
          : "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span>Capture a memory</span>
        </div>
        {justSaved && (
          <span className="text-xs font-medium text-[var(--accent)] animate-fade-up">
            Saved — understanding it now
          </span>
        )}
      </div>
      <Textarea
        ref={ref}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder='e.g. "finally fixed the slow dashboard query today, moved aggregation into postgres and it went from around 8 seconds to 2"'
        className={compact ? "min-h-[88px] border-0 bg-transparent px-1 shadow-none focus:ring-0" : "min-h-[120px]"}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--ink-faint)]">
          Informal is fine. ⌘/Ctrl + Enter to save.
        </p>
        <Button onClick={() => void save()} disabled={!content.trim() || saving} size="sm">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              Save
              <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />
            </>
          )}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
