import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, Panel, ProvenanceBadge } from "@/components/ui";
import Link from "next/link";

export default async function KnowledgePage() {
  const user = await requireUser();

  const [
    memoryCount,
    projects,
    skills,
    themes,
    metrics,
    decisions,
    lessons,
    challenges,
  ] = await Promise.all([
    prisma.memory.count({ where: { userId: user.id } }),
    prisma.project.findMany({
      where: { userId: user.id },
      include: { _count: { select: { memories: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.skill.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { evidence: true } },
        evidence: {
          take: 1,
          include: { memory: { select: { id: true, title: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.behavioralTheme.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { evidence: true } },
        evidence: {
          take: 2,
          include: {
            memory: { select: { id: true, title: true, content: true } },
          },
        },
      },
    }),
    prisma.memoryExtraction.findMany({
      where: { memory: { userId: user.id }, kind: "metric" },
      include: { memory: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.memoryExtraction.findMany({
      where: { memory: { userId: user.id }, kind: "decision" },
      include: { memory: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.memoryExtraction.findMany({
      where: { memory: { userId: user.id }, kind: "lesson" },
      include: { memory: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.memoryExtraction.findMany({
      where: {
        memory: { userId: user.id },
        kind: { in: ["challenge", "problem"] },
      },
      include: { memory: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const tech = skills.filter((s) => s.kind === "technology");
  const skillOnly = skills.filter((s) => s.kind === "skill");

  const coverage = [
    { label: "Memories", count: memoryCount },
    { label: "Projects", count: projects.length },
    { label: "Metrics", count: metrics.length },
    { label: "Decisions", count: decisions.length },
    { label: "Lessons", count: lessons.length },
    { label: "Themes", count: themes.length },
  ];

  if (memoryCount === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl sm:text-4xl">Knowledge</h1>
        <div className="mt-8">
          <EmptyState
            title="Knowledge grows from captures"
            description="As you save memories, Strand organizes projects, skills, metrics, decisions, and behavioral themes — always with provenance back to your words."
            action={
              <Link href="/app" className="text-sm text-[var(--accent)]">
                Capture something
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Knowledge</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          What your history contains — and where evidence is still thin. Counts
          reflect captured evidence, not invented scores.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {coverage.map((c) => (
          <Panel key={c.label} className="px-4 py-4 text-center">
            <div className="font-display text-2xl text-[var(--ink)]">
              {c.count}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
              {c.label}
            </div>
          </Panel>
        ))}
      </div>

      <Section title="Behavioral themes" note="Inferred from wording — confirm before treating as fact.">
        {themes.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No themes yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {themes.map((t) => (
              <Panel key={t.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{t.name}</h3>
                  <span className="text-xs text-[var(--ink-faint)]">
                    {t._count.evidence} memor{t._count.evidence === 1 ? "y" : "ies"}
                  </span>
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-[var(--inferred)]">
                    {t.description}
                  </p>
                )}
                <ul className="mt-3 space-y-1.5">
                  {t.evidence.map((e) => (
                    <li key={e.memoryId}>
                      <Link
                        href={`/app/memories/${e.memory.id}`}
                        className="text-sm text-[var(--accent)] hover:underline line-clamp-1"
                      >
                        {e.memory.title || e.memory.content.slice(0, 60)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}
      </Section>

      <Section title="Measurable outcomes" note="Only metrics found in your memories.">
        <EvidenceList items={metrics} />
      </Section>

      <Section title="Technical decisions">
        <EvidenceList items={decisions} />
      </Section>

      <Section title="Failures & lessons">
        <EvidenceList items={lessons} empty="No explicit lessons captured yet." />
      </Section>

      <Section title="Challenges & problems">
        <EvidenceList items={challenges} />
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Skills">
          <TagCloud
            items={skillOnly.map((s) => ({
              name: s.name,
              count: s._count.evidence,
              href: s.evidence[0]
                ? `/app/memories/${s.evidence[0].memory.id}`
                : undefined,
              provenance: s.evidence[0]?.provenance,
            }))}
          />
        </Section>
        <Section title="Technologies">
          <TagCloud
            items={tech.map((s) => ({
              name: s.name,
              count: s._count.evidence,
              href: s.evidence[0]
                ? `/app/memories/${s.evidence[0].memory.id}`
                : undefined,
              provenance: s.evidence[0]?.provenance,
            }))}
          />
        </Section>
      </div>

      <Section title="Projects">
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href="/app/projects">
              <Panel className="p-4 transition hover:border-[var(--line-strong)]">
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-[var(--ink-faint)] capitalize">
                  {p.kind.replace("_", " ")}
                  {p.organization && ` · ${p.organization}`}
                  {" · "}
                  {p._count.memories} memories
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      {note && (
        <p className="mt-1 text-xs text-[var(--ink-faint)]">{note}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EvidenceList({
  items,
  empty = "Nothing here yet.",
}: {
  items: {
    id: string;
    value: string;
    provenance: string;
    memory: { id: string; title: string | null };
  }[];
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
        >
          <div>
            <p className="text-sm text-[var(--ink)]">{item.value}</p>
            <Link
              href={`/app/memories/${item.memory.id}`}
              className="mt-1 text-xs text-[var(--accent)] hover:underline"
            >
              {item.memory.title || "Source memory"}
            </Link>
          </div>
          <ProvenanceBadge provenance={item.provenance} />
        </li>
      ))}
    </ul>
  );
}

function TagCloud({
  items,
}: {
  items: {
    name: string;
    count: number;
    href?: string;
    provenance?: string;
  }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">None yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const inner = (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm">
            {item.name}
            <span className="text-[var(--ink-faint)]">{item.count}</span>
            {item.provenance && (
              <ProvenanceBadge provenance={item.provenance} />
            )}
          </span>
        );
        return item.href ? (
          <Link key={item.name} href={item.href}>
            {inner}
          </Link>
        ) : (
          <span key={item.name}>{inner}</span>
        );
      })}
    </div>
  );
}
