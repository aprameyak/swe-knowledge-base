import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { analyzeMemory, embedText } from "../src/lib/ai";

const prisma = new PrismaClient();

const DEMO_MEMORIES: {
  content: string;
  occurredAt: string;
  projectName?: string;
}[] = [
  {
    content:
      "finally fixed the slow dashboard query today, moved aggregation into postgres and it went from around 8 seconds to 2. product team was blocked on this for the weekly ops review.",
    occurredAt: "2025-11-12",
    projectName: "Ops Dashboard",
  },
  {
    content:
      "Led the migration of our notification service from a monolithic cron job to an event-driven pipeline with Kafka. Took about 6 weeks. Reduced duplicate sends by ~90% and made retries actually reliable. Hardest part was getting buy-in from the mobile team who were nervous about changing the contract.",
    occurredAt: "2025-06-20",
    projectName: "Notifications Platform",
  },
  {
    content:
      "Failed a production deploy on Friday afternoon. Bad migration locked the users table for 4 minutes. Learned I need a rollback checklist and never ship schema changes without a dry-run on a restored prod snapshot. Wrote the runbook the next Monday.",
    occurredAt: "2025-03-08",
    projectName: "Identity Service",
  },
  {
    content:
      "Mentored two interns through their first on-call week. Pair-reviewed their incident notes and helped them write a postmortem for a cache stampede. They both said the structured writeup helped more than the debugging itself.",
    occurredAt: "2025-08-15",
    projectName: "Platform Team",
  },
  {
    content:
      "Ambiguous product request: 'make search feel smarter.' I interviewed 5 power users, wrote a one-pager with three options (ranking tweak vs embeddings vs filters), and we shipped synonym expansion first. Click-through on search results improved ~18% over 3 weeks.",
    occurredAt: "2025-09-02",
    projectName: "Search Experience",
  },
  {
    content:
      "Owned the API rate-limiting redesign after we got hammered during a launch. Designed token-bucket limits per tenant in Redis, documented the tradeoffs vs sliding window, and coordinated with customer success on communication. Abuse tickets dropped sharply the following month.",
    occurredAt: "2025-04-18",
    projectName: "API Gateway",
  },
  {
    content:
      "Disagreed with engineering manager about rewriting the billing module in Go. I pushed back with a benchmark showing Node was fine for our QPS and the rewrite risk was higher than the gain. We invested in better observability instead. Glad we didn't rewrite.",
    occurredAt: "2024-11-05",
    projectName: "Billing",
  },
  {
    content:
      "Built a TypeScript CLI for developers to scaffold internal services with our logging, auth, and CI templates. Adoption hit 12 teams in two months. Cut new-service setup from ~2 days to under an hour.",
    occurredAt: "2025-01-22",
    projectName: "Developer Experience",
  },
  {
    content:
      "Hackathon: prototyped a React + Python tool that turns meeting transcripts into action items with owners. Won runners-up. Later used the idea in a real sprint planning experiment with my team.",
    occurredAt: "2024-09-14",
    projectName: "Action Item Extractor",
  },
  {
    content:
      "Debugged a subtle race condition in our Go worker pool that only showed up under high load. Added a regression test and a metric for queue wait time. Incident MTTR for similar issues dropped because we could see the wait spike immediately.",
    occurredAt: "2025-02-27",
    projectName: "Worker Fleet",
  },
  {
    content:
      "Internship reflection from earlier: during my first internship I shipped a GraphQL endpoint for the mobile app's profile screen. Reviewer feedback taught me to think about nullability and backwards compatibility much earlier.",
    occurredAt: "2023-08-01",
    projectName: "Mobile Profile API",
  },
  {
    content:
      "Presented quarterly impact to leadership: highlighted the dashboard latency work, notification migration, and DX CLI. Framed each with problem → action → evidence. Got strong feedback on clarity; need to get better at stating personal role vs team role.",
    occurredAt: "2025-12-10",
    projectName: "Platform Team",
  },
];

