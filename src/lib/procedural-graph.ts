import type { MindMapNode } from "./mindmap-types";
import type { Edge, ProceduralGraph, StepNode, Subgraph } from "./procedural-types";

const MAX_NEXT = 7; // Minto cap applies to branch fan-out too

// ---------------------------------------------------------------------------
// Validation — fail at authoring/export time, not at agent runtime
// ---------------------------------------------------------------------------

export function validateProceduralGraph(g: ProceduralGraph): string[] {
  const errors: string[] = [];
  const ids = new Set(g.nodes.map((n) => n.id));
  const byId = index(g);

  if (!ids.has(g.entry)) errors.push(`entry "${g.entry}" is not a node`);
  const dupes = g.nodes.map((n) => n.id).filter((id, i, a) => a.indexOf(id) !== i);
  for (const d of new Set(dupes)) errors.push(`duplicate node id "${d}"`);

  for (const e of g.edges) {
    if (!ids.has(e.from)) errors.push(`edge from unknown node "${e.from}"`);
    if (!ids.has(e.to)) errors.push(`edge to unknown node "${e.to}"`);
    if (e.kind === "skipWhen" && !e.condition) errors.push(`skipWhen ${e.from}→${e.to} has no condition`);
  }

  for (const n of g.nodes) {
    const nexts = g.edges.filter((e) => e.from === n.id && e.kind === "next");
    if (nexts.length > MAX_NEXT) errors.push(`"${n.id}" has ${nexts.length} next edges (cap ${MAX_NEXT})`);
    if (n.kind === "decision" && nexts.some((e) => !e.condition))
      errors.push(`decision "${n.id}" has an unconditioned next edge`);
    const fails = g.edges.filter((e) => e.from === n.id && e.kind === "onFail");
    if (fails.length > 1) errors.push(`"${n.id}" has multiple onFail edges`);
  }

  // Reachability from entry via next/onFail/skipWhen
  const seen = new Set<string>();
  const stack = [g.entry];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of g.edges) if (e.from === id && e.kind !== "requires") stack.push(e.to);
  }
  for (const n of g.nodes) if (!seen.has(n.id) && byId.has(n.id)) errors.push(`"${n.id}" unreachable from entry`);

  // Cycle check on `requires` — a step can't require itself transitively
  const req = new Map<string, string[]>();
  for (const e of g.edges) if (e.kind === "requires") req.set(e.from, [...(req.get(e.from) ?? []), e.to]);
  const visiting = new Set<string>();
  const done = new Set<string>();
  const dfs = (id: string): boolean => {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const cyc = (req.get(id) ?? []).some(dfs);
    visiting.delete(id);
    done.add(id);
    return cyc;
  };
  for (const id of ids) if (dfs(id)) { errors.push(`requires cycle through "${id}"`); break; }

  return errors;
}

export function assertProceduralGraph(g: ProceduralGraph): void {
  const errs = validateProceduralGraph(g);
  if (errs.length) throw new Error(`Procedural graph "${g.id}" invalid:\n  - ${errs.join("\n  - ")}`);
}

// ---------------------------------------------------------------------------
// Localize — the paper's core move: active node + surrounding subgraph
// ---------------------------------------------------------------------------

export function localize(g: ProceduralGraph, activeId: string, completed: Iterable<string> = []): Subgraph {
  const byId = index(g);
  const active = byId.get(activeId);
  if (!active) throw new Error(`active node "${activeId}" not in graph`);
  const doneSet = new Set(completed);
  const out = (kind: Edge["kind"]) => g.edges.filter((e) => e.from === activeId && e.kind === kind);

  const requires = out("requires").map((e) => byId.get(e.to)!);
  const fail = out("onFail")[0];
  const skip = out("skipWhen")[0];

  return {
    objective: g.objective,
    active,
    done: requires.filter((n) => doneSet.has(n.id)),
    pending: requires.filter((n) => !doneSet.has(n.id)),
    next: out("next").map((e) => ({ node: byId.get(e.to)!, condition: e.condition })),
    onFail: fail ? byId.get(fail.to) : undefined,
    skipWhen: skip?.condition,
  };
}

/**
 * Turns the subgraph into step-level guidance. This is a *bias*, not an
 * instruction — the solver still picks the action. Keep it short: the whole
 * point is to stop the agent re-reading its history.
 */
export function toGuidance(s: Subgraph): string {
  const lines: string[] = [];
  lines.push(`OBJECTIVE: ${s.objective}`);
  lines.push(`ACTIVE STEP [${s.active.kind}]: ${s.active.title}${s.active.summary ? ` — ${s.active.summary}` : ""}`);
  if (s.active.passWhen) lines.push(`PASS WHEN: ${s.active.passWhen}`);
  if (s.pending.length) lines.push(`BLOCKED — not yet done: ${s.pending.map((n) => n.title).join("; ")}`);
  if (s.skipWhen) lines.push(`SKIP THIS STEP IF: ${s.skipWhen}`);
  if (s.next.length)
    lines.push(`THEN: ${s.next.map((n) => (n.condition ? `if ${n.condition} → ${n.node.title}` : n.node.title)).join(" | ")}`);
  lines.push(`ON FAILURE: ${s.onFail ? `go to "${s.onFail.title}"` : s.active.kind === "gate" ? "HALT (fail-closed)" : "report and stop"}`);
  if (s.active.notes?.length) lines.push(`KNOWN PITFALLS: ${s.active.notes.join("; ")}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Projection — render the same procedure in the Prezi mind map
// ---------------------------------------------------------------------------

/**
 * Follows `next` edges from entry to build the tree the human view expects.
 * Root = objective (governing thought); onFail/skipWhen become annotated
 * leaves so the diagram shows the conditions, not just the happy path.
 */
export function toMindMap(g: ProceduralGraph): MindMapNode {
  const byId = index(g);
  const seen = new Set<string>();
  const build = (id: string): MindMapNode => {
    const n = byId.get(id)!;
    seen.add(id);
    const kids: MindMapNode[] = [];
    for (const e of g.edges.filter((e) => e.from === id)) {
      if (e.kind === "next" && !seen.has(e.to)) {
        const child = build(e.to);
        if (e.condition) child.title = `if ${e.condition}: ${child.title}`;
        kids.push(child);
      } else if (e.kind === "onFail") {
        kids.push({ id: `${id}-fail`, title: `✗ on fail → ${byId.get(e.to)!.title}` });
      } else if (e.kind === "skipWhen") {
        kids.push({ id: `${id}-skip`, title: `↷ skip when ${e.condition}` });
      }
    }
    return {
      id: n.id,
      title: `${badge(n)} ${n.title}`,
      summary: n.passWhen ? `Pass when: ${n.passWhen}` : n.summary,
      children: kids.length ? kids : undefined,
    };
  };
  return { id: g.id, title: g.objective, children: [build(g.entry)] };
}

function badge(n: StepNode): string {
  return { gate: "⛔", processor: "⚙", action: "▶", decision: "◆" }[n.kind];
}

function index(g: ProceduralGraph): Map<string, StepNode> {
  return new Map(g.nodes.map((n) => [n.id, n]));
}
