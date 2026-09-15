import { MindMapNode } from './mindmap-types';

// Minto's own reason for grouping-and-summarizing: working memory caps out
// around 7±2 chunks. We take the hard ceiling, not the generous end.
export const MAX_CHILDREN = 7;

export interface PyramidViolation {
  path: string[]; // titles from root down to the offending node
  count: number;
}

/**
 * Walks the tree and reports every node with more than MAX_CHILDREN direct
 * children. A pyramid with a violation isn't MECE-grouped yet — it's a
 * flat list wearing a mind map's clothes. Call this in dev / at build time.
 */
export function validateMindMap(node: MindMapNode, trail: string[] = []): PyramidViolation[] {
  const here = [...trail, node.title];
  const violations: PyramidViolation[] = [];
  const count = node.children?.length ?? 0;
  if (count > MAX_CHILDREN) violations.push({ path: here, count });
  for (const child of node.children ?? []) {
    violations.push(...validateMindMap(child, here));
  }
  return violations;
}

/** Throws with a readable report — use where a silent overflow would be worse than a build failure. */
export function assertPyramid(node: MindMapNode): void {
  const violations = validateMindMap(node);
  if (violations.length === 0) return;
  const report = violations
    .map((v) => `  "${v.path.join(' > ')}" has ${v.count} children (max ${MAX_CHILDREN})`)
    .join('\n');
  throw new Error(
    `Mind map isn't MECE-grouped yet — regroup these under synthesizing nodes before shipping:\n${report}`
  );
}

// Module-scoped so every id minted via slug() in a given process is unique.
// Fine for build-time trees (this file, markdown-to-mindmap.ts) that are
// constructed once at module load; don't call buildPyramid() from inside a
// per-request server render path expecting a fresh counter each time.
let counter = 0;
function slug(title: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${counter++}`;
}

/**
 * Explicit pyramid builder: forces you to name the synthesizing idea for
 * each group, rather than letting a flat list of headings pass through
 * untouched. This is the difference between Minto grouping and mere
 * bucketing — a group node's title should be an assertion ("why"/"so what"),
 * not a category label.
 *
 * Example:
 *   buildPyramid(
 *     "AI creates attack surface faster than most orgs can govern it",
 *     [
 *       { title: "Agent autonomy needs boundaries before it needs monitoring", children: [...] },
 *       { title: "Community protection is two-way translation, not warnings", children: [...] },
 *     ]
 *   )
 */
export function buildPyramid(
  governingThought: string,
  groups: { title: string; summary?: string; children?: MindMapNode[] }[],
  id = slug(governingThought)
): MindMapNode {
  if (groups.length > MAX_CHILDREN) {
    throw new Error(
      `${groups.length} groups under "${governingThought}" — Minto caps supporting groups at ${MAX_CHILDREN}. Merge related groups or promote one to its own governing thought.`
    );
  }
  const tree: MindMapNode = {
    id,
    title: governingThought,
    children: groups.map((g) => ({
      id: slug(g.title),
      title: g.title,
      summary: g.summary,
      children: g.children,
    })),
  };
  assertPyramid(tree);
  return tree;
}
