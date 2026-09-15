// procedure-guide — the agent-facing query layer for a procedural graph.
//
// Backs the `.claude/skills/procedure-guide/SKILL.md` skill. Given a
// procedure id, the step the agent is about to act on, and the step ids it
// has already completed, this localizes the subgraph around that step and
// prints the ~6-line guidance block (localize + toGuidance from
// src/lib/procedural-graph.ts) — a bias injected as context before the next
// action, not an instruction the agent must obey.
//
// Every call is appended to a JSONL log so failed vs. successful
// trajectories are reviewable at the next Tolaria baseline review (see
// data/NOTION-SCHEMA.md's refinement loop). The log is local, gitignored
// runtime data — same footing as /work/decision-log/, not a build artifact.
//
// Usage:
//   npx tsx scripts/procedure-guide.ts <procedureId> <activeStepId> [completedStepId,...]
//
// Prints the guidance block to stdout. Exits 1 (no log entry written) if the
// procedure doesn't validate or the active step id isn't in it — a bad
// query should fail loud, not hand the agent silently wrong guidance.

import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { assertProceduralGraph, localize, toGuidance } from '../src/lib/procedural-graph';
import type { ProceduralGraph } from '../src/lib/procedural-types';

const LOG_DIR = path.join(process.cwd(), 'data', 'gate-logs');

function loadGraph(procedureId: string): ProceduralGraph {
  const file = path.join(process.cwd(), 'data', `${procedureId}.procedure.json`);
  const graph: ProceduralGraph = JSON.parse(readFileSync(file, 'utf8'));
  assertProceduralGraph(graph); // fail loud on a stale/broken export, not silently wrong guidance
  return graph;
}

function main(): void {
  const [procedureId, activeStepId, completedArg] = process.argv.slice(2);
  if (!procedureId || !activeStepId) {
    console.error('usage: npx tsx scripts/procedure-guide.ts <procedureId> <activeStepId> [completedStepId,...]');
    process.exit(1);
  }
  const completed = completedArg ? completedArg.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const graph = loadGraph(procedureId);
  const subgraph = localize(graph, activeStepId, completed);
  const guidance = toGuidance(subgraph);
  console.log(guidance);

  const entry = {
    run_id: randomUUID(),
    procedure_id: procedureId,
    active: activeStepId,
    completed,
    guidance,
    at: new Date().toISOString(),
  };
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(path.join(LOG_DIR, `${procedureId}.jsonl`), JSON.stringify(entry) + '\n');
}

main();
