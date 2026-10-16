import type { Metadata } from "next";
import { getPublishedGraph } from "@/lib/flow-db";
import { Wizard } from "./Wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Aplicação · Rocha Academy" };

export default async function AplicacaoPage({ searchParams }: PageProps<"/aplicacao">) {
  const { origin } = await searchParams;
  const graph = await getPublishedGraph();
  const o = Array.isArray(origin) ? origin[0] : origin;
  return <Wizard graph={graph} origin={o?.slice(0, 60) ?? null} />;
}
