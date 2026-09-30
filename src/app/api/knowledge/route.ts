import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();

    const [
      memoryCount,
      projectCount,
      experienceCount,
      skills,
      themes,
      metrics,
      decisions,
      lessons,
      challenges,
      pendingReflections,
    ] = await Promise.all([
      prisma.memory.count({ where: { userId: user.id } }),
      prisma.project.count({ where: { userId: user.id } }),
      prisma.experience.count({ where: { userId: user.id } }),
      prisma.skill.findMany({
        where: { userId: user.id },
        include: { _count: { select: { evidence: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.behavioralTheme.findMany({
        where: { userId: user.id },
        include: {
          _count: { select: { evidence: true } },
          evidence: {
            take: 3,
            include: {
              memory: { select: { id: true, title: true, content: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.memoryExtraction.findMany({
        where: { memory: { userId: user.id }, kind: "metric" },
        include: { memory: { select: { id: true, title: true } } },
        take: 40,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memoryExtraction.findMany({
        where: { memory: { userId: user.id }, kind: "decision" },
        include: { memory: { select: { id: true, title: true } } },
        take: 40,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memoryExtraction.findMany({
        where: { memory: { userId: user.id }, kind: "lesson" },
        include: { memory: { select: { id: true, title: true } } },
        take: 40,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memoryExtraction.findMany({
        where: {
          memory: { userId: user.id },
          kind: { in: ["challenge", "problem"] },
        },
        include: { memory: { select: { id: true, title: true } } },
        take: 40,
        orderBy: { createdAt: "desc" },
      }),
      prisma.reflectionQuestion.count({
        where: { userId: user.id, status: "pending" },
      }),
    ]);

    const tech = skills.filter((s) => s.kind === "technology");
    const softSkills = skills.filter((s) => s.kind === "skill");

    const coverage = [
      {
        id: "metrics",
        label: "Measurable outcomes",
        count: metrics.length,
        hint: metrics.length
          ? "You have concrete numbers to point to."
          : "Capture outcomes with numbers when you remember them.",
      },
      {
        id: "decisions",
        label: "Technical decisions",
        count: decisions.length,
        hint: decisions.length
          ? "Tradeoffs and choices are recorded."
          : "Note why you chose an approach — future interviews love this.",
      },
      {
        id: "lessons",
        label: "Failures & lessons",
        count: lessons.length,
        hint: lessons.length
          ? "Growth stories are present."
          : "Even short notes about mistakes compound over time.",
      },
      {
        id: "themes",
        label: "Behavioral themes",
        count: themes.length,
        hint: themes.length
          ? "Possible themes inferred from your wording."
          : "Themes appear as you capture varied experiences.",
      },
      {
        id: "tech",
        label: "Technologies",
        count: tech.length,
        hint: tech.length
          ? "Technologies linked to source memories."
          : "Mention tools by name when capturing.",
      },
    ];

    return NextResponse.json({
      stats: {
        memories: memoryCount,
        projects: projectCount,
        experiences: experienceCount,
        pendingReflections,
      },
      skills: softSkills,
      technologies: tech,
      themes,
      metrics,
      decisions,
      lessons,
      challenges,
      coverage,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
