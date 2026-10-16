"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { edgeLabel } from "@/lib/flow";
import type { EditorEdge } from "./editor-types";

export function LabeledEdge(props: EdgeProps<EditorEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd } = props;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const tags = data?.requiredTags ?? [];
  const showOrder = (data?.siblings ?? 1) > 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: selected ? "var(--red)" : "var(--ink)", strokeWidth: selected ? 3 : 2 }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          // O rótulo recebe pointer-events; trata o clique aqui mesmo para selecionar a aresta.
          onClick={(e) => {
            e.stopPropagation();
            data?.onLabelClick?.(id);
          }}
          className={`nodrag nopan absolute flex items-center gap-1 border-2 px-2 py-0.5 font-mono text-[11px] font-semibold transition ${
            selected
              ? "border-red bg-red text-paper"
              : tags.length
                ? "border-ink bg-paper text-ink hover:border-red hover:text-red"
                : "border-line bg-paper text-muted hover:border-red hover:text-red"
          }`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
          aria-label={`Conexão: ${edgeLabel(tags)}`}
        >
          {showOrder && <span className="opacity-70">{data?.order}.</span>}
          {edgeLabel(tags)}
          {data?.share !== undefined && (
            <span className="ml-1 border-l border-current pl-1 opacity-80" title="Participação entre os leads que saíram da etapa">
              {Math.round(data.share * 100)}%
            </span>
          )}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { labeled: LabeledEdge };
