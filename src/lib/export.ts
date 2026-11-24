export type ExportExtraction = {
  kind: string;
  value: string;
  provenance: string;
};

export type ExportMemory = {
  id: string;
  title: string | null;
  content: string;
  project: { name: string } | null;
  extractions: ExportExtraction[];
  themes: string[];
};

function pick(
  extractions: ExportExtraction[],
  kinds: string[],
  preferExplicit = true
): ExportExtraction | undefined {
  const pool = extractions.filter((e) => kinds.includes(e.kind));
  if (!pool.length) return undefined;
  if (preferExplicit) {
    const explicit = pool.find((e) => e.provenance === "explicit");
    if (explicit) return explicit;
  }
  return pool[0];
}

function firstSentence(text: string, max = 180): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const cut = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  if (cut.length <= max) return cut;
  return cut.slice(0, max - 1).trimEnd() + "…";
}

export function buildResumeBullet(memory: ExportMemory): {
  text: string;
  grounded: boolean;
  explicitMetric: boolean;
} {
  const action = pick(memory.extractions, ["action", "decision", "outcome"]);
  const outcome = pick(memory.extractions, ["outcome", "action"]);
  const metric = pick(memory.extractions, ["metric"]);
  const tech = memory.extractions
    .filter((e) => e.kind === "technology" || e.kind === "skill")
    .slice(0, 3)
    .map((e) => e.value);

  const parts: string[] = [];
  if (action) parts.push(action.value.replace(/\.$/, ""));
  if (
    outcome &&
    outcome.value.toLowerCase() !== action?.value.toLowerCase()
  ) {
    parts.push(outcome.value.replace(/\.$/, ""));
  }
  if (metric) parts.push(`(${metric.value})`);
  if (tech.length) parts.push(`Tech: ${tech.join(", ")}`);

  if (!parts.length) {
    return {
      text: firstSentence(memory.content),
      grounded: false,
      explicitMetric: false,
    };
  }

  let text = parts.join(" — ");
  if (memory.project?.name) text = `${memory.project.name}: ${text}`;
  if (!text.startsWith("•") && !text.startsWith("-")) text = `• ${text}`;

  return {
    text,
    grounded: Boolean(action || outcome || metric),
    explicitMetric: metric?.provenance === "explicit",
  };
}

export function buildStarDraft(memory: ExportMemory): {
  text: string;
  grounded: boolean;
} {
  const situation =
    pick(memory.extractions, ["problem", "challenge", "project"])?.value ||
    (memory.project
      ? `On ${memory.project.name}`
      : firstSentence(memory.content, 140));
  const task =
    pick(memory.extractions, ["decision", "problem"])?.value ||
    "Addressed the core issue using what was already recorded.";
  const action =
    pick(memory.extractions, ["action", "collaboration"])?.value ||
    firstSentence(memory.content, 160);
  const resultParts: string[] = [];
  const outcome = pick(memory.extractions, ["outcome", "lesson"]);
  const metric = pick(memory.extractions, ["metric"]);
  if (outcome) resultParts.push(outcome.value);
  if (metric) resultParts.push(`Metric: ${metric.value}`);
  if (memory.themes.length) {
    resultParts.push(`Themes: ${memory.themes.slice(0, 3).join(", ")}`);
  }
  const result =
    resultParts.join(" ") ||
    "Outcome is limited to what appears in the source memory.";

  const title = memory.title || "Experience";
  const text = [
    `## ${title}`,
    memory.project?.name ? `Project: ${memory.project.name}` : null,
    "",
    `S — Situation: ${situation}`,
    `T — Task: ${task}`,
    `A — Action: ${action}`,
    `R — Result: ${result}`,
    "",
    "Source: grounded in your captured memory only. Verify before using.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    text,
    grounded: Boolean(
      pick(memory.extractions, ["action", "outcome", "metric", "decision"])
    ),
  };
}

export function buildExportMarkdown(
  mode: string,
  items: { memory: ExportMemory; score?: number }[]
): string {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (seen.has(item.memory.id)) return false;
    seen.add(item.memory.id);
    return true;
  });

  const lines: string[] = [
    `# Strand export — ${mode}`,
    "",
    "Generated from captured memories. Claims should be verified against the source notes.",
    "",
  ];

  if (mode === "resume" || mode === "performance" || mode === "portfolio") {
    lines.push("## Resume-style bullets", "");
    for (const item of unique) {
      const bullet = buildResumeBullet(item.memory);
      lines.push(bullet.text);
      if (!bullet.grounded) lines.push("  _(weak grounding — review source)_");
    }
    lines.push("");
  }

  if (mode === "behavioral" || mode === "job" || mode === "reflection") {
    lines.push("## STAR drafts", "");
    for (const item of unique) {
      lines.push(buildStarDraft(item.memory).text, "", "---", "");
    }
  }

  if (
    mode !== "resume" &&
    mode !== "performance" &&
    mode !== "portfolio" &&
    mode !== "behavioral" &&
    mode !== "job" &&
    mode !== "reflection"
  ) {
    for (const item of unique) {
      lines.push(buildStarDraft(item.memory).text, "", "---", "");
    }
  }

  return lines.join("\n").trim() + "\n";
}
