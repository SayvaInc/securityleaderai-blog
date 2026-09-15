import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PreziMindMap from '@/components/PreziMindMap';
import { toMindMap } from '@/lib/procedural-graph';
import type { ProceduralGraph } from '@/lib/procedural-types';

// Not linked from /blog, /research, or any nav — unlisted POC, same footing
// as /mindmap-demo. Renders a *procedural* graph (step → typed edge → step)
// instead of a topic pyramid: root node = the procedure's objective (the
// Minto governing thought), children = the `next`-edge path from `entry`.
// See HANDOFF-procedural-graph.md for the graph type this projects from.
export const metadata = {
  robots: { index: false, follow: false },
};

const DATA_DIR = path.join(process.cwd(), 'data');

// Keyed by each graph's own `id` field, not its filename — the export
// filename is just storage (data/harness-gates.procedure.json holds the
// graph whose id is "critics-cut-v2-harness"); the URL is the graph's
// self-declared identity, so a rename on disk can't silently break the route.
function loadAllGraphs(): ProceduralGraph[] {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.procedure.json'))
    .map((f) => JSON.parse(readFileSync(path.join(DATA_DIR, f), 'utf8')) as ProceduralGraph);
}

function loadGraph(id: string): ProceduralGraph | null {
  return loadAllGraphs().find((g) => g.id === id) ?? null;
}

export function generateStaticParams() {
  return loadAllGraphs().map((g) => ({ id: g.id }));
}

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const graph = loadGraph(id);
  if (!graph) notFound();

  const data = toMindMap(graph);

  return (
    <div className="container flex h-screen flex-col pb-6 pt-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-primary-600">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/mindmap-demo" className="transition-colors hover:text-primary-600">
          Mind Map Demo
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-secondary">
          Procedure: {graph.title} (unlisted POC)
        </span>
      </nav>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-color">
        <PreziMindMap data={data} />
      </div>
    </div>
  );
}
