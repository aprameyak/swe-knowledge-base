export type ExtractionKind =
  | "project"
  | "experience"
  | "problem"
  | "action"
  | "decision"
  | "outcome"
  | "metric"
  | "technology"
  | "skill"
  | "collaboration"
  | "lesson"
  | "challenge"
  | "theme";

export type Extraction = {
  kind: ExtractionKind;
  value: string;
  provenance: "explicit" | "inferred";
  sourceSpan?: string;
  confidence: number;
};

export type ReflectionPrompt = {
  question: string;
  reason: string;
};

export type AnalysisResult = {
  title: string;
  extractions: Extraction[];
  reflections: ReflectionPrompt[];
  themes: { name: string; rationale: string }[];
  projectHint?: string;
  source: "openai" | "heuristic";
};

const TECHNOLOGY_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /\bpostgres(ql)?\b/i, name: "PostgreSQL" },
  { pattern: /\bredis\b/i, name: "Redis" },
  { pattern: /\bkafka\b/i, name: "Kafka" },
  { pattern: /\breact\b/i, name: "React" },
  { pattern: /\bnext\.?js\b/i, name: "Next.js" },
  { pattern: /\btypescript\b/i, name: "TypeScript" },
  { pattern: /\bpython\b/i, name: "Python" },
  { pattern: /\bgo(lang)?\b/i, name: "Go" },
  { pattern: /\bkubernetes\b|\bk8s\b/i, name: "Kubernetes" },
  { pattern: /\bdocker\b/i, name: "Docker" },
  { pattern: /\baws\b/i, name: "AWS" },
  { pattern: /\bgcp\b|\bgoogle cloud\b/i, name: "GCP" },
  { pattern: /\bsql\b/i, name: "SQL" },
  { pattern: /\bgraphql\b/i, name: "GraphQL" },
  { pattern: /\bnode\.?js\b/i, name: "Node.js" },
  { pattern: /\bpytorch\b/i, name: "PyTorch" },
  { pattern: /\btensorflow\b/i, name: "TensorFlow" },
  { pattern: /\bspark\b/i, name: "Apache Spark" },
  { pattern: /\belasticsearch\b/i, name: "Elasticsearch" },
  { pattern: /\bmongo(db)?\b/i, name: "MongoDB" },
  { pattern: /\bterraform\b/i, name: "Terraform" },
  { pattern: /\bci\/?cd\b/i, name: "CI/CD" },
];

const THEME_HINTS: { pattern: RegExp; name: string; rationale: string }[] = [
  {
    pattern: /\bled\b|\bleadership\b|\bmentored\b|\bcoordinated\b/i,
    name: "Leadership",
    rationale: "Language suggests guiding or coordinating others",
  },
  {
    pattern: /\bown(ed|ership)\b|\btook responsibility\b|\bdrove\b/i,
    name: "Ownership",
    rationale: "Language suggests personal ownership of an outcome",
  },
  {
    pattern: /\bambigu(ous|ity)\b|\bunclear\b|\bno clear\b|\bfigured out\b/i,
    name: "Ambiguity",
    rationale: "Situation involved unclear requirements or direction",
  },
  {
    pattern: /\bfail(ed|ure)\b|\bbroke\b|\boutage\b|\bmistake\b|\blesson\b/i,
    name: "Learning from failure",
    rationale: "Mentions failure, incident, or lesson learned",
  },
  {
    pattern: /\bcollaborat|\bwith the team\b|\bpaired\b|\bcross-?functional\b/i,
    name: "Collaboration",
    rationale: "Mentions working with others",
  },
  {
    pattern: /\bperformance\b|\boptimi[sz]|\bslow\b|\blatency\b|\bscale\b/i,
    name: "Technical problem-solving",
    rationale: "Mentions performance, optimization, or scale challenges",
  },
  {
    pattern: /\bconflict\b|\bdisagree|\bpushback\b|\bpersuad/i,
    name: "Influence & conflict",
    rationale: "Mentions disagreement or persuasion",
  },
];

function extractMetrics(content: string): Extraction[] {
  const results: Extraction[] = [];
  const fromTo =
    /from\s+(?:around\s+)?(\d+(?:\.\d+)?)\s*(seconds?|ms|s|minutes?)?\s+to\s+(?:around\s+)?(\d+(?:\.\d+)?)\s*(seconds?|ms|s|minutes?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = fromTo.exec(content)) !== null) {
    const unit = m[2] || m[4] || "";
    const value = `${m[1]}${unit ? " " + unit : ""} → ${m[3]}${m[4] ? " " + m[4] : unit ? " " + unit : ""}`;
    results.push({
      kind: "metric",
      value: value.trim(),
      provenance: "explicit",
      sourceSpan: m[0],
      confidence: 0.95,
    });
  }
  const percent = /(\d+(?:\.\d+)?)\s*%/g;
  while ((m = percent.exec(content)) !== null) {
    if (results.some((r) => r.sourceSpan === m![0])) continue;
    results.push({
      kind: "metric",
      value: m[0],
      provenance: "explicit",
      sourceSpan: m[0],
      confidence: 0.9,
    });
  }
  return results;
}

