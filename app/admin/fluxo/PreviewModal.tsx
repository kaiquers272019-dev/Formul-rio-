"use client";

import { useEffect, useState } from "react";
import { type FlowGraph, findNode, mergeTags, resolveNextNode } from "@/lib/flow";
import { StepView } from "@/components/StepView";
import { FormShell } from "@/components/FormShell";

/** Simula o rascunho em memória — nenhuma chamada de rede, nenhum lead criado. */
export function PreviewModal({ graph, onClose }: { graph: FlowGraph; onClose: () => void }) {
  const [nodeId, setNodeId] = useState(graph.entryNodeId);
  const [tags, setTags] = useState<string[]>([]);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [run, setRun] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const node = findNode(graph, nodeId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function go(nextTags: string[]) {
    if (!node) return;
    const edge = resolveNextNode(graph, node.id, nextTags);
    const next = edge && findNode(graph, edge.to);
    if (!next) {
      setError("Esta etapa não tem conexão de saída. Ligue-a a outra etapa no editor.");
      return;
    }
    setError(null);
    setTags(nextTags);
    if (node.type !== "intro" && next.type !== "outcome") setQuestionNumber((n) => n + 1);
    setNodeId(next.id);
  }

  function restart() {
    setNodeId(graph.entryNodeId);
    setTags([]);
    setQuestionNumber(1);
    setError(null);
    setRun((r) => r + 1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pré-visualização do rascunho"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      <div className="flex max-h-full w-full max-w-md flex-col border-2 border-ink bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-2">
          <div>
            <p className="font-display text-lg uppercase leading-none">Pré-visualização</p>
            <p className="text-[11px] text-muted">Rascunho em memória · não cria leads</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restart}
              className="border-2 border-ink px-3 py-1 text-xs font-semibold transition hover:border-red hover:text-red"
            >
              Recomeçar simulação
            </button>
            <button type="button" onClick={onClose} aria-label="Fechar" className="px-2 text-2xl leading-none hover:text-red">
              ×
            </button>
          </div>
        </div>
        <div className="overflow-y-auto">
          <FormShell className="min-h-[560px]">
            {node ? (
              <StepView
                key={`${run}-${node.id}`}
                node={node}
                questionNumber={questionNumber}
                busy={false}
                error={error}
                onStart={() => go(tags)}
                onContact={() => go(tags)}
                onChoose={(optionId) => {
                  if (node.type !== "choice") return;
                  const opt = node.data.options.find((o) => o.id === optionId);
                  go(mergeTags(tags, opt?.tags ?? []));
                }}
              />
            ) : (
              <p className="text-muted-dark">A etapa inicial não existe.</p>
            )}
          </FormShell>
        </div>
        <p className="border-t-2 border-ink px-4 py-2 font-mono text-[11px] text-muted">
          tags: {tags.length ? tags.join(", ") : "(nenhuma)"}
        </p>
      </div>
    </div>
  );
}
