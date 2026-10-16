import type { Edge, Node } from "@xyflow/react";
import type { ChoiceNode, ContactNode, FlowEdge, FlowGraph, FlowNode, IntroNode, OutcomeNode } from "@/lib/flow";

export type EditorNode =
  | Node<IntroNode["data"], "intro">
  | Node<ContactNode["data"], "contact">
  | Node<ChoiceNode["data"], "choice">
  | Node<OutcomeNode["data"], "outcome">;

export type EdgeData = {
  requiredTags: string[];
  /** Injetado só na renderização; nunca é persistido. */
  onLabelClick?: (edgeId: string) => void;
  /** Posição desta seta entre as saídas do nó (1-based) e total; só renderização. */
  order?: number;
  siblings?: number;
  /** Participação deste destino entre os leads que saíram do nó de origem; só renderização. */
  share?: number;
};
export type EditorEdge = Edge<EdgeData, "labeled">;

export function graphToEditor(graph: FlowGraph): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const nodes = graph.nodes.map(
    (n) =>
      ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: structuredClone(n.data),
        deletable: false,
      }) as EditorNode,
  );
  const edges = graph.edges.map(toEditorEdge);
  return { nodes, edges };
}

export function toEditorEdge(e: FlowEdge): EditorEdge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    type: "labeled",
    deletable: false,
    data: { requiredTags: [...e.requiredTags] },
  };
}

export function editorToGraph(nodes: EditorNode[], edges: EditorEdge[]): FlowGraph {
  const flowNodes = nodes.map(
    (n) =>
      ({
        id: n.id,
        type: n.type,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        data: structuredClone(n.data),
      }) as FlowNode,
  );
  const intro = flowNodes.find((n) => n.type === "intro");
  return {
    nodes: flowNodes,
    edges: edges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      requiredTags: [...(e.data?.requiredTags ?? [])],
    })),
    entryNodeId: intro?.id ?? "",
  };
}
