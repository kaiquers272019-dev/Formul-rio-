import { NextResponse } from "next/server";
import { getDraftGraph, saveDraftGraph } from "@/lib/flow-db";
import { isFlowGraph, validateFlowGraph } from "@/lib/flow";

export async function GET() {
  return NextResponse.json({ graph: await getDraftGraph() });
}

/** Grava só o rascunho. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { graph?: unknown } | null;
  const graph = body?.graph;
  if (!isFlowGraph(graph)) return NextResponse.json({ error: "Formato de fluxo inválido." }, { status: 400 });
  const error = validateFlowGraph(graph);
  if (error) return NextResponse.json({ error }, { status: 400 });
  await saveDraftGraph(graph);
  return NextResponse.json({ ok: true });
}
