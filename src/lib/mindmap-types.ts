export interface MindMapNode {
  id: string;
  title: string;
  summary?: string;
  href?: string; // optional deep link, e.g. to a full post or section anchor
  children?: MindMapNode[];
}

export interface PositionedNode extends Omit<MindMapNode, 'children'> {
  x: number;
  y: number;
  depth: number;
  children?: PositionedNode[];
}