function extractTechnologies(content: string): Extraction[] {
  const found = new Map<string, Extraction>();
  for (const { pattern, name } of TECHNOLOGY_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      found.set(name, {
        kind: "technology",
        value: name,
        provenance: "explicit",
        sourceSpan: match[0],
        confidence: 0.92,
      });
    }
  }
  return [...found.values()];
}

function heuristicAnalyze(content: string): AnalysisResult {
  const extractions: Extraction[] = [];

  extractions.push(...extractTechnologies(content));
  extractions.push(...extractMetrics(content));

  const actionVerbs =
    /\b(fixed|built|designed|implemented|migrated|refactored|debugged|shipped|launched|reduced|improved|moved|rewrote|investigated|led|mentored|automated|deployed)\b/i;
  const actionMatch = content.match(actionVerbs);
  if (actionMatch) {
    const sentence =
      content
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .find((s) => actionVerbs.test(s)) || content.slice(0, 160);
    extractions.push({
      kind: "action",
      value: sentence,
      provenance: "explicit",
      sourceSpan: sentence.slice(0, 120),
      confidence: 0.8,
    });
  }

  if (
    /\b(slow|bug|issue|problem|outage|incident|bottleneck|fail|broken|hard|difficult|challenge)\b/i.test(
      content
    )
  ) {
    const sentence =
      content
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .find((s) =>
          /\b(slow|bug|issue|problem|outage|incident|bottleneck|fail|broken|hard|difficult|challenge)\b/i.test(
            s
          )
        ) || content.slice(0, 160);
    extractions.push({
      kind: "problem",
      value: sentence,
      provenance: "explicit",
      sourceSpan: sentence.slice(0, 120),
      confidence: 0.75,
    });
  }

  if (
    /\b(went from|reduced|improved|resulted|ended up|now|after|finally)\b/i.test(
      content
    ) ||
    extractions.some((e) => e.kind === "metric")
  ) {
    const outcomeSentence =
      content
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .find(
          (s) =>
            /\b(went from|reduced|improved|resulted|ended up|from .+ to )\b/i.test(
              s
            ) || /\d/.test(s)
        );
    if (outcomeSentence) {
      extractions.push({
        kind: "outcome",
        value: outcomeSentence,
        provenance: "explicit",
        sourceSpan: outcomeSentence.slice(0, 120),
        confidence: 0.78,
      });
    }
  }

  if (
    /\b(decided|chose|chose to|instead of|tradeoff|trade-off|opted|moved .+ into)\b/i.test(
      content
    )
  ) {
    const sentence =
      content
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .find((s) =>
          /\b(decided|chose|instead of|tradeoff|trade-off|opted|moved)\b/i.test(
            s
          )
        );
    if (sentence) {
      extractions.push({
        kind: "decision",
        value: sentence,
        provenance: "explicit",
        sourceSpan: sentence.slice(0, 120),
        confidence: 0.8,
      });
    }
  }

  if (/\b(learned|lesson|realized|next time|won't|should have)\b/i.test(content)) {
    const sentence =
      content
        .split(/[.!?\n]/)
        .map((s) => s.trim())
        .find((s) =>
          /\b(learned|lesson|realized|next time|won't|should have)\b/i.test(s)
        );
    if (sentence) {
      extractions.push({
        kind: "lesson",
        value: sentence,
        provenance: "explicit",
        sourceSpan: sentence.slice(0, 120),
        confidence: 0.85,
      });
    }
  }

  if (/\b(query|sql|aggregation|database|index)\b/i.test(content)) {
    extractions.push({
      kind: "skill",
      value: "Database performance",
      provenance: "inferred",
      confidence: 0.65,
    });
  }
  if (/\b(api|endpoint|backend|service)\b/i.test(content)) {
    extractions.push({
      kind: "skill",
      value: "Backend engineering",
      provenance: "inferred",
      confidence: 0.6,
    });
  }
  if (/\b(frontend|ui|dashboard|react)\b/i.test(content)) {
    extractions.push({
      kind: "skill",
      value: "Frontend engineering",
      provenance: "inferred",
      confidence: 0.6,
    });
  }

  const themes = THEME_HINTS.filter((t) => t.pattern.test(content)).map(
    (t) => ({
      name: t.name,
      rationale: t.rationale,
    })
  );

  for (const t of themes) {
    extractions.push({
      kind: "theme",
      value: t.name,
      provenance: "inferred",
      confidence: 0.55,
    });
  }

  const onProject = content.match(/\bon\s+(?:the\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})/);
  const projectHint = onProject?.[1];

  const reflections = buildReflections(content, extractions);

  const title = buildTitle(content, extractions);

  return { title, extractions, reflections, themes, projectHint, source: "heuristic" };
}

function buildTitle(content: string, extractions: Extraction[]): string {
  const action = extractions.find((e) => e.kind === "action");
  if (action) {
    const t = action.value.replace(/\s+/g, " ").trim();
    return t.length > 72 ? t.slice(0, 69) + "…" : t;
  }
  const first = content.split(/[\n.]/)[0]?.trim() || content;
  return first.length > 72 ? first.slice(0, 69) + "…" : first;
}

function buildReflections(
  content: string,
  extractions: Extraction[]
): ReflectionPrompt[] {
  const prompts: ReflectionPrompt[] = [];
  const has = (kind: ExtractionKind) =>
    extractions.some((e) => e.kind === kind);

  if (has("action") && !has("outcome") && !has("metric")) {
    prompts.push({
      question:
        "What changed as a result of this work — for users, the system, or the team?",
      reason: "You described an action but no clear outcome or metric yet.",
    });
  }

  if ((has("problem") || has("action")) && !has("decision")) {
    prompts.push({
      question:
        "Were there alternatives you considered, and why did you choose this approach?",
      reason: "Capturing the decision and tradeoffs makes this more useful later.",
    });
  }

  if (has("outcome") || has("metric")) {
    if (!/\b(i |my |me )\b/i.test(content) && !/\b(led|owned|drove)\b/i.test(content)) {
      prompts.push({
        question:
          "What was specifically yours to own here versus what the team handled?",
        reason: "Personal ownership isn't clear yet from the wording.",
      });
    }
  }

  if (has("problem") && !has("lesson")) {
    prompts.push({
      question: "Is there anything you'd do differently next time?",
      reason: "A short reflection often becomes the most useful interview detail.",
    });
  }

  if (!has("metric") && has("outcome")) {
    prompts.push({
      question:
        "Do you remember any numbers that would make this outcome more concrete?",
      reason: "You noted an outcome but no measurable detail yet.",
    });
  }

  if (prompts.length === 0 && content.length < 120) {
    prompts.push({
      question: "Anything else worth remembering about this — context, who was involved, or what made it hard?",
      reason: "Short captures are great; a little more context helps future you.",
    });
  }

  return prompts.slice(0, 3);
}

async function openaiAnalyze(content: string): Promise<AnalysisResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: key });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You help users remember their real professional experiences. Extract structured information from a career memory.

