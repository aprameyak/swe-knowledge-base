import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processMemory } from "@/lib/memories";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["answered", "skipped", "dont_remember"]),
  answer: z.string().max(4000).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = schema.parse(await req.json());

    const question = await prisma.reflectionQuestion.findFirst({
      where: { id, userId: user.id },
    });
    if (!question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.reflectionQuestion.update({
      where: { id },
      data: {
        status: body.status,
        answer:
          body.status === "answered" ? body.answer?.trim() || null : null,
      },
    });

    if (body.status === "answered" && body.answer?.trim()) {
      const memory = await prisma.memory.findUnique({
        where: { id: question.memoryId },
      });
      if (memory) {
        const appendix = `\n\n[Reflection] ${question.question}\n→ ${body.answer.trim()}`;
        await prisma.memory.update({
          where: { id: memory.id },
          data: { content: memory.content + appendix },
        });
        await processMemory(memory.id);
      }
    } else {
      const pending = await prisma.reflectionQuestion.count({
        where: { memoryId: question.memoryId, status: "pending" },
      });
      await prisma.memory.update({
        where: { id: question.memoryId },
        data: { status: pending === 0 ? "understood" : "reflecting" },
      });
    }

    const updated = await prisma.reflectionQuestion.findUnique({
      where: { id },
    });
    return NextResponse.json({ question: updated });
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
