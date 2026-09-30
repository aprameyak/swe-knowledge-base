import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Panel, ProvenanceBadge } from "@/components/ui";
import { ReflectionCard } from "@/components/memory-card";
import { MemoryActions } from "@/components/memory-actions";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

type Params = { params: Promise<{ id: string }> };

export default async function MemoryDetailPage({ params }: Params) {
  const user = await requireUser();
  const { id } = await params;

  const memory = await prisma.memory.findFirst({
    where: { id, userId: user.id },
    include: {
      extractions: { orderBy: { kind: "asc" } },
      project: true,
      reflections: { orderBy: { createdAt: "asc" } },
      themeLinks: { include: { theme: true } },
      skillLinks: { include: { skill: true } },
      connectionsFrom: {
        include: {
          toMemory: { select: { id: true, title: true, content: true } },
        },
      },
      connectionsTo: {
        include: {
          fromMemory: { select: { id: true, title: true, content: true } },
        },
      },
    },
  });

  if (!memory) notFound();

  const related = [
    ...memory.connectionsFrom.map((c) => ({
      id: c.toMemory.id,
      title: c.toMemory.title,
      content: c.toMemory.content,
      reason: c.reason,
      strength: c.strength,
    })),
    ...memory.connectionsTo.map((c) => ({
      id: c.fromMemory.id,
      title: c.fromMemory.title,
      content: c.fromMemory.content,
      reason: c.reason,
      strength: c.strength,
    })),
  ];

  const pending = memory.reflections.filter((r) => r.status === "pending");
  const answered = memory.reflections.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/app"
          className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink-muted)]"
        >
          ← Back
        </Link>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl leading-tight">
          {memory.title || "Memory"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ink-faint)]">
          <span>
            {formatRelativeDate(memory.occurredAt || memory.createdAt)}
          </span>
          {memory.project && (
            <>
              <span>·</span>
              <span>{memory.project.name}</span>
            </>
          )}
          <Badge tone="neutral">{memory.status}</Badge>
        </div>
      </div>

      <Panel className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
            Original memory — source of truth
          </h2>
          <Badge tone="explicit">Your words</Badge>
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
          {memory.content}
        </p>
        <MemoryActions memoryId={memory.id} content={memory.content} />
      </Panel>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Optional reflections</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Skip freely. Answers are appended to your memory so provenance stays
            clear.
          </p>
          {pending.map((r) => (
            <ReflectionCard key={r.id} reflection={r} />
          ))}
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl">Understood structure</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Extracted from your memory. Explicit items quote your wording;
          inferred items are labels — not new facts.
        </p>
        <div className="mt-4 space-y-2">
          {memory.extractions.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No structure extracted yet.
            </p>
          ) : (
            memory.extractions.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
              >
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                    {e.kind}
                  </div>
                  <div className="mt-0.5 text-sm text-[var(--ink)]">
                    {e.value}
                  </div>
                  {e.sourceSpan && (
                    <div className="mt-1 text-xs italic text-[var(--ink-faint)]">
                      “{e.sourceSpan}”
                    </div>
                  )}
                </div>
                <ProvenanceBadge provenance={e.provenance} />
              </div>
            ))
          )}
        </div>
      </section>

      {(memory.skillLinks.length > 0 || memory.themeLinks.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-2">
          {memory.skillLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                Skills & technologies
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {memory.skillLinks.map((s) => (
                  <span
                    key={s.skillId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs"
                  >
                    {s.skill.name}
                    <ProvenanceBadge provenance={s.provenance} />
                  </span>
                ))}
              </div>
            </div>
          )}
          {memory.themeLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
                Behavioral themes
              </h3>
              <div className="mt-2 space-y-2">
                {memory.themeLinks.map((t) => (
                  <div
                    key={t.themeId}
                    className="rounded-xl bg-[var(--inferred-soft)] px-3 py-2 text-sm text-[var(--inferred)]"
                  >
                    <div className="font-medium">{t.theme.name}</div>
                    {t.rationale && (
                      <div className="mt-0.5 text-xs opacity-80">
                        {t.rationale}
                      </div>
                    )}
                    <div className="mt-1">
                      <ProvenanceBadge provenance="inferred" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Connected</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Related memories connected in the background.
          </p>
          <div className="mt-4 space-y-2">
            {related.map((r) => (
              <Link key={r.id} href={`/app/memories/${r.id}`}>
                <Panel className="p-4 transition hover:border-[var(--line-strong)]">
                  <div className="font-medium text-[var(--ink)]">
                    {r.title || r.content.slice(0, 80)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--ink-faint)]">
                    {r.reason} · strength {Math.round(r.strength * 100) / 100}
                  </div>
                </Panel>
              </Link>
            ))}
          </div>
        </section>
      )}

      {answered.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
            Past reflection prompts
          </h2>
          <ul className="mt-2 space-y-2 text-sm text-[var(--ink-muted)]">
            {answered.map((r) => (
              <li key={r.id}>
                {r.question}{" "}
                <span className="text-[var(--ink-faint)]">({r.status})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
