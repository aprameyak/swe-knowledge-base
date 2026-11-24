import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { searchMemories } from "@/lib/memories";
import { USE_MODES, type UseModeId } from "@/lib/ai";
import {
  buildExportMarkdown,
  buildResumeBullet,
  buildStarDraft,
  type ExportMemory,
} from "@/lib/export";

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

function toExportMemory(
  r: Awaited<ReturnType<typeof searchMemories>>[number]
): ExportMemory {
  return {
    id: r.memory.id,
    title: r.memory.title,
    content: r.memory.content,
    project: r.memory.project,
    extractions: r.memory.extractions.map((e) => ({
      kind: e.kind,
      value: e.value,
      provenance: e.provenance,
    })),
    themes: r.memory.themeLinks.map((t) => t.theme.name),
  };
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "behavioral") as UseModeId;
    const focus = searchParams.get("q")?.trim();
    const jobDesc = searchParams.get("job")?.trim();
    const format = searchParams.get("format")?.trim();

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

    const modeMeta = USE_MODES.find((m) => m.id === mode)!;

    const flat = buckets.flatMap((b) =>
      b.results.map((r) => ({
        memory: toExportMemory(r),
        score: r.score,
      }))
    );

    if (format === "markdown") {
      const markdown = buildExportMarkdown(mode, flat);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="strand-${mode}.md"`,
        },
      });
    }

    const guidance =
      mode === "behavioral"
        ? "STAR drafts below are built only from your captured notes. Copy, then verify against the source memory."
        : mode === "resume"
          ? "Resume bullets prefer explicit metrics and actions from your notes. Copy after you verify each claim."
          : mode === "job"
            ? "Matches and drafts are grounded only in what you've captured. Gaps mean missing notes, not missing skill."
            : "Drafts are views over the same career knowledge — nothing invents new accomplishments.";

    return NextResponse.json({
      mode: modeMeta,
      guidance,
      exportMarkdown: buildExportMarkdown(mode, flat),
      buckets: buckets.map((b) => ({
        label: b.label,
        results: b.results.map((r) => {
          const memory = toExportMemory(r);
          const resume = buildResumeBullet(memory);
          const star = buildStarDraft(memory);
          return {
            score: Math.round(r.score * 100) / 100,
            memory: {
              id: memory.id,
              title: memory.title,
              content: memory.content,
              occurredAt: r.memory.occurredAt,
              project: memory.project,
              extractions: r.memory.extractions
                .filter((e) =>
                  [
                    "metric",
                    "action",
                    "outcome",
                    "decision",
                    "lesson",
                    "technology",
                    "skill",
                    "problem",
                    "challenge",
                  ].includes(e.kind)
                )
                .map((e) => ({
                  id: e.id,
                  kind: e.kind,
                  value: e.value,
                  provenance: e.provenance,
                })),
              themes: memory.themes,
            },
            drafts: {
              resumeBullet: resume.text,
              star: star.text,
              grounded: resume.grounded || star.grounded,
              explicitMetric: resume.explicitMetric,
            },
          };
        }),
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
