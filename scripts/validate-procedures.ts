// validate-procedures — fails the build on a broken procedural-graph export.
//
// Same rationale as scripts/lint-code-invariants.mjs (see CLAUDE.md Completion
// Integrity): a rule enforced only in prose (or only inside `notion-to-graph.ts`,
// which nothing re-checks once the JSON is committed) gets silently violated.
// This runs `assertProceduralGraph` over every committed export so a bad edit
// to a `data/*.procedure.json` file — a broken Notion export, a hand-edit that
// should never have happened — fails `npm run build`, not a live agent query.
//
// Run standalone: npm run validate:procedures
// Wired into:      npm run build (see package.json)

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { assertProceduralGraph } from '../src/lib/procedural-graph';
import type { ProceduralGraph } from '../src/lib/procedural-types';

const DATA_DIR = path.join(process.cwd(), 'data');

function main(): void {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.procedure.json'));
  if (files.length === 0) {
    console.error(`no *.procedure.json files found in ${DATA_DIR}`);
    process.exit(1);
  }

  let failed = false;
  for (const file of files) {
    const full = path.join(DATA_DIR, file);
    const graph: ProceduralGraph = JSON.parse(readFileSync(full, 'utf8'));
    try {
      assertProceduralGraph(graph);
      console.log(`OK    ${file}`);
    } catch (err) {
      failed = true;
      console.error(`FAIL  ${file}\n${(err as Error).message}`);
    }
  }

  if (failed) process.exit(1);
}

main();
