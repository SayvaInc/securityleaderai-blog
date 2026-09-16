import { MindMapNode } from './mindmap-types';
import { validateMindMap } from './pyramid';

interface RawHeading {
  level: number;
  title: string;
  summary?: string;
}

function extractHeadings(markdown: string): RawHeading[] {
  const lines = markdown.split('\n');
  const headings: RawHeading[] = [];
  let current: RawHeading | null = null;
  let bodyBuffer: string[] = [];

  const flush = () => {
    if (current) {
      const text = bodyBuffer.join(' ').trim();
      current.summary = text ? text.slice(0, 160) : undefined;
      headings.push(current);
    }
    bodyBuffer = [];
  };

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.*)/.exec(line.trim());
    if (match) {
      flush();
      current = { level: match[1].length, title: match[2].trim() };
    } else if (current && line.trim() && !line.trim().startsWith('```')) {
      bodyBuffer.push(line.trim());
    }
  }
  flush();
  return headings;
}

// Module-scoped like pyramid.ts's slug() counter — unique per process, not
// per call. Fine for the current use (building a tree once per page render
// at module/build time); don't rely on it resetting between requests.
let idCounter = 0;
const nextId = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idCounter++}`;

/**
 * Turns one post's markdown into a mind map keyed on its own outline:
 * H1/title = root, H2 = branches, H3 = leaves. Point this at your MDX
 * content pipeline output so every post gets a drill-down map for free.
 */
export function markdownToMindMap(markdown: string, rootTitle: string): MindMapNode {
  const headings = extractHeadings(markdown);
  const root: MindMapNode = { id: nextId(rootTitle), title: rootTitle, children: [] };
  const stack: { level: number; node: MindMapNode }[] = [{ level: 1, node: root }];

  for (const h of headings) {
    const node: MindMapNode = { id: nextId(h.title), title: h.title, summary: h.summary, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) stack.pop();
    const parent = stack[stack.length - 1].node;
    parent.children = [...(parent.children ?? []), node];
    stack.push({ level: h.level, node });
  }

  // Auto-generated from headings, so it can't guarantee MECE grouping —
  // flag it instead of shipping a flat 12-branch map silently.
  const violations = validateMindMap(root);
  if (violations.length > 0) {
    console.warn(
      `[markdownToMindMap] "${rootTitle}" needs manual regrouping (Minto cap is 7 children per node):`,
      violations.map((v) => `${v.path.join(' > ')} — ${v.count} children`)
    );
  }

  return root;
}

/**
 * Aggregates several posts into one site-level map: content pillars as
 * branches, each post's own H2 outline nested underneath. Use this for a
 * top-level "explore SecurityLeader.ai" page.
 */
export function buildSiteMap(
  pillars: { title: string; posts: { title: string; markdown: string }[] }[]
): MindMapNode {
  return {
    id: nextId('site-root'),
    title: 'SecurityLeader.ai',
    children: pillars.map((pillar) => ({
      id: nextId(pillar.title),
      title: pillar.title,
      children: pillar.posts.map((p) => markdownToMindMap(p.markdown, p.title)),
    })),
  };
}
