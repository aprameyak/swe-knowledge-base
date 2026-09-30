"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, EmptyState, Input, Panel, ProvenanceBadge } from "@/components/ui";
import { Search } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

const SUGGESTIONS = [
  "What are the hardest technical problems I've solved?",
  "When have I demonstrated leadership?",
  "What measurable impact have I had?",
  "What examples involve ambiguity?",
  "What database problems have I solved?",
  "What failures taught me something important?",
  "What experiences demonstrate ownership?",
];

type Result = {
  score: number;
  memory: {
    id: string;
    title: string | null;
    content: string;
    occurredAt: string | null;
    createdAt: string;
    project: { name: string } | null;
    extractions: {
      id: string;
      kind: string;
      value: string;
      provenance: string;
    }[];
    themes: { name: string }[];
    skills: { name: string }[];
  };
};

export default function RecallPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [activeQuery, setActiveQuery] = useState("");

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setActiveQuery(trimmed);
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl">Recall</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Ask questions against your own history. Answers stay grounded in what
          you&apos;ve captured.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
          <Input
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What experiences demonstrate ownership?"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void run(s)}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-left text-xs text-[var(--ink-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-ink)]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-4">
        {results === null && (
          <EmptyState
            title="Your history is searchable"
            description="Try a suggestion above, or ask something specific — leadership, failures, metrics, a technology, a project."
          />
        )}
        {results && results.length === 0 && (
          <EmptyState
            title="No matching memories yet"
            description={`Nothing in your Strand clearly matches “${activeQuery}”. That may mean you haven't captured it — not that it didn't happen.`}
          />
        )}
        {results && results.length > 0 && (
          <>
            <p className="text-xs text-[var(--ink-faint)]">
              {results.length} grounded result{results.length === 1 ? "" : "s"}{" "}
              for “{activeQuery}”
            </p>
            {results.map((r) => (
              <Panel key={r.memory.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/app/memories/${r.memory.id}`}
                    className="font-display text-xl hover:text-[var(--accent)]"
                  >
                    {r.memory.title || r.memory.content.slice(0, 80)}
                  </Link>
                  <span className="shrink-0 text-[11px] text-[var(--ink-faint)]">
                    relevance {r.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-faint)]">
                  {formatRelativeDate(
                    r.memory.occurredAt || r.memory.createdAt
                  )}
                  {r.memory.project && <> · {r.memory.project.name}</>}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {r.memory.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.memory.extractions.slice(0, 5).map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px]"
                    >
                      <span className="capitalize text-[var(--ink-faint)]">
                        {e.kind}
                      </span>
                      <span className="max-w-[140px] truncate">{e.value}</span>
                      <ProvenanceBadge provenance={e.provenance} />
                    </span>
                  ))}
                  {r.memory.themes.map((t) => (
                    <span
                      key={t.name}
                      className="rounded-full bg-[var(--inferred-soft)] px-2 py-0.5 text-[11px] text-[var(--inferred)]"
                    >
                      {t.name} · inferred
                    </span>
                  ))}
                </div>
              </Panel>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
