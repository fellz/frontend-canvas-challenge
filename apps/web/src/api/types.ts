export type {
  GenerationData as Generation,
  GenerationRequest,
  GraphData as Graph,
  NodeData as GraphNode,
  SpaceData as Space,
} from '@canvas/contracts';
import type { GraphData } from '@canvas/contracts';

export type GraphEdge = GraphData['edges'][number];
export type Viewport = GraphData['viewport'];
export type NodeType = GraphData['nodes'][number]['type'];
export type Scenario = 'success' | 'failure';
