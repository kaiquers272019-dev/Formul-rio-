import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { getPublishedGraph } from "@/lib/flow-db";
import { appendVisited, findNode, mergeTags, parseVisited, resolveNextNode } from "@/lib/flow";

type Body = {
  id?: unknown;
  origin?: unknown;
  name?: unknown;
  phone?: unknown;
  currentNodeId?: unknown;
  optionId?: unknown;
};

type Answers = Record<string, { optionId: string; label: string }>;

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) || null : undefined;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body.currentNodeId !== "string") return bad("currentNodeId é obrigatório.");

  // 1. Sempre o grafo publicado.
  const graph = await getPublishedGraph();
  const node = findNode(graph, body.currentNodeId);
  if (!node) return bad("Etapa inexistente.");
  if (node.type === "outcome") return bad("Esta etapa já é o final do fluxo.");

  // 2. Lead existente (se vier id).
  const existing =
    typeof body.id === "string" && body.id ? await prisma.lead.findUnique({ where: { id: body.id } }) : null;
  if (typeof body.id === "string" && body.id && !existing) return bad("Lead não encontrado.", 404);

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 30);
  if (node.type === "contact" && (!name || !phone)) return bad("Informe nome e telefone.");

  let answers: Answers = (existing?.answers as Answers | null) ?? {};
  let tags = existing?.tags ?? [];

  // 3. Resposta de pergunta.
  if (node.type === "choice") {
    const option = node.data.options.find((o) => o.id === body.optionId);
    if (!option) return bad("Opção inválida.");
    answers = { ...answers, [node.id]: { optionId: option.id, label: option.label } };
    tags = mergeTags(tags, option.tags);
  }

  // 4. Próxima etapa calculada no servidor.
  const edge = resolveNextNode(graph, node.id, tags);
  const next = edge ? findNode(graph, edge.to) : undefined;
  if (!edge || !next) {
    return bad(`O fluxo publicado não tem saída válida a partir da etapa "${node.id}".`, 500);
  }

  // 5. Log de visitas (idempotente).
  const now = new Date();
  let visited = parseVisited(existing?.visited);
  visited = appendVisited(visited, node.id, now);
  visited = appendVisited(visited, next.id, now);

  const data: Prisma.LeadUncheckedCreateInput = {
    answers: answers as Prisma.InputJsonValue,
    tags,
    visited: visited as unknown as Prisma.InputJsonValue,
    currentStep: next.id,
  };
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;

  // 6. Chegou num resultado.
  if (next.type === "outcome") {
    data.completed = true;
    data.qualified = next.data.qualified;
    data.status = next.data.qualified ? "hot" : "frio";
    data.outcomeId = next.id;
  }

  const lead = existing
    ? await prisma.lead.update({ where: { id: existing.id }, data })
    : await prisma.lead.create({ data: { ...data, origin: clean(body.origin, 60) ?? null } });

  // 7.
  return NextResponse.json({
    id: lead.id,
    nextNode: next,
    ...(next.type === "outcome" ? { outcome: { id: next.id, qualified: next.data.qualified } } : {}),
  });
}
