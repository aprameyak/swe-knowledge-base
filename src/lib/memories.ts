import { prisma } from "./db";
import {
  analyzeMemory,
  embedText,
  cosineSimilarity,
  type AnalysisResult,
} from "./ai";

export async function processMemory(memoryId: string) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: { user: true },
  });
  if (!memory) return null;

  const analysis = await analyzeMemory(memory.content);
  const embedding = await embedText(memory.content);

  await prisma.memoryExtraction.deleteMany({ where: { memoryId } });
  await prisma.reflectionQuestion.deleteMany({
    where: { memoryId, status: "pending" },
  });

  await prisma.memoryExtraction.createMany({
    data: [
      ...analysis.extractions.map((e) => ({
        memoryId,
        kind: e.kind,
        value: e.value,
        provenance: e.provenance,
        sourceSpan: e.sourceSpan,
        confidence: e.confidence,
      })),
      {
        memoryId,
        kind: "lesson",
        value:
          analysis.source === "openai"
            ? "Structured with OpenAI"
            : "Structured with local heuristics",
        provenance: "inferred",
        confidence: 1,
      },
    ],
  });

  if (analysis.reflections.length > 0) {
    await prisma.reflectionQuestion.createMany({
      data: analysis.reflections.map((r) => ({
        userId: memory.userId,
        memoryId,
        question: r.question,
        reason: r.reason,
        status: "pending",
      })),
    });
  }

  let projectId = memory.projectId;
  const projectName =
    analysis.projectHint ||
    analysis.extractions.find((e) => e.kind === "project")?.value;
  if (projectName && !projectId) {
    const existing = await prisma.project.findFirst({
      where: {
        userId: memory.userId,
        name: { equals: projectName },
      },
    });
    if (existing) {
      projectId = existing.id;
    } else {
      const explicit = analysis.extractions.find(
        (e) => e.kind === "project" && e.provenance === "explicit"
      );
      if (explicit) {
        const created = await prisma.project.create({
          data: {
            userId: memory.userId,
            name: explicit.value,
            kind: "other",
          },
        });
        projectId = created.id;
      }
    }
  }

  for (const e of analysis.extractions.filter(
    (x) => x.kind === "skill" || x.kind === "technology"
  )) {
    const kind = e.kind === "technology" ? "technology" : "skill";
    const skill = await prisma.skill.upsert({
      where: {
        userId_name_kind: {
          userId: memory.userId,
          name: e.value,
          kind,
        },
      },
      create: { userId: memory.userId, name: e.value, kind },
      update: {},
    });
    await prisma.skillEvidence.upsert({
      where: {
        skillId_memoryId: { skillId: skill.id, memoryId },
      },
      create: {
        skillId: skill.id,
        memoryId,
        provenance: e.provenance,
        sourceSpan: e.sourceSpan,
      },
      update: {
        provenance: e.provenance,
        sourceSpan: e.sourceSpan,
      },
    });
  }

  for (const theme of analysis.themes) {
    const t = await prisma.behavioralTheme.upsert({
      where: {
        userId_name: { userId: memory.userId, name: theme.name },
      },
      create: {
        userId: memory.userId,
        name: theme.name,
        description: theme.rationale,
      },
      update: {},
    });
    await prisma.themeEvidence.upsert({
      where: {
        themeId_memoryId: { themeId: t.id, memoryId },
      },
      create: {
        themeId: t.id,
        memoryId,
        provenance: "inferred",
        rationale: theme.rationale,
      },
      update: { rationale: theme.rationale },
    });
  }

  await upsertExperience(memory.userId, memoryId, projectId, analysis);

  await prisma.memory.update({
    where: { id: memoryId },
    data: {
      title: analysis.title,
      embedding: JSON.stringify(embedding),
      status: analysis.reflections.length > 0 ? "reflecting" : "understood",
      projectId: projectId ?? undefined,
    },
  });

  await connectRelatedMemories(memory.userId, memoryId, embedding);

  return prisma.memory.findUnique({
    where: { id: memoryId },
    include: {
      extractions: true,
      reflections: { orderBy: { createdAt: "asc" } },
      project: true,
      skillLinks: { include: { skill: true } },
      themeLinks: { include: { theme: true } },
    },
  });
}

