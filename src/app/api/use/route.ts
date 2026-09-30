import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { searchMemories } from "@/lib/memories";
import { USE_MODES, type UseModeId } from "@/lib/ai";
import { prisma } from "@/lib/db";

const MODE_QUERIES: Record<UseModeId, string[]> = {
  behavioral: [
    "leadership mentorship led team",
    "ownership drove owned responsibility",
    "ambiguity unclear figured out",
    "conflict disagreement pushback",
    "failure lesson learned mistake",
  ],
  resume: [
    "measurable impact metric reduced improved",
    "technical decision architecture",
    "shipped launched built implemented",
  ],
  performance: [
    "impact outcome improved reduced",
    "collaboration mentorship team",
    "ownership drove project",
  ],
  portfolio: [
    "project built designed shipped",
    "technical decision tradeoff",
    "hackathon prototype",
  ],
  job: ["skills technologies projects impact"],
  reflection: [
    "lesson learned",
    "challenge problem difficult",
    "growth mentorship",
  ],
};

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "behavioral") as UseModeId;
    const focus = searchParams.get("q")?.trim();
    const jobDesc = searchParams.get("job")?.trim();

    if (!USE_MODES.some((m) => m.id === mode)) {
      return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const queries =
      mode === "job" && jobDesc
        ? [jobDesc]
        : focus
          ? [focus]
          : MODE_QUERIES[mode];

    const buckets: {
      label: string;
      results: Awaited<ReturnType<typeof searchMemories>>;
    }[] = [];

    for (const q of queries) {
      const results = await searchMemories(user.id, q, 6);
      buckets.push({
        label: focus || jobDesc ? "Matched experiences" : q,
        results,
      });
    }

    const seen = new Set<string>();
    const topEvidence = [];
    for (const b of buckets) {
      for (const r of b.results) {
        if (seen.has(r.memory.id)) continue;
        seen.add(r.memory.id);
        topEvidence.push(r);
      }
    }
    topEvidence.sort((a, b) => b.score - a.score);

    const modeMeta = USE_MODES.find((m) => m.id === mode)!;

    const guidance =
      mode === "behavioral"
        ? "These are your real experiences. Use them to remember details — don't invent STAR polish until you've confirmed the facts."
        : mode === "resume"
          ? "Evidence first: metrics, technologies, and outcomes from your memories. Polished bullets should wait until you've verified each claim."
          : mode === "job"
            ? "Matches are grounded only in what you've captured. Gaps mean you haven't recorded evidence yet — not that you lack the skill."
            : "A view over the same career knowledge — nothing here invents new accomplishments.";

    const pending = await prisma.reflectionQuestion.count({
      where: { userId: user.id, status: "pending" },
    });

    return NextResponse.json({
      mode: modeMeta,
      guidance,
      pendingReflections: pending,
      buckets: buckets.map((b) => ({
        label: b.label,
        results: b.results.map((r) => ({
          score: Math.round(r.score * 100) / 100,
          memory: {
            id: r.memory.id,
            title: r.memory.title,
            content: r.memory.content,
            occurredAt: r.memory.occurredAt,
            project: r.memory.project,
            extractions: r.memory.extractions.filter((e) =>
              ["metric", "action", "outcome", "decision", "lesson"].includes(
                e.kind
              )
            ),
            themes: r.memory.themeLinks.map((t) => t.theme.name),
            provenanceNote:
              "All details below come from your original memory or clearly marked inferences.",
          },
        })),
      })),
      topEvidence: topEvidence.slice(0, 10).map((r) => ({
        id: r.memory.id,
        title: r.memory.title,
        score: Math.round(r.score * 100) / 100,
        snippet: r.memory.content.slice(0, 200),
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
