"use client";

import { useState } from "react";
import { Button, ProvenanceBadge, Textarea } from "@/components/ui";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Reflection = {
  id: string;
  question: string;
  reason: string | null;
  status: string;
};

type Extraction = {
  id: string;
  kind: string;
  value: string;
  provenance: string;
  sourceSpan: string | null;
};

export function ReflectionCard({
  reflection,
  onDone,
}: {
  reflection: Reflection;
  onDone?: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function respond(status: "answered" | "skipped" | "dont_remember") {
    setBusy(true);
    try {
      await fetch(`/api/reflections/${reflection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          answer: status === "answered" ? answer : undefined,
        }),
      });
      onDone?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--warn)]/20 bg-[var(--warn-soft)]/50 p-4">
      <p className="text-sm font-medium text-[var(--ink)]">
        {reflection.question}
      </p>
      {reflection.reason && (
        <p className="mt-1 text-xs text-[var(--warn)]">{reflection.reason}</p>
      )}
      <Textarea
        className="mt-3 min-h-[72px] bg-[var(--surface)]"
        placeholder="Optional — skip anytime"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !answer.trim()}
          onClick={() => void respond("answered")}
        >
          Add to memory
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void respond("dont_remember")}
        >
          Don&apos;t remember
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void respond("skipped")}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

export function MemoryCard({
  memory,
}: {
  memory: {
    id: string;
    title: string | null;
    content: string;
    occurredAt: string | Date | null;
    createdAt: string | Date;
    project?: { name: string } | null;
    extractions?: Extraction[];
    reflections?: Reflection[];
    themeLinks?: { theme: { name: string } }[];
  };
}) {
  const router = useRouter();
  const pending = memory.reflections?.filter((r) => r.status === "pending") || [];

  return (
    <article className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition hover:border-[var(--line-strong)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/app/memories/${memory.id}`}
            className="font-display text-lg leading-snug text-[var(--ink)] hover:text-[var(--accent)]"
          >
            {memory.title || memory.content.slice(0, 80)}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-faint)]">
            <span>
              {formatRelativeDate(memory.occurredAt || memory.createdAt)}
            </span>
            {memory.project && (
              <>
                <span>·</span>
                <span>{memory.project.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)] line-clamp-3">
        {memory.content}
      </p>

      {memory.extractions && memory.extractions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {memory.extractions.slice(0, 6).map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
            >
              <span className="capitalize text-[var(--ink-faint)]">{e.kind}</span>
              <span className="max-w-[140px] truncate">{e.value}</span>
              <ProvenanceBadge provenance={e.provenance} />
            </span>
          ))}
        </div>
      )}

      {memory.themeLinks && memory.themeLinks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memory.themeLinks.map((t, i) => (
            <span
              key={i}
              className="rounded-full bg-[var(--inferred-soft)] px-2 py-0.5 text-[11px] text-[var(--inferred)]"
            >
              {t.theme.name}
            </span>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--warn)]">
            Optional reflection
          </p>
          {pending.slice(0, 1).map((r) => (
            <ReflectionCard
              key={r.id}
              reflection={r}
              onDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </article>
  );
}
