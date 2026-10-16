import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/leads/[id]">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { contacted?: unknown } | null;
  if (typeof body?.contacted !== "boolean") {
    return NextResponse.json({ error: "Campo contacted (boolean) é obrigatório." }, { status: 400 });
  }
  const result = await prisma.lead.updateMany({ where: { id }, data: { contacted: body.contacted } });
  if (!result.count) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, contacted: body.contacted });
}
