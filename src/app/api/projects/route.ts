import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { memories: true, experiences: true } },
      },
      orderBy: [{ startedAt: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ projects });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  kind: z
    .enum([
      "job",
      "internship",
      "research",
      "side_project",
      "hackathon",
      "organization",
      "other",
    ])
    .default("other"),
  organization: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: body.name.trim(),
        description: body.description?.trim(),
        kind: body.kind,
        organization: body.organization?.trim(),
        startedAt: new Date(),
      },
    });
    return NextResponse.json({ project }, { status: 201 });
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
