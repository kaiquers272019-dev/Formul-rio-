import { NextResponse } from "next/server";
import { getDraftGraph, publishDraftGraph } from "@/lib/flow-db";
import { validateFlowGraph } from "@/lib/flow";

/** Copia o rascunho para o publicado (o formulário público só muda aqui). */
export async function POST() {
  const error = validateFlowGraph(await getDraftGraph());
  if (error) return NextResponse.json({ error }, { status: 400 });
  await publishDraftGraph();
  return NextResponse.json({ ok: true });
}
