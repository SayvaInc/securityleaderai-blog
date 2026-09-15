import { MindMapNode, PositionedNode } from './mindmap-types';

// Distance between each depth ring. Tune this to spread nodes out more
// or pack them tighter.
const RADIUS_STEP = 300;

// Each generation narrows its angular span slightly relative to its
// parent's, so sibling branches at deeper rings don't visually collide
// as the ring circumference grows faster than the node count does.
const SIBLING_NARROWING = 0.86;

// World-space padding (px) added around a focused node + its direct
// children when the camera frames that subtree, so card edges aren't
// cropped right at the viewport boundary.
const FRAME_PADDING = 170;

function countLeaves(node: MindMapNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

// PreziMindMap is a client component: this layout runs once during SSR
// (Node's V8) and again on the client after hydration (the browser's V8).
// Math.cos/Math.sin aren't guaranteed bit-identical across different V8
// builds, so the same call can differ in a low-order decimal digit between
// the two — invisible on screen, but enough for React's hydration diff to
// flag every node position and SVG path as mismatched. Rounding to a fixed
// precision converges both environments on the same rendered value.
const COORDINATE_PRECISION = 2; // decimal places — well below a visible pixel
function round(value: number): number {
  const factor = 10 ** COORDINATE_PRECISION;
  return Math.round(value * factor) / factor;
}

/**
 * Lays every node out once, in a single shared coordinate space (like a
 * real Prezi canvas). Each node gets an angular slice proportional to how
 * many leaves it contains, so dense branches get more room. The camera
 * never re-lays anything out — it just moves/zooms around this fixed map.
 */
export function layoutMindMap(
  root: MindMapNode,
  startAngle = 0,
  endAngle = Math.PI * 2,
  depth = 0
): PositionedNode {
  const midAngle = (startAngle + endAngle) / 2;
  const x = depth === 0 ? 0 : round(Math.cos(midAngle) * RADIUS_STEP * depth);
  const y = depth === 0 ? 0 : round(Math.sin(midAngle) * RADIUS_STEP * depth);

  let children: PositionedNode[] | undefined;
  if (root.children && root.children.length > 0) {
    const totalLeaves = countLeaves(root);
    const fullSpan = endAngle - startAngle;
    const span = depth === 0 ? fullSpan : fullSpan * SIBLING_NARROWING;
    const sliceStart = startAngle + (fullSpan - span) / 2;
    let angleCursor = sliceStart;
    children = root.children.map((child) => {
      const leaves = countLeaves(child);
      const angleSpan = span * (leaves / totalLeaves);
      const positioned = layoutMindMap(child, angleCursor, angleCursor + angleSpan, depth + 1);
      angleCursor += angleSpan;
      return positioned;
    });
  }

  return { ...root, x, y, depth, children };
}

export function flatten(node: PositionedNode): PositionedNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

export function findNode(node: PositionedNode, id: string): PositionedNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Ancestor chain from root down to `id`, inclusive — used for the breadcrumb. */
export function pathTo(node: PositionedNode, id: string, trail: PositionedNode[] = []): PositionedNode[] | undefined {
  const next = [...trail, node];
  if (node.id === id) return next;
  for (const child of node.children ?? []) {
    const found = pathTo(child, id, next);
    if (found) return found;
  }
  return undefined;
}

/**
 * The "frame" the camera zooms to fit when you drill into a node: the node
 * itself plus its direct children. This is the core of the Prezi feel —
 * each click reframes the camera on a new region of the same canvas.
 */
export function frameBounds(node: PositionedNode) {
  const points = [node, ...(node.children ?? [])];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs) - FRAME_PADDING,
    maxX: Math.max(...xs) + FRAME_PADDING,
    minY: Math.min(...ys) - FRAME_PADDING,
    maxY: Math.max(...ys) + FRAME_PADDING,
  };
}
