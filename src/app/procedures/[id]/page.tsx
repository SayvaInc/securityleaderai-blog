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

function loadGraph(id: string): ProceduralGraph | null {
  try {
    const raw = readFileSync(path.join(DATA_DIR, `${id}.procedure.json`), 'utf8');
    return JSON.parse(raw) as ProceduralGraph;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.procedure.json'))
    .map((f) => ({ id: f.replace(/\.procedure\.json$/, '') }));
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
