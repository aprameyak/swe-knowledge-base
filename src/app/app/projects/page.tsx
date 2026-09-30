import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, Panel } from "@/components/ui";
import Link from "next/link";
import { ProjectCreateForm } from "@/components/project-create-form";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      memories: {
        orderBy: { occurredAt: "desc" },
        take: 3,
        select: { id: true, title: true, content: true, occurredAt: true },
      },
      _count: { select: { memories: true, experiences: true } },
    },
    orderBy: [{ startedAt: "desc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Projects</h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Jobs, internships, side projects, hackathons — contexts for your
          memories. You don&apos;t need to manage a graph.
        </p>
      </div>

      <ProjectCreateForm />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a context when you want one, or just capture memories — Strand can associate them later."
        />
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <Panel key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl">{p.name}</h2>
                  <p className="mt-1 text-xs capitalize text-[var(--ink-faint)]">
                    {p.kind.replace("_", " ")}
                    {p.organization && ` · ${p.organization}`}
                    {" · "}
                    {p._count.memories} memories
                  </p>
                </div>
              </div>
              {p.description && (
                <p className="mt-3 text-sm text-[var(--ink-muted)]">
                  {p.description}
                </p>
              )}
              {p.memories.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
                  {p.memories.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/app/memories/${m.id}`}
                        className="text-sm text-[var(--accent)] hover:underline line-clamp-1"
                      >
                        {m.title || m.content.slice(0, 80)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
