import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CaptureComposer } from "@/components/capture-composer";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/ui";
import Link from "next/link";

export default async function AppHomePage() {
  const user = await requireUser();

  const [memories, pendingCount, memoryCount] = await Promise.all([
    prisma.memory.findMany({
      where: { userId: user.id },
      include: {
        extractions: true,
        project: true,
        reflections: {
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
        },
        themeLinks: { include: { theme: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
    }),
    prisma.reflectionQuestion.count({
      where: { userId: user.id, status: "pending" },
    }),
    prisma.memory.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--ink)]">
          What happened?
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Capture something while it&apos;s fresh. Structure comes after.
        </p>
      </div>

      <div className="animate-fade-up-delay">
        <CaptureComposer autofocus />
      </div>

      {memoryCount > 0 && (
        <div className="flex flex-wrap gap-3 text-sm animate-fade-up-delay-2">
          <Link
            href="/app/timeline"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
          >
            {memoryCount} memories
          </Link>
          {pendingCount > 0 && (
            <span className="rounded-full bg-[var(--warn-soft)] px-3 py-1.5 text-[var(--warn)]">
              {pendingCount} optional reflection
              {pendingCount === 1 ? "" : "s"}
            </span>
          )}
          <Link
            href="/app/recall"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
          >
            Ask your history →
          </Link>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--ink-faint)]">
          Recent
        </h2>
        {memories.length === 0 ? (
          <EmptyState
            title="Your career memory starts empty"
            description="Write one informal note about something you did, fixed, decided, or learned. Strand will extract structure and ask a follow-up only if it helps."
          />
        ) : (
          <div className="space-y-4">
            {memories.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