Rules:
- Never invent metrics, technologies, responsibilities, or outcomes not present in the text.
- Mark provenance as "explicit" when taken from the user's words, "inferred" only for careful labels (skills/themes).
- Prefer asking useful reflection questions over generating polished content.
- Return JSON: { title, extractions: [{kind, value, provenance, sourceSpan?, confidence}], reflections: [{question, reason}], themes: [{name, rationale}], projectHint? }
- kinds: project, experience, problem, action, decision, outcome, metric, technology, skill, collaboration, lesson, challenge, theme
- Max 3 reflections. Skip questions if the memory is already rich.`,
        },
        { role: "user", content },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisResult;
    if (!Array.isArray(parsed.extractions)) return null;
    return {
      title: parsed.title || buildTitle(content, parsed.extractions),
      extractions: parsed.extractions,
      reflections: (parsed.reflections || []).slice(0, 3),
      themes: parsed.themes || [],
      projectHint: parsed.projectHint,
      source: "openai",
    };
  } catch {
    return null;
  }
}

export async function analyzeMemory(content: string): Promise<AnalysisResult> {
  const ai = await openaiAnalyze(content);
  if (ai) return { ...ai, source: "openai" };
  return heuristicAnalyze(content);
}

function localEmbed(text: string): number[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const dims = 64;
  const vec = new Array(dims).fill(0);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dims;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: key });
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      });
      return res.data[0].embedding;
    } catch {
    }
  }
  return localEmbed(text);
}

export const USE_MODES = [
  {
    id: "behavioral",
    title: "Behavioral interview",
    description:
      "Find real experiences that demonstrate leadership, ownership, conflict, ambiguity, and more.",
  },
  {
    id: "resume",
    title: "Resume & accomplishments",
    description:
      "Surface evidence, metrics, and technologies before polishing any language.",
  },
  {
    id: "performance",
    title: "Performance review",
    description:
      "Gather impact, growth, and collaboration examples for a review cycle.",
  },
  {
    id: "portfolio",
    title: "Portfolio & profile",
    description:
      "Pull project narratives and decision highlights for portfolios or LinkedIn.",
  },
  {
    id: "job",
    title: "Job-specific recall",
    description:
      "Match your history to a role description using your stored experiences only.",
  },
  {
    id: "reflection",
    title: "Career reflection",
    description:
      "See patterns across projects, skills, challenges, and lessons over time.",
  },
] as const;

export type UseModeId = (typeof USE_MODES)[number]["id"];
