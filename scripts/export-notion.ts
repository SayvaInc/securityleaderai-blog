// export-notion — turns a Notion Procedures-database dump into a validated
// data/<id>.procedure.json export.
//
// The Notion query itself happens via the Notion MCP tool
// (notion-query-data-sources), from an agent session — there is no
// server-side Notion API token wired into this repo, and CLAUDE.md's rule is
// "prefer environment variables and secret managers" over adding one just for
// a once-a-month manual export. So this script is the deterministic second
// half of the export: an agent dumps the queried rows to a JSON file (rows
// keep their raw Notion relation values — page URLs, not yet resolved to
// Step IDs), and this script resolves those URLs against each row's own page
// url, calls notionRowsToGraph (which validates via assertProceduralGraph
// before anything is written), and writes data/<id>.procedure.json.
//
// Usage:
//   npx tsx scripts/export-notion.ts <rows-dump.json> [commitHash]
//
// <rows-dump.json> shape:
//   {
//     "meta": { "id": "...", "title": "...", "objective": "...", "version": "..." },
//     "rows": [
//       {
//         "url": "<this row's own Notion page url — used to resolve relations>",
//         "Step": "...", "Step ID": "...", "Kind": "gate|processor|action|decision",
//         "Summary": "...", "Pass When": "...",
//         "Next": ["<page url>", ...], "Next Condition": "...",
//         "Requires": ["<page url>", ...], "On Fail": ["<page url>"],
//         "Skip When": "...", "Notes": "...", "Entry": true, "URL": "..."
//       }, ...
//     ]
//   }
//
// If a commitHash argument is given, it overrides meta.version — this is the
// "commit the JSON with the current harness commit hash" provenance rule
// (same as session gate logs), so a re-export always stamps the commit it
// was exported alongside, not a stale date typed into Notion.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { notionRowsToGraph, type NotionProcedureMeta, type NotionStepRow } from '../src/lib/notion-to-graph';

interface RawRow extends Omit<NotionStepRow, 'Next' | 'Requires' | 'On Fail'> {
  url: string;
  Next?: string[];
  Requires?: string[];
  'On Fail'?: string[];
}

interface RowsDump {
  meta: NotionProcedureMeta;
  rows: RawRow[];
}

function resolveUrlsToStepIds(rows: RawRow[]): NotionStepRow[] {
  const byUrl = new Map(rows.map((r) => [r.url, r['Step ID']]));
  const resolve = (urls?: string[]) =>
    urls?.map((u) => {
      const id = byUrl.get(u);
      if (!id) throw new Error(`relation points to a url not present in this dump: ${u}`);
      return id;
    });

  return rows.map(({ url, ...r }) => ({
    ...r,
    Next: resolve(r.Next),
    Requires: resolve(r.Requires),
    'On Fail': resolve(r['On Fail']),
  }));
}

function main(): void {
  const [dumpPath, commitHashArg] = process.argv.slice(2);
  if (!dumpPath) {
    console.error('usage: npx tsx scripts/export-notion.ts <rows-dump.json> [commitHash]');
    process.exit(1);
  }

  const dump: RowsDump = JSON.parse(readFileSync(dumpPath, 'utf8'));
  const rows = resolveUrlsToStepIds(dump.rows);
  const meta = commitHashArg ? { ...dump.meta, version: commitHashArg } : dump.meta;
  const graph = notionRowsToGraph(meta, rows); // throws (via assertProceduralGraph) on a broken export

  const outPath = path.join(process.cwd(), 'data', `${graph.id}.procedure.json`);
  writeFileSync(outPath, JSON.stringify(graph, null, 2) + '\n');
  console.log(`wrote ${outPath}`);
}

main();
