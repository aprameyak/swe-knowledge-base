import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, ProvenanceBadge } from "@/components/ui";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

export default async function TimelinePage() {
  const user = await requireUser();
  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    include: {
      project: true,
      extractions: {
        where: { kind: { in: ["metric", "decision", "lesson", "outcome"] } },
      },
      themeLinks: { include: { theme: true } },
      skillLinks: { include: { skill: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const byYear = new Map<string, typeof memories>();
  for (const m of memories) {
    const d = m.occurredAt || m.createdAt;
    const year = String(d.getFullYear());
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(m);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl">Timeline</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Your professional history as it accumulated — projects, decisions,
          lessons, and measurable results.
        </p>
      </div>

      {memories.length === 0 ? (
        <EmptyState
          title="Nothing on the timeline yet"
          description="Capture a few memories and your career history will start to take shape here."
          action={
            <Link
              href="/app"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Capture your first memory
            </Link>
          }
        />
      ) : (
        <div className="space-y-12">
          {[...byYear.entries()].map(([year, items]) => (
            <section key={year}>
              <h2 className="mb-6 font-display text-2xl text-[var(--ink)]">
                {year}
              </h2>
              <ol className="relative space-y-0 border-l border-[var(--line-strong)] ml-2">
                {items.map((m) => (
                  <li key={m.id} className="relative pl-8 pb-10 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]" />
                    <div className="text-xs text-[var(--ink-faint)]">
                      {formatRelativeDate(m.occurredAt || m.createdAt)}
                      {m.project && <> · {m.project.name}</>}
                    </div>
                    <Link
                      href={`/app/memories/${m.id}`}
                      className="mt-1 block font-display text-xl text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {m.title || m.content.slice(0, 80)}
                    </Link>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)] line-clamp-2">
                      {m.content}
                    </p>
                    {(m.extractions.length > 0 ||
                      m.themeLinks.length > 0 ||
                      m.skillLinks.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.extractions.slice(0, 4).map((e) => (
                          <span
                            key={e.id}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
                          >
                            <span className="capitalize">{e.kind}</span>
                            <span className="max-w-[120px] truncate font-medium text-[var(--ink)]">
                              {e.value}
                            </span>
                            <ProvenanceBadge provenance={e.provenance} />
                          </span>
                        ))}
                        {m.themeLinks.map((t) => (
                          <span
                            key={t.themeId}
                            className="rounded-full bg-[var(--inferred-soft)] px-2 py-0.5 text-[11px] text-[var(--inferred)]"
                          >
                            {t.theme.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
