/**
 * Procedural Graph — the second graph type next to the topic mind map.
 *
 * Topic graph (mindmap-types.ts):   idea —supports→ idea       (for humans)
 * Procedural graph (this file):     step —typed edge→ step     (for agents)
 *
 * Edge kinds mirror the Google "Procedural Graphs" paper: the graph answers
 * "what next, in what order, under which conditions" instead of "what is".
 */

export type EdgeKind =
  | "next"      // default successor when this step passes
  | "requires"  // must have completed before this step may run
  | "onFail"    // where to go when this step fails (omit = halt)
  | "skipWhen"; // conditional bypass; `condition` holds the predicate text

export type StepKind =
  | "gate"      // fail-closed: failure halts unless an onFail edge exists
  | "processor" // always yields output, possibly sanitized
  | "action"    // ordinary step (tool call, human task)
  | "decision"; // branch point; multiple `next` edges with conditions

export interface StepNode {
  id: string;
  title: string;
  kind: StepKind;
  /** One-line intent — what this step is for. Shown to humans and agents. */
  summary?: string;
  /** Pass criteria in plain language. Agents echo this when checking. */
  passWhen?: string;
  /** Known pitfalls from past runs — the "rejected edits stay on file" idea. */
  notes?: string[];
  /** Notion page URL for the authoring source. */
  source?: string;
}

export interface Edge {
  from: string;
  to: string;
  kind: EdgeKind;
  /** Predicate text for `skipWhen` / conditional `next`. */
  condition?: string;
}

export interface ProceduralGraph {
  id: string;
  title: string;
  /** Governing thought — what the whole procedure is for (Minto root). */
  objective: string;
  entry: string;
  nodes: StepNode[];
  edges: Edge[];
  /** Notion export provenance. */
  exportedAt?: string;
  version?: string;
}

/** What `localize()` hands to the guidance model. Small on purpose. */
export interface Subgraph {
  objective: string;
  active: StepNode;
  done: StepNode[];        // requires-satisfied predecessors already completed
  pending: StepNode[];     // requires not yet satisfied
  next: { node: StepNode; condition?: string }[];
  onFail?: StepNode;
  skipWhen?: string;
}