const PROJECTS = [
  {
    name: "Ops Dashboard",
    kind: "job",
    organization: "Northwind Labs",
    description: "Internal analytics dashboard for weekly operations reviews.",
    startedAt: "2025-09-01",
  },
  {
    name: "Notifications Platform",
    kind: "job",
    organization: "Northwind Labs",
    description: "Event-driven notification delivery across email, push, and SMS.",
    startedAt: "2025-04-01",
    endedAt: "2025-07-01",
  },
  {
    name: "Identity Service",
    kind: "job",
    organization: "Northwind Labs",
    description: "Authentication and user identity for core products.",
    startedAt: "2024-06-01",
  },
  {
    name: "Platform Team",
    kind: "job",
    organization: "Northwind Labs",
    description: "Shared platform, on-call, and developer productivity.",
    startedAt: "2024-03-01",
  },
  {
    name: "Search Experience",
    kind: "job",
    organization: "Northwind Labs",
    description: "Product search ranking and relevance.",
    startedAt: "2025-07-01",
  },
  {
    name: "API Gateway",
    kind: "job",
    organization: "Northwind Labs",
    description: "Edge API gateway, auth, and rate limiting.",
    startedAt: "2025-02-01",
  },
  {
    name: "Billing",
    kind: "job",
    organization: "Northwind Labs",
    description: "Subscription billing and invoicing systems.",
    startedAt: "2024-08-01",
  },
  {
    name: "Developer Experience",
    kind: "job",
    organization: "Northwind Labs",
    description: "Internal tooling for service scaffolding and CI.",
    startedAt: "2024-12-01",
  },
  {
    name: "Action Item Extractor",
    kind: "hackathon",
    organization: "Company Hackathon",
    description: "Hackathon prototype for meeting action extraction.",
    startedAt: "2024-09-12",
    endedAt: "2024-09-14",
  },
  {
    name: "Worker Fleet",
    kind: "job",
    organization: "Northwind Labs",
    description: "Background job processing infrastructure.",
    startedAt: "2024-10-01",
  },
  {
    name: "Mobile Profile API",
    kind: "internship",
    organization: "Previous Co",
    description: "GraphQL profile APIs for mobile clients.",
    startedAt: "2023-06-01",
    endedAt: "2023-08-31",
  },
];

async function processSeedMemory(
  userId: string,
  content: string,
  occurredAt: Date,
  projectId?: string
) {
  const analysis = await analyzeMemory(content);
  const embedding = await embedText(content);

  const memory = await prisma.memory.create({
    data: {
      userId,
      content,
      occurredAt,
      projectId,
      title: analysis.title,
      embedding: JSON.stringify(embedding),
      status: analysis.reflections.length > 0 ? "reflecting" : "understood",
    },
  });

  await prisma.memoryExtraction.createMany({
    data: analysis.extractions.map((e) => ({
      memoryId: memory.id,
      kind: e.kind,
      value: e.value,
      provenance: e.provenance,
      sourceSpan: e.sourceSpan,
      confidence: e.confidence,
    })),
  });

  if (analysis.reflections.length > 0) {
    await prisma.reflectionQuestion.createMany({
      data: analysis.reflections.map((r) => ({
        userId,
        memoryId: memory.id,
        question: r.question,
        reason: r.reason,
        status: "pending",
      })),
    });
  }

  for (const e of analysis.extractions.filter(
    (x) => x.kind === "skill" || x.kind === "technology"
  )) {
    const kind = e.kind === "technology" ? "technology" : "skill";
    const skill = await prisma.skill.upsert({
      where: {
        userId_name_kind: { userId, name: e.value, kind },
      },
      create: { userId, name: e.value, kind },
      update: {},
    });
    await prisma.skillEvidence.upsert({
      where: { skillId_memoryId: { skillId: skill.id, memoryId: memory.id } },
      create: {
        skillId: skill.id,
        memoryId: memory.id,
        provenance: e.provenance,
        sourceSpan: e.sourceSpan,
      },
      update: {},
    });
  }

  for (const theme of analysis.themes) {
    const t = await prisma.behavioralTheme.upsert({
      where: { userId_name: { userId, name: theme.name } },
      create: {
        userId,
        name: theme.name,
        description: theme.rationale,
      },
      update: {},
    });
    await prisma.themeEvidence.upsert({
      where: { themeId_memoryId: { themeId: t.id, memoryId: memory.id } },
      create: {
        themeId: t.id,
        memoryId: memory.id,
        provenance: "inferred",
        rationale: theme.rationale,
      },
      update: {},
    });
  }

  const exp = await prisma.experience.create({
    data: {
      userId,
      projectId,
      title: analysis.title,
      summary:
        [
          analysis.extractions.find((e) => e.kind === "action")?.value,
          analysis.extractions.find((e) => e.kind === "outcome")?.value,
          analysis.extractions.find((e) => e.kind === "metric")
            ? `Metric: ${analysis.extractions.find((e) => e.kind === "metric")!.value}`
            : null,
        ]
          .filter(Boolean)
          .join(" ") + " (Derived from your memory — not independently verified.)",
      occurredAt,
    },
  });
  await prisma.experienceMemory.create({
    data: { experienceId: exp.id, memoryId: memory.id },
  });

  return memory;
}

