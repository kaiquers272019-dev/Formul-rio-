"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { type FlowGraph, allTags, newId, nodeTitle } from "@/lib/flow";
import type { NodeStats } from "@/lib/analytics";
import { type EditorEdge, type EditorNode, editorToGraph, graphToEditor, toEditorEdge } from "./editor-types";
import { StatsContext, nodeTypes } from "./nodes";
import { edgeTypes } from "./LabeledEdge";
import { EdgePanel, NodePanel } from "./SidePanel";
import { PreviewModal } from "./PreviewModal";

type Props = { initialGraph: FlowGraph; stats: Record<string, NodeStats> };

export function FlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}

type Selection = { kind: "node" | "edge"; id: string } | null;
type Status = { kind: "idle" | "saving" | "publishing" } | { kind: "ok" | "error"; message: string };

const NODE_W = 260;
const NODE_H = 170;

/** Primeira posição livre (sem sobrepor etapas) a partir de `start`, descendo em passos. */
function freeSpot(nodes: EditorNode[], start: { x: number; y: number }) {
  const hits = (p: { x: number; y: number }) =>
    nodes.some((n) => {
      const w = n.measured?.width ?? NODE_W;
      const h = n.measured?.height ?? NODE_H;
      return p.x < n.position.x + w + 24 && p.x + NODE_W + 24 > n.position.x && p.y < n.position.y + h + 24 && p.y + NODE_H + 24 > n.position.y;
    });
  for (let i = 0; i < 40; i++) {
    const p = { x: start.x, y: start.y + i * 60 };
    if (!hits(p)) return p;
  }
  return start;
}

