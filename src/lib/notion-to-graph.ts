import type { Edge, ProceduralGraph, StepKind, StepNode } from "./procedural-types";
import { assertProceduralGraph } from "./procedural-graph";

/**
 * Notion is the source of truth. One database per procedure, one row per
 * step. Relations carry the edges. This is the flattened row shape the
 * Notion MCP `query-data-sources` call (or a CSV export) gives you after
 * pulling relation titles instead of ids.
 *
 * See data/NOTION-SCHEMA.md for the database properties.
 */
export interface NotionStepRow {
  Step: string;                 // title
  "Step ID": string;            // slug, stable across renames
  Kind: StepKind;               // select
  Summary?: string;
  "Pass When"?: string;
  Next?: string[];              // relation → Step IDs
  "Next Condition"?: string;    // optional; applies to all Next of a decision
  Requires?: string[];          // relation → Step IDs
  "On Fail"?: string[];         // relation → Step ID (single)
  "Skip When"?: string;
  Notes?: string;               // newline-separated
  Entry?: boolean;              // checkbox — exactly one row
  URL?: string;
}

export interface NotionProcedureMeta {
  id: string;
  title: string;
  objective: string;
  version?: string;
}

export function notionRowsToGraph(meta: NotionProcedureMeta, rows: NotionStepRow[]): ProceduralGraph {
  const nodes: StepNode[] = rows.map((r) => ({
    id: r["Step ID"],
    title: r.Step,
    kind: r.Kind,
    summary: r.Summary || undefined,
    passWhen: r["Pass When"] || undefined,
    notes: r.Notes ? r.Notes.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    source: r.URL || undefined,
  }));

  const edges: Edge[] = [];
  for (const r of rows) {
    const from = r["Step ID"];
    for (const to of r.Next ?? []) edges.push({ from, to, kind: "next", condition: r["Next Condition"] || undefined });
    for (const to of r.Requires ?? []) edges.push({ from, to, kind: "requires" });
    for (const to of r["On Fail"] ?? []) edges.push({ from, to, kind: "onFail" });
    if (r["Skip When"]) {
      const target = r.Next?.[0];
      if (target) edges.push({ from, to: target, kind: "skipWhen", condition: r["Skip When"] });
    }
  }

  const entries = rows.filter((r) => r.Entry);
  if (entries.length !== 1) throw new Error(`expected exactly one Entry row, found ${entries.length}`);

  const g: ProceduralGraph = {
    ...meta,
    entry: entries[0]["Step ID"],
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
  };
  assertProceduralGraph(g);
  return g;
}
