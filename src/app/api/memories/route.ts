import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processMemory } from "@/lib/memories";

const createSchema = z.object({
  content: z.string().min(1).max(8000),
  occurredAt: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 40), 100);
    const memories = await prisma.memory.findMany({
      where: { userId: user.id },
      include: {
        extractions: true,
        project: true,
        reflections: {
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
        },
        themeLinks: { include: { theme: true } },
        skillLinks: { include: { skill: true } },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return NextResponse.json({ memories });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load memories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    const memory = await prisma.memory.create({
      data: {
        userId: user.id,
        content: body.content.trim(),
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        projectId: body.projectId || undefined,
        status: "captured",
      },
    });

    const processed = await processMemory(memory.id);

    return NextResponse.json({ memory: processed }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
  }
}
