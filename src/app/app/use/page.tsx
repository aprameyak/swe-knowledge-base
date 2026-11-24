"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { USE_MODES, type UseModeId } from "@/lib/ai";
import {
  Button,
  EmptyState,
  Input,
  Panel,
  Textarea,
  ProvenanceBadge,
} from "@/components/ui";

type UsePayload = {
  mode: { id: string; title: string; description: string };
  guidance: string;
  exportMarkdown?: string;
  buckets: {
    label: string;
    results: {
      score: number;
      drafts: {
        resumeBullet: string;
        star: string;
        grounded: boolean;
        explicitMetric: boolean;
      };
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

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function UsePage() {
  const [mode, setMode] = useState<UseModeId>("behavioral");
  const [focus, setFocus] = useState("");
  const [job, setJob] = useState("");
  const [data, setData] = useState<UsePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  async function markCopied(key: string, text: string) {
    await copyText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1500);
  }

  useEffect(() => {
    void load("behavioral", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showResume = mode === "resume" || mode === "performance" || mode === "portfolio";
  const showStar =
    mode === "behavioral" || mode === "job" || mode === "reflection";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Use</h1>
          <p className="mt-2 text-[var(--ink-muted)]">
            Pull real notes into resume bullets and STAR drafts you can copy.
          </p>
        </div>
        {data?.exportMarkdown ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void markCopied("export", data.exportMarkdown || "")
            }
          >
            {copied === "export" ? "Copied export" : "Copy full export"}
          </Button>
        ) : null}
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

                    {(showResume || showStar) && (
                      <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-3">
                        {showResume && (
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                                Resume bullet
                                {r.drafts.explicitMetric
                                  ? " · explicit metric"
                                  : ""}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void markCopied(
                                    `${r.memory.id}-bullet`,
                                    r.drafts.resumeBullet
                                  )
                                }
                              >
                                {copied === `${r.memory.id}-bullet`
                                  ? "Copied"
                                  : "Copy"}
                              </Button>
                            </div>
                            <p className="rounded-lg bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed">
                              {r.drafts.resumeBullet}
                            </p>
                          </div>
                        )}
                        {showStar && (
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                                STAR draft
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  void markCopied(
                                    `${r.memory.id}-star`,
                                    r.drafts.star
                                  )
                                }
                              >
                                {copied === `${r.memory.id}-star`
                                  ? "Copied"
                                  : "Copy"}
                              </Button>
                            </div>
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--bg)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                              {r.drafts.star}
                            </pre>
                          </div>
                        )}
                        {!r.drafts.grounded && (
                          <p className="text-xs text-[var(--ink-faint)]">
                            Weak grounding — reopen the source memory before using.
                          </p>
                        )}
                      </div>
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
