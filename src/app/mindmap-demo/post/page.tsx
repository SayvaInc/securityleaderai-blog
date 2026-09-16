import Link from 'next/link';
import PreziMindMap from '@/components/PreziMindMap';
import { markdownToMindMap } from '@/lib/markdown-to-mindmap';
import { getPostBySlug } from '@/lib/posts';

// Not linked from /blog, /research, or any nav — unlisted POC, same as the
// sibling pyramid demo at /mindmap-demo. This one demonstrates the *other*
// feed path from markdown-to-mindmap.ts: a real post's own H1/H2/H3 outline
// turned into a drill-down map, instead of a hand-authored pyramid.
export const metadata = {
  robots: { index: false, follow: false },
};

// Picked for the demo because its outline already fits the Minto cap at
// every level without any regrouping: 7 H2 branches (right at the cap) and
// at most 3 H3 leaves under any one of them — a real three-level drill-down,
// not a flat list. See CLAUDE.md's Decision & Lessons Log for how this was
// chosen.
const DEMO_SLUG = 'oauth-supply-chain-salesloft-drift';

export default function MindMapPostDemoPage() {
  const post = getPostBySlug(DEMO_SLUG);
  const data = markdownToMindMap(post.content, post.title);

  return (
    <div className="container flex h-screen flex-col pb-6 pt-8">
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-primary-600">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/mindmap-demo" className="transition-colors hover:text-primary-600">
          Mind Map Demo
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-secondary">Post outline (unlisted POC)</span>
      </nav>
      <Link href={`/blog/${DEMO_SLUG}`} className="mb-4 self-start text-sm font-medium text-primary-600 hover:underline">
        Read the full post →
      </Link>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-color">
        <PreziMindMap data={data} />
      </div>
    </div>
  );
}
