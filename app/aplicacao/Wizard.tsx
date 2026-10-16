"use client";

import { useState } from "react";
import { type FlowGraph, type FlowNode, findNode } from "@/lib/flow";
import { StepView } from "@/components/StepView";
import { FormShell } from "@/components/FormShell";

type Payload = { currentNodeId: string; name?: string; phone?: string; optionId?: string };

const NETWORK_ERROR = "Não conseguimos enviar agora. Confira sua conexão e tente de novo.";

export function Wizard({ graph, origin }: { graph: FlowGraph; origin: string | null }) {
  const [node, setNode] = useState<FlowNode | undefined>(() => findNode(graph, graph.entryNodeId));
  const [leadId, setLeadId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [busy, setBusy] = useState(false);
  const [busyOptionId, setBusyOptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });

  async function advance(payload: Payload) {
    if (busy || !node) return;
    setBusy(true);
    setBusyOptionId(payload.optionId ?? null);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: leadId ?? undefined, origin: origin ?? undefined }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; nextNode?: FlowNode; error?: string } | null;
      if (!res.ok || !data?.id || !data.nextNode) {
        setError(res.status >= 500 || !data?.error ? NETWORK_ERROR : data.error);
        return;
      }
      setLeadId(data.id);
      // Conta perguntas já exibidas (contato e perguntas de escolha).
      if (node.type !== "intro" && data.nextNode.type !== "outcome") setQuestionNumber((n) => n + 1);
      setNode(data.nextNode);
      window.scrollTo({ top: 0 });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      setBusyOptionId(null);
    }
  }

  return (
    <FormShell className="min-h-dvh">
      {node ? (
        <StepView
          key={node.id}
          node={node}
          questionNumber={questionNumber}
          busy={busy}
          busyOptionId={busyOptionId}
          error={error}
          initialName={contact.name}
          initialPhone={contact.phone}
          onStart={() => advance({ currentNodeId: node.id })}
          onContact={(name, phone) => {
            setContact({ name, phone });
            advance({ currentNodeId: node.id, name, phone });
          }}
          onChoose={(optionId) => advance({ currentNodeId: node.id, optionId })}
        />
      ) : (
        <p className="text-lg text-muted-dark">Este formulário está indisponível no momento.</p>
      )}
    </FormShell>
  );
}
