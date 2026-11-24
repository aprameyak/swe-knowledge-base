import assert from "node:assert/strict";
import {
  buildExportMarkdown,
  buildResumeBullet,
  buildStarDraft,
} from "../src/lib/export";

const memory = {
  id: "m1",
  title: "Cut dashboard latency",
  content:
    "Moved aggregation into postgres and it went from around 8 seconds to 2. Product was blocked on the weekly ops review.",
  project: { name: "Ops Dashboard" },
  extractions: [
    {
      kind: "action",
      value: "Moved aggregation into Postgres",
      provenance: "explicit",
    },
    {
      kind: "outcome",
      value: "Unblocked weekly ops review",
      provenance: "inferred",
    },
    {
      kind: "metric",
      value: "8 seconds → 2 seconds",
      provenance: "explicit",
    },
    { kind: "technology", value: "PostgreSQL", provenance: "explicit" },
  ],
  themes: ["Technical problem-solving", "Ownership"],
};

const bullet = buildResumeBullet(memory);
assert.match(bullet.text, /Ops Dashboard/);
assert.match(bullet.text, /8 seconds → 2 seconds/);
assert.equal(bullet.grounded, true);
assert.equal(bullet.explicitMetric, true);

const star = buildStarDraft(memory);
assert.match(star.text, /S — Situation:/);
assert.match(star.text, /R — Result:/);
assert.match(star.text, /8 seconds → 2 seconds/);
assert.equal(star.grounded, true);

const md = buildExportMarkdown("resume", [{ memory, score: 1 }]);
assert.match(md, /Resume-style bullets/);
assert.match(md, /Ops Dashboard/);

const weak = buildResumeBullet({
  id: "m2",
  title: null,
  content: "Helped with some stuff on the team.",
  project: null,
  extractions: [],
  themes: [],
});
assert.equal(weak.grounded, false);
assert.match(weak.text, /Helped with some stuff/);

console.log("export tests passed");
