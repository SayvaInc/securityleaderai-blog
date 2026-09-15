'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MindMapNode, PositionedNode } from '@/lib/mindmap-types';
import { layoutMindMap, flatten, findNode, pathTo, frameBounds } from '@/lib/mindmap-layout';

/**
 * Prezi-style drill-down mind map: every node is laid out once in a single
 * fixed coordinate space (see mindmap-layout.ts); clicking a node just moves
 * a "camera" (pan + scale) to frame that node and its direct children.
 * Non-relevant branches fade instead of disappearing, so it reads as one
 * continuous map rather than separate pages.
 *
 * Colors are read from this site's own design tokens (globals.css), not a
 * hardcoded palette, so the map stays visually consistent with the rest of
 * SecurityLeader.ai and picks up any future token changes automatically.
 */

const NODE_WIDTH = 220; // px

// Camera easing: fraction of the remaining distance-to-target covered per
// animation frame. Higher = snappier, lower = smoother/slower.
const CAMERA_EASE = 0.16;

// Below these thresholds the camera is treated as "arrived" — stops the
// render-forcing tick loop from running forever on an already-settled view.
const SETTLE_THRESHOLD_PX = 0.4;
const SETTLE_THRESHOLD_SCALE = 0.001;

// Cap on how far in the camera zooms when framing a single childless node,
// so a leaf doesn't blow up edge-to-edge on a large viewport.
const MAX_CAMERA_SCALE = 1.6;

interface Camera {
  x: number;
  y: number;
  scale: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function PreziMindMap({ data }: { data: MindMapNode }) {
  const positioned = useMemo(() => layoutMindMap(data), [data]);
  const allNodes = useMemo(() => flatten(positioned), [positioned]);

  const [focusedId, setFocusedId] = useState(positioned.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const target = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const [, forceRender] = useState(0);

  const focused = findNode(positioned, focusedId) ?? positioned;
  const trail = pathTo(positioned, focusedId) ?? [positioned];
  const visibleIds = useMemo(() => {
    const ids = new Set(trail.map((t) => t.id));
    (focused.children ?? []).forEach((c) => ids.add(c.id));
    return ids;
  }, [trail, focused]);

  // Recompute where the camera should be heading whenever focus changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { minX, maxX, minY, maxY } = frameBounds(focused);
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    const boxW = maxX - minX || 1;
    const boxH = maxY - minY || 1;
    const scale = Math.min(w / boxW, h / boxH, MAX_CAMERA_SCALE);
    target.current = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, scale };
    // A reader who asked for reduced motion gets an instant cut, not a pan/zoom.
    if (prefersReducedMotion()) {
      camera.current = { ...target.current };
      forceRender((n) => n + 1);
    }
  }, [focusedId, focused]);

  // Ease the camera toward its target every frame — this is the "zoom" feel.
  // Skipped entirely under prefers-reduced-motion (camera jumps straight to
  // target above instead).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf: number;
    const tick = () => {
      const c = camera.current;
      const t = target.current;
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      const ds = t.scale - c.scale;
      const moving =
        Math.abs(dx) > SETTLE_THRESHOLD_PX || Math.abs(dy) > SETTLE_THRESHOLD_PX || Math.abs(ds) > SETTLE_THRESHOLD_SCALE;
      if (moving) {
        camera.current = { x: c.x + dx * CAMERA_EASE, y: c.y + dy * CAMERA_EASE, scale: c.scale + ds * CAMERA_EASE };
        forceRender((n) => n + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const el = containerRef.current;
  const vw = el?.clientWidth ?? 1000;
  const vh = el?.clientHeight ?? 700;
  const c = camera.current;
  const worldTransform = `translate(${vw / 2 - c.x * c.scale}px, ${vh / 2 - c.y * c.scale}px) scale(${c.scale})`;

  const zoomOut = () => {
    if (trail.length > 1) setFocusedId(trail[trail.length - 2].id);
  };

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-tertiary)' }}>
      <MapBreadcrumb trail={trail} onSelect={setFocusedId} />
      <div
        ref={containerRef}
        onDoubleClick={zoomOut}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: trail.length > 1 ? 'zoom-out' : 'default' }}
      >
        <div
          className="absolute inset-0"
          style={{ transform: worldTransform, transformOrigin: '0 0' }}
        >
          <Connectors nodes={allNodes} />
          {allNodes.map((n) => (
            <NodeCard
              key={n.id}
              node={n}
              isFocused={n.id === focusedId}
              onSelect={() => n.children?.length && setFocusedId(n.id)}
              dimmed={!visibleIds.has(n.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Connectors({ nodes }: { nodes: PositionedNode[] }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {nodes.flatMap((n) =>
        (n.children ?? []).map((child) => (
          <path
            key={child.id}
            d={`M ${n.x} ${n.y} C ${(n.x + child.x) / 2} ${n.y}, ${(n.x + child.x) / 2} ${child.y}, ${child.x} ${child.y}`}
            stroke="var(--primary-500)"
            strokeWidth={2}
            fill="none"
            opacity={0.5}
          />
        ))
      )}
    </svg>
  );
}

function NodeCard({
  node,
  isFocused,
  onSelect,
  dimmed,
}: {
  node: PositionedNode;
  isFocused: boolean;
  onSelect: () => void;
  dimmed: boolean;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExternal = node.href?.startsWith('http');

  const cardClasses =
    'rounded-[20px] border px-[18px] py-3.5 text-left transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]';
  const cardStyle: CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    transform: 'translate(-50%, -50%)',
    width: NODE_WIDTH,
    background: isFocused ? 'var(--primary-50)' : 'var(--bg-secondary)',
    borderColor: isFocused ? 'var(--primary-500)' : 'transparent',
    opacity: dimmed ? 0.3 : 1,
  };

  const content = (
    <>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {node.title}
      </div>
      {node.summary && <div className="mt-1 text-xs italic text-secondary">{node.summary}</div>}
      {hasChildren && <div className="mt-1.5 text-[11px] font-medium text-primary-600">{node.children!.length} more →</div>}
    </>
  );

  // Prefer navigation (href) over drill-down when both are present — a
  // leaf pointing at a real post should take the reader there, not just
  // re-frame the camera on nothing.
  if (node.href && !hasChildren) {
    return isExternal ? (
      <a href={node.href} target="_blank" rel="noopener noreferrer" className={cardClasses} style={cardStyle}>
        {content}
      </a>
    ) : (
      <Link href={node.href} className={cardClasses} style={cardStyle}>
        {content}
      </Link>
    );
  }

  if (hasChildren) {
    return (
      <button type="button" onClick={onSelect} className={cardClasses} style={{ ...cardStyle, cursor: 'pointer' }}>
        {content}
      </button>
    );
  }

  // Leaf with no href: static, non-interactive label.
  return (
    <div className={cardClasses} style={cardStyle}>
      {content}
    </div>
  );
}

function MapBreadcrumb({ trail, onSelect }: { trail: PositionedNode[]; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="Mind map path" className="flex flex-wrap gap-2 p-4">
      {trail.map((n, i) => {
        const isCurrent = i === trail.length - 1;
        return (
          <span key={n.id} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-muted">
                /
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              aria-current={isCurrent ? 'location' : undefined}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
              style={{
                background: isCurrent ? 'var(--primary-500)' : 'var(--primary-50)',
                color: isCurrent ? '#fff' : 'var(--primary-600)',
              }}
            >
              {n.title}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