async function upsertExperience(
  userId: string,
  memoryId: string,
  projectId: string | null | undefined,
  analysis: AnalysisResult
) {
  const existingLink = await prisma.experienceMemory.findFirst({
    where: { memoryId },
  });
  if (existingLink) {
    await prisma.experience.update({
      where: { id: existingLink.experienceId },
      data: {
        title: analysis.title,
        summary: buildGroundedSummary(analysis),
        projectId: projectId ?? undefined,
      },
    });
    return;
  }

  const exp = await prisma.experience.create({
    data: {
      userId,
      projectId: projectId ?? undefined,
      title: analysis.title,
      summary: buildGroundedSummary(analysis),
      occurredAt: new Date(),
    },
  });
  await prisma.experienceMemory.create({
    data: { experienceId: exp.id, memoryId },
  });
}

function buildGroundedSummary(analysis: AnalysisResult): string {
  const parts: string[] = [];
  const action = analysis.extractions.find((e) => e.kind === "action");
  const outcome = analysis.extractions.find((e) => e.kind === "outcome");
  const metric = analysis.extractions.find((e) => e.kind === "metric");
  if (action) parts.push(action.value);
  if (outcome && outcome.value !== action?.value) parts.push(outcome.value);
  if (metric) parts.push(`Metric noted: ${metric.value}`);
  const note =
    " (Derived from your memory — not independently verified.)";
  return (parts.join(" ") || analysis.title) + note;
}

async function connectRelatedMemories(
  userId: string,
  memoryId: string,
  embedding: number[]
) {
  const others = await prisma.memory.findMany({
    where: { userId, id: { not: memoryId }, embedding: { not: null } },
    select: { id: true, embedding: true, content: true, title: true },
    take: 100,
  });

  const scored = others
    .map((o) => {
      const emb = o.embedding ? (JSON.parse(o.embedding) as number[]) : [];
      return { id: o.id, score: cosineSimilarity(embedding, emb), title: o.title };
    })
    .filter((s) => s.score > 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  for (const s of scored) {
    const [a, b] = memoryId < s.id ? [memoryId, s.id] : [s.id, memoryId];
    await prisma.memoryConnection.upsert({
      where: {
        fromMemoryId_toMemoryId: { fromMemoryId: a, toMemoryId: b },
      },
      create: {
        userId,
        fromMemoryId: a,
        toMemoryId: b,
        reason: " overlapping themes, skills, or language",
        strength: s.score,
        provenance: "inferred",
      },
      update: { strength: s.score },
    });
  }
}

export async function searchMemories(
  userId: string,
  query: string,
  limit = 12
) {
  const qEmbed = await embedText(query);
  const memories = await prisma.memory.findMany({
    where: { userId },
    include: {
      extractions: true,
      project: true,
      themeLinks: { include: { theme: true } },
      skillLinks: { include: { skill: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const scored = memories.map((m) => {
    let score = 0;
    if (m.embedding) {
      score += cosineSimilarity(qEmbed, JSON.parse(m.embedding) as number[]) * 2;
    }
    const hay = (
      m.content +
      " " +
      (m.title || "") +
      " " +
      m.extractions.map((e) => e.value).join(" ") +
      " " +
      m.themeLinks.map((t) => t.theme.name).join(" ") +
      " " +
      m.skillLinks.map((s) => s.skill.name).join(" ")
    ).toLowerCase();

    for (const kw of keywords) {
      if (hay.includes(kw)) score += 0.35;
    }

    if (/leader|led|mentor/i.test(query)) {
      if (m.themeLinks.some((t) => /leadership/i.test(t.theme.name))) score += 0.5;
    }
    if (/own|ownership/i.test(query)) {
      if (m.themeLinks.some((t) => /ownership/i.test(t.theme.name))) score += 0.5;
    }
    if (/fail|lesson|mistake/i.test(query)) {
      if (
        m.extractions.some((e) => e.kind === "lesson") ||
        m.themeLinks.some((t) => /failure/i.test(t.theme.name))
      )
        score += 0.5;
    }
    if (/metric|impact|measur/i.test(query)) {
      if (m.extractions.some((e) => e.kind === "metric")) score += 0.5;
    }
    if (/ambiguit/i.test(query)) {
      if (m.themeLinks.some((t) => /ambiguit/i.test(t.theme.name))) score += 0.5;
    }
    if (/database|sql|postgres|query/i.test(query)) {
      if (
        m.skillLinks.some((s) =>
          /database|sql|postgres/i.test(s.skill.name)
        ) ||
        /postgres|sql|query|database/i.test(m.content)
      )
        score += 0.45;
    }

    return { memory: m, score };
  });

  return scored
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "been",
  "what",
  "when",
  "where",
  "who",
  "how",
  "that",
  "this",
  "with",
  "from",
  "they",
  "them",
  "their",
  "about",
  "into",
  "than",
  "then",
  "some",
  "would",
  "could",
  "should",
  "which",
  "while",
  "i've",
  "i'm",
  "my",
]);
