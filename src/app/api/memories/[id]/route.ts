import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processMemory } from "@/lib/memories";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const memory = await prisma.memory.findFirst({
      where: { id, userId: user.id },
      include: {
        extractions: true,
        project: true,
        reflections: { orderBy: { createdAt: "asc" } },
        themeLinks: { include: { theme: true } },
        skillLinks: { include: { skill: true } },
        connectionsFrom: {
          include: { toMemory: { select: { id: true, title: true, content: true } } },
        },
        connectionsTo: {
          include: { fromMemory: { select: { id: true, title: true, content: true } } },
        },
      },
    });
    if (!memory) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ memory });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const patchSchema = z.object({
  content: z.string().min(1).max(8000).optional(),
  projectId: z.string().nullable().optional(),
  occurredAt: z.string().datetime().nullable().optional(),
  title: z.string().max(200).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.memory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.memory.update({
      where: { id },
      data: {
        content: body.content?.trim(),
        projectId: body.projectId === null ? null : body.projectId,
        occurredAt:
          body.occurredAt === null
            ? null
            : body.occurredAt
              ? new Date(body.occurredAt)
              : undefined,
        title: body.title,
      },
    });

    if (body.content && body.content.trim() !== existing.content) {
      const processed = await processMemory(id);
      return NextResponse.json({ memory: processed });
    }

    const memory = await prisma.memory.findUnique({
      where: { id },
      include: {
        extractions: true,
        project: true,
        reflections: { orderBy: { createdAt: "asc" } },
        themeLinks: { include: { theme: true } },
        skillLinks: { include: { skill: true } },
      },
    });
    return NextResponse.json({ memory });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.memory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.memory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
