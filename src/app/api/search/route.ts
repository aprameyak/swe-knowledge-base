import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { searchMemories } from "@/lib/memories";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ results: [], query: "" });
    }
    const results = await searchMemories(user.id, q, 15);
    return NextResponse.json({
      query: q,
      results: results.map((r) => ({
        score: Math.round(r.score * 100) / 100,
        memory: {
          id: r.memory.id,
          title: r.memory.title,
          content: r.memory.content,
          occurredAt: r.memory.occurredAt,
          createdAt: r.memory.createdAt,
          project: r.memory.project,
          extractions: r.memory.extractions,
          themes: r.memory.themeLinks.map((t) => t.theme),
          skills: r.memory.skillLinks.map((s) => s.skill),
        },
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