const toolBtn =
  "flex items-center gap-2 border-2 px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Editor({ initialGraph, stats }: Props) {
  const initial = useMemo(() => graphToEditor(initialGraph), [initialGraph]);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<EditorNode>(initial.nodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<EditorEdge>(initial.edges);
  const [selection, setSelection] = useState<Selection>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewGraph, setPreviewGraph] = useState<FlowGraph | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const { screenToFlowPosition } = useReactFlow();

  const busy = status.kind === "saving" || status.kind === "publishing";

  /** Marca alteração pendente e limpa a mensagem anterior de salvar/publicar. */
  const touch = useCallback(() => {
    setDirty(true);
    setStatus((s) => (s.kind === "ok" || s.kind === "error" ? { kind: "idle" } : s));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<EditorNode>[]) => {
      if (changes.some((c) => c.type === "position" && c.dragging)) touch();
      onNodesChangeBase(changes);
    },
    [onNodesChangeBase, touch],
  );
  const onEdgesChange = useCallback((changes: EdgeChange<EditorEdge>[]) => onEdgesChangeBase(changes), [onEdgesChangeBase]);

  const selectEdge = useCallback(
    (id: string) => {
      setSelection({ kind: "edge", id });
      setEdges((es) => es.map((e) => ({ ...e, selected: e.id === id })));
      setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
    },
    [setEdges, setNodes],
  );

  // Dados só de renderização (callback do rótulo, ordem entre irmãs); nunca persistidos.
  const renderedEdges = useMemo(() => {
    const counts: Record<string, number> = {};
    const seen: Record<string, number> = {};
    for (const e of edges) counts[e.source] = (counts[e.source] ?? 0) + 1;
    return edges.map((e) => {
      seen[e.source] = (seen[e.source] ?? 0) + 1;
      return {
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: e.selected ? "#d7141a" : "#0b0b0b", width: 18, height: 18 },
        data: {
          requiredTags: e.data?.requiredTags ?? [],
          onLabelClick: selectEdge,
          order: seen[e.source],
          siblings: counts[e.source],
          share: stats[e.source]?.next[e.target],
        },
      };
    });
  }, [edges, selectEdge, stats]);

  const isValidConnection = useCallback(
    (c: Connection | EditorEdge) => {
      if (c.source === c.target) return false;
      const target = nodes.find((n) => n.id === c.target);
      if (!target || target.type === "intro") return false;
      return !edges.some((e) => e.source === c.source && e.target === c.target);
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      const edge = toEditorEdge({ id: newId("e"), from: c.source, to: c.target, requiredTags: [] });
      setEdges((es) => [...es, edge]);
      touch();
    },
    [setEdges, touch],
  );

  function updateNodeData(id: string, data: EditorNode["data"]) {
    setNodes((ns) => ns.map((n) => (n.id === id ? ({ ...n, data } as EditorNode) : n)));
    touch();
  }

  function addNode(type: "choice" | "outcome") {
    const el = document.querySelector(".rocha-flow .react-flow");
    const rect = el?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 0, y: 0 };
    const position = freeSpot(nodes, { x: center.x - 130, y: center.y - 70 });
    const id = newId(type === "choice" ? "q" : "out");
    const node: EditorNode =
      type === "choice"
        ? {
            id,
            type,
            position,
            deletable: false,
            selected: true,
            data: { question: "Nova pergunta", options: [{ id: newId("o"), label: "Opção 1", tags: [] }] },
          }
        : {
            id,
            type,
            position,
            deletable: false,
            selected: true,
            data: { title: "Novo resultado", body: "", qualified: false },
          };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
    setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
    setSelection({ kind: "node", id });
    touch();
  }

  function deleteNode(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelection(null);
    touch();
  }

  function deleteEdge(id: string) {
    setEdges((es) => es.filter((e) => e.id !== id));
    setSelection(null);
    touch();
  }

  function toggleEdgeTag(id: string, tag: string) {
    setEdges((es) =>
      es.map((e) => {
        if (e.id !== id) return e;
        const cur = e.data?.requiredTags ?? [];
        const requiredTags = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
        return { ...e, data: { ...e.data, requiredTags } };
      }),
    );
    touch();
  }

  /** Move a seta entre as saídas do mesmo nó (muda a prioridade). */
  function moveEdge(id: string, dir: -1 | 1) {
    setEdges((es) => {
      const edge = es.find((e) => e.id === id);
      if (!edge) return es;
      const siblings = es.map((e, i) => ({ e, i })).filter((x) => x.e.source === edge.source);
      const pos = siblings.findIndex((x) => x.e.id === id);
      const other = siblings[pos + dir];
      if (!other) return es;
      const out = [...es];
      out[siblings[pos].i] = other.e;
      out[other.i] = edge;
      return out;
    });
    touch();
  }

  async function save(): Promise<boolean> {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/admin/flow-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph: editorToGraph(nodes, edges) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setStatus({ kind: "error", message: data?.error ?? "Não foi possível salvar o rascunho." });
        return false;
      }
      setDirty(false);
      setStatus({ kind: "ok", message: "Rascunho salvo." });
      return true;
    } catch {
      setStatus({ kind: "error", message: "Sem conexão. O rascunho não foi salvo." });
      return false;
    }
  }

  async function publish() {
    setConfirmPublish(false);
    if (!(await save())) return;
    setStatus({ kind: "publishing" });
    try {
      const res = await fetch("/api/admin/flow-publish", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setStatus({ kind: "error", message: data?.error ?? "Não foi possível publicar." });
        return;
      }
      setStatus({ kind: "ok", message: "Publicado! O formulário público já usa esta versão." });
    } catch {
      setStatus({ kind: "error", message: "Sem conexão. O fluxo não foi publicado." });
    }
  }

  const selectedNode = selection?.kind === "node" ? nodes.find((n) => n.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === "edge" ? edges.find((e) => e.id === selection.id) : undefined;
  const outcomeCount = nodes.filter((n) => n.type === "outcome").length;
  const nameOf = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? nodeTitle({ ...n, data: n.data } as Parameters<typeof nodeTitle>[0]) || n.id : id;
  };

  let edgeOrder = 0;
  let edgeSiblings = 0;
  if (selectedEdge) {
    const sib = edges.filter((e) => e.source === selectedEdge.source);
    edgeSiblings = sib.length;
    edgeOrder = sib.findIndex((e) => e.id === selectedEdge.id) + 1;
  }

  return (
    <section aria-label="Editor de fluxo" className="flex h-dvh flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-ink px-4 py-2 text-paper">
        <Link href="/admin" className="mr-2 text-sm font-semibold text-muted-dark transition hover:text-paper">
          ← Leads
        </Link>
        <span className="mr-auto font-display text-xl uppercase tracking-wide">Editor de fluxo</span>
        <button type="button" onClick={() => addNode("choice")} className={`${toolBtn} border-paper hover:border-red hover:bg-red`}>
          + Pergunta
        </button>
        <button type="button" onClick={() => addNode("outcome")} className={`${toolBtn} border-paper hover:border-red hover:bg-red`}>
          + Resultado
        </button>
        <button
          type="button"
          onClick={() => setPreviewGraph(editorToGraph(nodes, edges))}
          className={`${toolBtn} border-paper hover:border-red hover:bg-red`}
        >
          Pré-visualizar
        </button>
        <button type="button" disabled={busy} onClick={save} className={`${toolBtn} border-paper bg-paper text-ink hover:bg-paper-2`}>
          {status.kind === "saving" && <span className="spinner" aria-hidden />}
          {status.kind === "saving" ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmPublish(true)}
          className={`${toolBtn} border-red bg-red text-paper hover:border-red-hover hover:bg-red-hover`}
        >
          {status.kind === "publishing" && <span className="spinner" aria-hidden />}
          {status.kind === "publishing" ? "Publicando..." : "Publicar"}
        </button>
      </div>

      <div
        aria-live="polite"
        className={`flex min-h-8 items-center gap-3 border-b-2 border-ink px-4 py-1 text-xs font-semibold ${
          status.kind === "error" ? "bg-red text-paper" : "bg-paper"
        }`}
      >
        {status.kind === "ok" || status.kind === "error" ? <span>{status.message}</span> : null}
        {dirty ? (
          <span className={status.kind === "error" ? "" : "text-red"}>● Alterações não salvas</span>
        ) : (
          <span className={status.kind === "error" ? "" : "text-muted"}>Rascunho sem alterações pendentes</span>
        )}
        <span className={`ml-auto hidden md:inline ${status.kind === "error" ? "" : "text-muted"}`}>
          Arraste da bolinha à direita de uma etapa até outra para conectar · clique no rótulo da seta para editar
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="rocha-flow relative min-w-0 flex-1">
          <StatsContext.Provider value={stats}>
            <ReactFlow<EditorNode, EditorEdge>
              nodes={nodes}
              edges={renderedEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onNodeClick={(_, n) => setSelection({ kind: "node", id: n.id })}
              onEdgeClick={(_, e) => selectEdge(e.id)}
              onPaneClick={() => setSelection(null)}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeStrokeWidth={3} />
            </ReactFlow>
          </StatsContext.Provider>
        </div>

        {selectedNode && (
          <NodePanel
            key={selectedNode.id}
            node={selectedNode}
            canDelete={!(selectedNode.type === "outcome" && outcomeCount <= 1)}
            deleteHint={selectedNode.type === "outcome" ? "O fluxo precisa de ao menos 1 resultado." : undefined}
            onChange={(data) => updateNodeData(selectedNode.id, data)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelection(null)}
          />
        )}
        {selectedEdge && (
          <EdgePanel
            key={selectedEdge.id}
            edge={selectedEdge}
            fromName={nameOf(selectedEdge.source)}
            toName={nameOf(selectedEdge.target)}
            tags={allTags({ nodes: editorToGraph(nodes, edges).nodes })}
            order={edgeOrder}
            siblings={edgeSiblings}
            onToggleTag={(t) => toggleEdgeTag(selectedEdge.id, t)}
            onMove={(d) => moveEdge(selectedEdge.id, d)}
            onDelete={() => deleteEdge(selectedEdge.id)}
            onClose={() => setSelection(null)}
          />
        )}
      </div>

      {previewGraph && <PreviewModal graph={previewGraph} onClose={() => setPreviewGraph(null)} />}

      {confirmPublish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={() => setConfirmPublish(false)}
        >
          <div className="w-full max-w-sm border-t-4 border-red bg-paper p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="publish-title" className="font-display text-2xl uppercase leading-none">
              Publicar fluxo?
            </h2>
            <p className="mt-3 text-sm text-muted">
              O rascunho será salvo e passará a ser usado imediatamente pelo formulário público em /aplicacao.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmPublish(false)}
                className="border-2 border-ink px-4 py-2 text-sm font-semibold transition hover:bg-paper-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={publish}
                className="bg-red px-4 py-2 text-sm font-semibold text-paper transition hover:bg-red-hover"
              >
                Publicar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
