"use client";

import { useState } from "react";
import Link from "next/link";
import { USE_MODES, type UseModeId } from "@/lib/ai";
import { Button, EmptyState, Input, Panel, Textarea, ProvenanceBadge } from "@/components/ui";

type UsePayload = {
  mode: { id: string; title: string; description: string };
  guidance: string;
  buckets: {
    label: string;
    results: {
      score: number;
      memory: {
        id: string;
        title: string | null;
        content: string;
        project: { name: string } | null;
        extractions: {
          id: string;
          kind: string;
          value: string;
          provenance: string;
        }[];
        themes: string[];
      };
    }[];
  }[];
};

export default function UsePage() {
  const [mode, setMode] = useState<UseModeId>("behavioral");
  const [focus, setFocus] = useState("");
  const [job, setJob] = useState("");
  const [data, setData] = useState<UsePayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(nextMode = mode, nextFocus = focus, nextJob = job) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: nextMode });
      if (nextFocus.trim()) params.set("q", nextFocus.trim());
      if (nextMode === "job" && nextJob.trim()) params.set("job", nextJob.trim());
      const res = await fetch(`/api/use?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Use</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Views over the same notes for interviews and reviews.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {USE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              void load(m.id, focus, job);
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              mode === m.id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
            }`}
          >
            {m.title}
          </button>
        ))}
      </div>

      <Panel className="p-5">
        <h2 className="font-display text-xl">
          {USE_MODES.find((m) => m.id === mode)?.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {USE_MODES.find((m) => m.id === mode)?.description}
        </p>

        {mode === "job" ? (
          <div className="mt-4 space-y-3">
            <Textarea
              placeholder="Paste a job description or list of requirements…"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              size="sm"
              disabled={loading || !job.trim()}
              onClick={() => void load(mode, focus, job)}
            >
              Match my history
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Optional focus (e.g. leadership, Search Experience)"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={() => void load(mode, focus, job)}
            >
              Refresh
            </Button>
          </div>
        )}
      </Panel>

      {data?.guidance && (
        <p className="rounded-xl bg-[var(--accent-soft)]/60 px-4 py-3 text-sm text-[var(--accent-ink)]">
          {data.guidance}
        </p>
      )}

      {loading && (
        <p className="text-sm text-[var(--ink-faint)] animate-pulse-soft">
          Loading…
        </p>
      )}

      {!loading && data && data.buckets.every((b) => b.results.length === 0) && (
        <EmptyState
          title="No matches"
          description="Capture more experiences, or try a different mode. Strand won't invent examples to fill the gap."
          action={
            <Link href="/app" className="text-sm text-[var(--accent)]">
              Capture a memory
            </Link>
          }
        />
      )}

      <div className="space-y-8">
        {data?.buckets.map((bucket) =>
          bucket.results.length === 0 ? null : (
            <section key={bucket.label}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                {bucket.label}
              </h3>
              <div className="mt-3 space-y-3">
                {bucket.results.map((r) => (
                  <Panel key={r.memory.id} className="p-4">
                    <Link
                      href={`/app/memories/${r.memory.id}`}
                      className="font-display text-lg hover:text-[var(--accent)]"
                    >
                      {r.memory.title || r.memory.content.slice(0, 80)}
                    </Link>
                    {r.memory.project && (
                      <p className="mt-1 text-xs text-[var(--ink-faint)]">
                        {r.memory.project.name}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)] line-clamp-4">
                      {r.memory.content}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.memory.extractions.map((e) => (
                        <span
                          key={e.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px]"
                        >
                          <span className="capitalize text-[var(--ink-faint)]">
                            {e.kind}
                          </span>
                          <span className="max-w-[140px] truncate">
                            {e.value}
                          </span>
                          <ProvenanceBadge provenance={e.provenance} />
                        </span>
                      ))}
                      {r.memory.themes.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[var(--inferred-soft)] px-2 py-0.5 text-[11px] text-[var(--inferred)]"
                        >
                          {t} · inferred
                        </span>
                      ))}
                    </div>
                    {mode === "behavioral" && (
                      <p className="mt-3 text-xs text-[var(--ink-faint)]">
                        Reminder: reopen the source memory to recover details
                        before drafting a STAR answer.
                      </p>
                    )}
                    {mode === "resume" && (
                      <p className="mt-3 text-xs text-[var(--ink-faint)]">
                        Evidence only — polish language after you verify each
                        claim against the original memory.
                      </p>
                    )}
                  </Panel>
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </div>
  );
}