async function connectAll(userId: string) {
  const memories = await prisma.memory.findMany({
    where: { userId, embedding: { not: null } },
  });
  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const a = JSON.parse(memories[i].embedding!) as number[];
      const b = JSON.parse(memories[j].embedding!) as number[];
      let dot = 0;
      for (let k = 0; k < Math.min(a.length, b.length); k++) dot += a[k] * b[k];
      if (dot > 0.55) {
        await prisma.memoryConnection.upsert({
          where: {
            fromMemoryId_toMemoryId: {
              fromMemoryId: memories[i].id,
              toMemoryId: memories[j].id,
            },
          },
          create: {
            userId,
            fromMemoryId: memories[i].id,
            toMemoryId: memories[j].id,
            reason: "Related themes, skills, or language",
            strength: dot,
            provenance: "inferred",
          },
          update: { strength: dot },
        });
      }
    }
  }
}

async function main() {
  console.log("Seeding Strand…");

  await prisma.memoryConnection.deleteMany();
  await prisma.themeEvidence.deleteMany();
  await prisma.skillEvidence.deleteMany();
  await prisma.experienceMemory.deleteMany();
  await prisma.reflectionQuestion.deleteMany();
  await prisma.memoryExtraction.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.behavioralTheme.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(
    process.env.DEMO_PASSWORD || "demo1234",
    10
  );

  const user = await prisma.user.create({
    data: {
      email: process.env.DEMO_EMAIL || "demo@strand.app",
      name: "Alex Chen",
      passwordHash,
    },
  });

  const projectMap = new Map<string, string>();
  for (const p of PROJECTS) {
    const created = await prisma.project.create({
      data: {
        userId: user.id,
        name: p.name,
        kind: p.kind,
        organization: p.organization,
        description: p.description,
        startedAt: p.startedAt ? new Date(p.startedAt) : undefined,
        endedAt: p.endedAt ? new Date(p.endedAt) : undefined,
      },
    });
    projectMap.set(p.name, created.id);
  }

  for (const m of DEMO_MEMORIES) {
    await processSeedMemory(
      user.id,
      m.content,
      new Date(m.occurredAt),
      m.projectName ? projectMap.get(m.projectName) : undefined
    );
  }

  await connectAll(user.id);

  const counts = {
    memories: await prisma.memory.count({ where: { userId: user.id } }),
    projects: await prisma.project.count({ where: { userId: user.id } }),
    skills: await prisma.skill.count({ where: { userId: user.id } }),
    themes: await prisma.behavioralTheme.count({ where: { userId: user.id } }),
  };

  console.log("Seeded demo user:", user.email);
  console.log("Password:", process.env.DEMO_PASSWORD || "demo1234");
  console.log(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
