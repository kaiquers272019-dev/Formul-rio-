// Lógica pura do fluxo. NÃO importe Prisma (nem nada de servidor) aqui:
// este módulo também é usado por componentes client.

export type Position = { x: number; y: number };
export type StepOption = { id: string; label: string; tags: string[] };

export type IntroNode = {
  id: string;
  type: "intro";
  position: Position;
  data: { title: string; body: string };
};
export type ContactNode = {
  id: string;
  type: "contact";
  position: Position;
  data: { question: string; help: string };
};
export type ChoiceNode = {
  id: string;
  type: "choice";
  position: Position;
  data: { question: string; options: StepOption[] };
};
export type OutcomeNode = {
  id: string;
  type: "outcome";
  position: Position;
  data: { title: string; body: string; qualified: boolean };
};

export type FlowNode = IntroNode | ContactNode | ChoiceNode | OutcomeNode;
export type FlowNodeType = FlowNode["type"];
export type FlowEdge = { id: string; from: string; to: string; requiredTags: string[] };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[]; entryNodeId: string };

export const NODE_TYPE_LABEL: Record<FlowNodeType, string> = {
  intro: "Introdução",
  contact: "Nome + telefone",
  choice: "Pergunta",
  outcome: "Fim",
};

export function findNode(graph: FlowGraph, nodeId: string): FlowNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

/**
 * Regra única de transição: vale a primeira seta (na ordem) cujas requiredTags
 * estão todas nas tags do lead; se nenhuma bater, vale a última como padrão.
 */
export function resolveNextNode(
  graph: FlowGraph,
  fromNodeId: string,
  tags: readonly string[],
): FlowEdge | null {
  const outgoing = graph.edges.filter((e) => e.from === fromNodeId);
  if (!outgoing.length) return null;
  const set = new Set(tags);
  return (
    outgoing.find((e) => e.requiredTags.every((t) => set.has(t))) ??
    outgoing[outgoing.length - 1]
  );
}

export function mergeTags(current: readonly string[], add: readonly string[]): string[] {
  const out = [...current];
  for (const t of add) if (!out.includes(t)) out.push(t);
  return out;
}

/** Texto curto usado no rótulo da seta. */
export function edgeLabel(requiredTags: readonly string[]): string {
  return requiredTags.length ? requiredTags.join(" + ") : "sempre";
}

/** Todas as tags existentes nas opções das perguntas, sem duplicar, na ordem em que aparecem. */
export function allTags(graph: Pick<FlowGraph, "nodes">): string[] {
  const out: string[] = [];
  for (const n of graph.nodes) {
    if (n.type !== "choice") continue;
    for (const o of n.data.options) for (const t of o.tags) if (!out.includes(t)) out.push(t);
  }
  return out;
}

export function nodeTitle(node: FlowNode): string {
  switch (node.type) {
    case "intro":
    case "outcome":
      return node.data.title;
    case "contact":
    case "choice":
      return node.data.question;
  }
}

// ---------------------------------------------------------------------------
// Validação

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const isPos = (v: unknown): v is Position =>
  isObj(v) && typeof v.x === "number" && typeof v.y === "number";

function isOption(v: unknown): v is StepOption {
  return isObj(v) && isStr(v.id) && isStr(v.label) && isStrArr(v.tags);
}

function isNode(v: unknown): v is FlowNode {
  if (!isObj(v) || !isStr(v.id) || !isPos(v.position) || !isObj(v.data)) return false;
  const d = v.data;
  switch (v.type) {
    case "intro":
      return isStr(d.title) && isStr(d.body);
    case "contact":
      return isStr(d.question) && isStr(d.help);
    case "choice":
      return isStr(d.question) && Array.isArray(d.options) && d.options.every(isOption);
    case "outcome":
      return isStr(d.title) && isStr(d.body) && typeof d.qualified === "boolean";
    default:
      return false;
  }
}

function isEdge(v: unknown): v is FlowEdge {
  return isObj(v) && isStr(v.id) && isStr(v.from) && isStr(v.to) && isStrArr(v.requiredTags);
}

