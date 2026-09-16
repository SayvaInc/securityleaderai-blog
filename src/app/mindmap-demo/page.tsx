import Link from 'next/link';
import PreziMindMap from '@/components/PreziMindMap';
import { buildPyramid } from '@/lib/pyramid';

// Not linked from /blog, /research, or any nav — an unlisted POC route for
// trying the Prezi-style drill-down map against real SecurityLeader.ai
// content pillars before deciding whether it becomes a shipped feature
// (e.g. a per-post outline, or a site-level "explore everything" page).
export const metadata = {
  robots: { index: false, follow: false },
};

// A pyramid, not a category list: the root is an assertion (the governing
// thought), and each branch is itself an assertion that supports it — the
// "so what" for that group, not just its label. Capped at 7 per level.
const demoData = buildPyramid('AI creates attack surface faster than most organizations can govern it', [
  {
    title: 'Agent autonomy needs boundaries encoded before it needs monitoring',
    summary: 'AI / MCP Security',
    children: [
      { id: 'bounded-autonomy', title: 'Bounded Autonomy limits what an agent can do, not just what it did' },
      { id: 'megalodon', title: 'The Megalodon attack moved through CI/CD trust, not a broken control' },
      { id: 'asvs', title: 'ASVS translation closes a language gap in the standard itself' },
    ],
  },
  {
    title: 'Community protection is two-way translation, not one-way warnings',
    summary: 'Digital Seva',
    children: [
      { id: 'post-1', title: 'The Six Red Flags spine gives sangat a shared vocabulary for scams' },
      { id: 'post-2', title: 'Phishing basics land differently in Panjabi than in English' },
      { id: 'post-3', title: 'A living directory beats a one-time post for an evolving threat' },
    ],
  },
  {
    title: "Digital preservation is a security problem before it's an archival one",
    summary: 'Panjab Digital Library',
    children: [
      { id: 'pdl-exhibits', title: 'Interactive exhibits widen who engages with the archive' },
      { id: 'pdl-frontend', title: 'A locally-run model keeps sensitive material off third-party servers' },
    ],
  },
]);

export default function MindMapDemoPage() {
  return (
    <div className="container flex h-screen flex-col pb-6 pt-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-primary-600">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-secondary">Mind Map Demo (unlisted POC)</span>
      </nav>
      <Link href="/mindmap-demo/post" className="mb-4 self-start text-sm font-medium text-primary-600 hover:underline">
        See a real post's outline instead →
      </Link>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-color">
        <PreziMindMap data={demoData} />
      </div>
    </div>
  );
}
