// Somente servidor: leitura e escrita do fluxo no banco.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { DEFAULT_FLOW, type FlowGraph, isFlowGraph, isLegacyFlow, legacyToGraph } from "@/lib/flow";

const ID = "default";
const toJson = (g: FlowGraph) => g as unknown as Prisma.InputJsonValue;

/** Normaliza o JSON salvo: grafo direto ou formato antigo convertido. */
function normalize(raw: unknown): { graph: FlowGraph; migrated: boolean } | null {
  if (isFlowGraph(raw)) return { graph: raw, migrated: false };
  if (isLegacyFlow(raw)) return { graph: legacyToGraph(raw), migrated: true };
  return null;
}

/** Grafo PUBLICADO (o que o formulário público usa). Cria o padrão se o banco estiver vazio. */
export async function getPublishedGraph(): Promise<FlowGraph> {
  const row = await prisma.flowConfig.findUnique({ where: { id: ID } });
  if (!row) {
    await prisma.flowConfig.upsert({
      where: { id: ID },
      create: { id: ID, steps: toJson(DEFAULT_FLOW) },
      update: {},
    });
    return DEFAULT_FLOW;
  }
  const norm = normalize(row.steps);
  if (!norm) return DEFAULT_FLOW;
  if (norm.migrated) {
    // Migração lazy: grava de volta já no formato de grafo.
    await prisma.flowConfig.update({ where: { id: ID }, data: { steps: toJson(norm.graph) } });
  }
  return norm.graph;
}

/** Rascunho do editor; cai no publicado enquanto não houver rascunho. */
export async function getDraftGraph(): Promise<FlowGraph> {
  const published = await getPublishedGraph();
  const row = await prisma.flowConfig.findUnique({ where: { id: ID }, select: { draft: true } });
  if (row?.draft == null) return published;
  const norm = normalize(row.draft);
  if (!norm) return published;
  if (norm.migrated) {
    await prisma.flowConfig.update({ where: { id: ID }, data: { draft: toJson(norm.graph) } });
  }
  return norm.graph;
}

export async function saveDraftGraph(graph: FlowGraph): Promise<void> {
  await prisma.flowConfig.upsert({
    where: { id: ID },
    create: { id: ID, steps: toJson(DEFAULT_FLOW), draft: toJson(graph) },
    update: { draft: toJson(graph) },
  });
}

/** Copia rascunho → publicado (mantém o rascunho). */
export async function publishDraftGraph(): Promise<FlowGraph> {
  const draft = await getDraftGraph();
  await prisma.flowConfig.update({ where: { id: ID }, data: { steps: toJson(draft) } });
  return draft;
}