/** Checagem estrutural (formato). */
export function isFlowGraph(v: unknown): v is FlowGraph {
  return (
    isObj(v) &&
    isStr(v.entryNodeId) &&
    Array.isArray(v.nodes) &&
    v.nodes.every(isNode) &&
    Array.isArray(v.edges) &&
    v.edges.every(isEdge)
  );
}

/** Checagem de regras do grafo. Retorna a primeira mensagem de erro ou null. */
export function validateFlowGraph(graph: FlowGraph): string | null {
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    if (ids.has(n.id)) return `Id de etapa repetido: ${n.id}.`;
    ids.add(n.id);
  }
  const intros = graph.nodes.filter((n) => n.type === "intro");
  if (intros.length !== 1) return "O fluxo precisa ter exatamente 1 etapa de Introdução.";
  if (graph.entryNodeId !== intros[0].id) return "O fluxo precisa começar pela Introdução.";
  if (graph.nodes.filter((n) => n.type === "contact").length > 1)
    return "O fluxo só pode ter 1 etapa de Nome + telefone.";
  if (!graph.nodes.some((n) => n.type === "outcome"))
    return "O fluxo precisa ter ao menos 1 etapa de Fim.";
  for (const e of graph.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) return "Existe uma conexão apontando para uma etapa inexistente.";
    if (e.from === e.to) return "Uma conexão não pode ligar a etapa a ela mesma.";
  }
  for (const n of graph.nodes) {
    if (n.type === "outcome") {
      if (graph.edges.some((e) => e.from === n.id))
        return `A etapa de Fim "${nodeTitle(n) || n.id}" não pode ter saída.`;
      continue;
    }
    if (!graph.edges.some((e) => e.from === n.id))
      return `A etapa "${nodeTitle(n) || NODE_TYPE_LABEL[n.type]}" não tem nenhuma conexão de saída.`;
    if (n.type === "choice") {
      if (!n.data.options.length) return `A pergunta "${nodeTitle(n)}" precisa de ao menos 1 opção.`;
      if (n.data.options.some((o) => !o.label.trim()))
        return `A pergunta "${nodeTitle(n)}" tem uma opção sem texto.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ids

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

// ---------------------------------------------------------------------------
// Formato antigo (listas) → grafo

/**
 * Formato antigo salvo em FlowConfig.steps: perguntas em sequência e resultados
 * escolhidos pelo primeiro cujas requiredTags estão todas nas tags do lead
 * (o último resultado é o padrão).
 */
export type LegacyFlow = {
  intro: { title: string; body: string };
  contact: { question: string; help: string };
  questions: { id: string; question: string; options: StepOption[] }[];
  outcomes: { id: string; title: string; body: string; qualified: boolean; requiredTags: string[] }[];
};

export function isLegacyFlow(v: unknown): v is LegacyFlow {
  return (
    isObj(v) &&
    Array.isArray(v.questions) &&
    Array.isArray(v.outcomes) &&
    isObj(v.intro) &&
    isObj(v.contact)
  );
}

/** Lógica de roteamento do formato antigo (mantida para teste de equivalência). */
export function resolveLegacyOutcome(flow: LegacyFlow, tags: readonly string[]) {
  const set = new Set(tags);
  return (
    flow.outcomes.find((o) => o.requiredTags.every((t) => set.has(t))) ??
    flow.outcomes[flow.outcomes.length - 1]
  );
}

/** Converte preservando os ids de perguntas, opções e resultados. */
export function legacyToGraph(flow: LegacyFlow): FlowGraph {
  const COL = 320;
  const nodes: FlowNode[] = [
    { id: "intro", type: "intro", position: { x: 0, y: 0 }, data: { ...flow.intro } },
    { id: "contact", type: "contact", position: { x: COL, y: 0 }, data: { ...flow.contact } },
  ];
  const edges: FlowEdge[] = [{ id: "e_intro_contact", from: "intro", to: "contact", requiredTags: [] }];
  let prev = "contact";
  flow.questions.forEach((q, i) => {
    nodes.push({
      id: q.id,
      type: "choice",
      position: { x: COL * (i + 2), y: 0 },
      data: { question: q.question, options: q.options.map((o) => ({ ...o, tags: [...o.tags] })) },
    });
    edges.push({ id: `e_${prev}_${q.id}`, from: prev, to: q.id, requiredTags: [] });
    prev = q.id;
  });
  const outX = COL * (flow.questions.length + 2);
  flow.outcomes.forEach((o, i) => {
    nodes.push({
      id: o.id,
      type: "outcome",
      position: { x: outX, y: i * 200 - ((flow.outcomes.length - 1) * 200) / 2 },
      data: { title: o.title, body: o.body, qualified: o.qualified },
    });
    edges.push({ id: `e_${prev}_${o.id}`, from: prev, to: o.id, requiredTags: [...o.requiredTags] });
  });
  return { nodes, edges, entryNodeId: "intro" };
}

// ---------------------------------------------------------------------------
// Fluxo padrão

export const DEFAULT_FLOW: FlowGraph = {
  entryNodeId: "intro",
  nodes: [
    {
      id: "intro",
      type: "intro",
      position: { x: 0, y: 0 },
      data: {
        title: "Sua evolução começa aqui",
        body: "Responda algumas perguntas rápidas para descobrirmos o melhor caminho para você na Rocha Academy. Leva menos de 1 minuto.",
      },
    },
    {
      id: "contact",
      type: "contact",
      position: { x: 320, y: 0 },
      data: { question: "Qual seu nome e telefone?", help: "Preencha seus dados para contato." },
    },
    {
      id: "q_objetivo",
      type: "choice",
      position: { x: 640, y: 0 },
      data: {
        question: "Qual é o seu momento hoje?",
        options: [
          { id: "o_zero", label: "Estou começando do zero", tags: ["iniciante"] },
          { id: "o_evoluir", label: "Já pratico e quero evoluir", tags: ["intermediario"] },
        ],
      },
    },
    {
      id: "q_momento",
      type: "choice",
      position: { x: 960, y: 0 },
      data: {
        question: "Quando você quer começar?",
        options: [
          { id: "o_agora", label: "Agora, quero começar esta semana", tags: ["pronto"] },
          { id: "o_depois", label: "Ainda estou pesquisando", tags: ["pesquisando"] },
        ],
      },
    },
    {
      id: "out_iniciante",
      type: "outcome",
      position: { x: 1420, y: -260 },
      data: {
        title: "Perfeito, temos o plano para você começar!",
        body: "Nossa equipe vai te chamar no WhatsApp em breve para montar seu início na Rocha Academy.",
        qualified: true,
      },
    },
    {
      id: "out_evoluir",
      type: "outcome",
      position: { x: 1420, y: 0 },
      data: {
        title: "Bora para o próximo nível!",
        body: "Um especialista vai falar com você no WhatsApp para indicar o programa ideal para sua evolução.",
        qualified: true,
      },
    },
    {
      id: "out_pesquisando",
      type: "outcome",
      position: { x: 1420, y: 260 },
      data: {
        title: "Obrigado por responder!",
        body: "Vamos te enviar conteúdos para ajudar na sua decisão. Quando estiver pronto, é só chamar.",
        qualified: false,
      },
    },
  ],
  edges: [
    { id: "e_intro_contact", from: "intro", to: "contact", requiredTags: [] },
    { id: "e_contact_q1", from: "contact", to: "q_objetivo", requiredTags: [] },
    { id: "e_q1_q2", from: "q_objetivo", to: "q_momento", requiredTags: [] },
    { id: "e_q2_iniciante", from: "q_momento", to: "out_iniciante", requiredTags: ["iniciante", "pronto"] },
    { id: "e_q2_evoluir", from: "q_momento", to: "out_evoluir", requiredTags: ["intermediario", "pronto"] },
    { id: "e_q2_padrao", from: "q_momento", to: "out_pesquisando", requiredTags: [] },
  ],
};

// ---------------------------------------------------------------------------
// Visitas (analytics)

export type Visit = { nodeId: string; at: string };

export function parseVisited(v: unknown): Visit[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Visit => isObj(x) && isStr(x.nodeId) && isStr(x.at));
}

/** Acrescenta a visita, ignorando se o último item já é o mesmo nó (idempotente em retry). */
export function appendVisited(visited: Visit[], nodeId: string, at: Date = new Date()): Visit[] {
  if (visited.length && visited[visited.length - 1].nodeId === nodeId) return visited;
  return [...visited, { nodeId, at: at.toISOString() }];
}
