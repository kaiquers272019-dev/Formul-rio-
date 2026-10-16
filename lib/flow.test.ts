import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FLOW,
  type FlowGraph,
  type LegacyFlow,
  appendVisited,
  findNode,
  isFlowGraph,
  legacyToGraph,
  mergeTags,
  resolveLegacyOutcome,
  resolveNextNode,
  validateFlowGraph,
} from "./flow";

/** Percorre o grafo escolhendo, em cada pergunta, a opção indicada por pick(nodeId). */
function walk(graph: FlowGraph, pick: (nodeId: string) => string) {
  let nodeId = graph.entryNodeId;
  let tags: string[] = [];
  for (let guard = 0; guard < 100; guard++) {
    const node = findNode(graph, nodeId);
    assert.ok(node, `nó ${nodeId} existe`);
    if (node.type === "outcome") return { outcomeId: node.id, tags };
    if (node.type === "choice") {
      const opt = node.data.options.find((o) => o.id === pick(node.id));
      assert.ok(opt, `opção para ${node.id}`);
      tags = mergeTags(tags, opt.tags);
    }
    const edge = resolveNextNode(graph, nodeId, tags);
    assert.ok(edge, `saída de ${nodeId}`);
    nodeId = edge.to;
  }
  throw new Error("loop");
}

/** Todas as combinações de opções das perguntas de um grafo. */
function combos(graph: FlowGraph): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const n of graph.nodes) {
    if (n.type !== "choice") continue;
    out = out.flatMap((c) => n.data.options.map((o) => ({ ...c, [n.id]: o.id })));
  }
  return out;
}

test("fluxo padrão é válido", () => {
  assert.ok(isFlowGraph(DEFAULT_FLOW));
  assert.equal(validateFlowGraph(DEFAULT_FLOW), null);
});

test("fluxo padrão: cada combinação de respostas cai no resultado esperado", () => {
  const expected: Record<string, string> = {
    "o_zero|o_agora": "out_iniciante",
    "o_evoluir|o_agora": "out_evoluir",
    "o_zero|o_depois": "out_pesquisando",
    "o_evoluir|o_depois": "out_pesquisando",
  };
  const all = combos(DEFAULT_FLOW);
  assert.equal(all.length, 4);
  for (const c of all) {
    const key = `${c.q_objetivo}|${c.q_momento}`;
    assert.equal(walk(DEFAULT_FLOW, (id) => c[id]).outcomeId, expected[key], key);
  }
});

test("resolveNextNode: primeira seta que bate vence; senão a última", () => {
  const g: FlowGraph = {
    entryNodeId: "a",
    nodes: [],
    edges: [
      { id: "1", from: "a", to: "x", requiredTags: ["t1", "t2"] },
      { id: "2", from: "a", to: "y", requiredTags: ["t1"] },
      { id: "3", from: "a", to: "z", requiredTags: ["t9"] },
    ],
  };
  assert.equal(resolveNextNode(g, "a", ["t1", "t2"])?.to, "x");
  assert.equal(resolveNextNode(g, "a", ["t1"])?.to, "y");
  assert.equal(resolveNextNode(g, "a", [])?.to, "z");
  assert.equal(resolveNextNode(g, "b", []), null);
});

test("validação acusa nó sem saída e falta de Fim", () => {
  const g = structuredClone(DEFAULT_FLOW);
  g.edges = g.edges.filter((e) => e.from !== "contact");
  assert.match(validateFlowGraph(g) ?? "", /não tem nenhuma conexão de saída/);
  const g2 = structuredClone(DEFAULT_FLOW);
  g2.nodes = g2.nodes.filter((n) => n.type !== "outcome");
  g2.edges = g2.edges.filter((e) => !e.to.startsWith("out_"));
  assert.match(validateFlowGraph(g2) ?? "", /Fim/);
});

test("appendVisited é idempotente para o mesmo nó em sequência", () => {
  let v = appendVisited([], "intro");
  v = appendVisited(v, "intro");
  v = appendVisited(v, "contact");
  assert.deepEqual(v.map((x) => x.nodeId), ["intro", "contact"]);
});

const LEGACY: LegacyFlow = {
  intro: { title: "Olá", body: "Bem-vindo" },
  contact: { question: "Nome e telefone?", help: "Para contato" },
  questions: [
    {
      id: "q1",
      question: "Você é cliente?",
      options: [
        { id: "q1a", label: "Sim", tags: ["cliente"] },
        { id: "q1b", label: "Não", tags: [] },
      ],
    },
    {
      id: "q2",
      question: "Orçamento?",
      options: [
        { id: "q2a", label: "Alto", tags: ["qualificado"] },
        { id: "q2b", label: "Médio", tags: ["medio"] },
        { id: "q2c", label: "Baixo", tags: [] },
      ],
    },
    {
      id: "q3",
      question: "Urgência?",
      options: [
        { id: "q3a", label: "Já", tags: ["urgente"] },
        { id: "q3b", label: "Depois", tags: [] },
      ],
    },
  ],
  outcomes: [
    { id: "r_vip", title: "VIP", body: "", qualified: true, requiredTags: ["cliente", "qualificado"] },
    { id: "r_urg", title: "Urgente", body: "", qualified: true, requiredTags: ["urgente", "qualificado"] },
    { id: "r_med", title: "Médio", body: "", qualified: false, requiredTags: ["medio"] },
    { id: "r_pad", title: "Padrão", body: "", qualified: false, requiredTags: [] },
  ],
};

test("migração do formato antigo preserva ids e é válida", () => {
  const g = legacyToGraph(LEGACY);
  assert.ok(isFlowGraph(g));
  assert.equal(validateFlowGraph(g), null);
  const ids = g.nodes.map((n) => n.id);
  for (const q of LEGACY.questions) {
    assert.ok(ids.includes(q.id));
    const node = findNode(g, q.id);
    assert.ok(node?.type === "choice");
    assert.deepEqual(node.data.options.map((o) => o.id), q.options.map((o) => o.id));
  }
  for (const o of LEGACY.outcomes) assert.ok(ids.includes(o.id));
});

test("grafo migrado roteia igual à lógica antiga para toda combinação de tags", () => {
  const g = legacyToGraph(LEGACY);
  const all = combos(g);
  assert.equal(all.length, 2 * 3 * 2);
  for (const c of all) {
    const res = walk(g, (id) => c[id]);
    const legacyTags = LEGACY.questions.flatMap(
      (q) => q.options.find((o) => o.id === c[q.id])?.tags ?? [],
    );
    assert.equal(res.outcomeId, resolveLegacyOutcome(LEGACY, legacyTags).id, JSON.stringify(c));
  }
});
