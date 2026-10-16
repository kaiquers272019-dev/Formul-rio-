import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDraftGraph } from "@/lib/flow-db";
import { PERIODS, type PeriodKey, computeAnalytics, periodStart } from "@/lib/analytics";
import { AnalyticsBar } from "./AnalyticsBar";
import { FlowEditor } from "./FlowEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fluxo · Rocha Academy" };

export default async function FluxoPage({ searchParams }: PageProps<"/admin/fluxo">) {
  const { periodo } = await searchParams;
  const key: PeriodKey = typeof periodo === "string" && periodo in PERIODS ? (periodo as PeriodKey) : "30d";
  const since = periodStart(key);

  const [graph, leads] = await Promise.all([
    getDraftGraph(),
    prisma.lead.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      select: { visited: true, completed: true },
    }),
  ]);
  const analytics = computeAnalytics(graph, leads);

  return (
    <div className="flex min-h-dvh flex-col bg-paper-2">
      <AnalyticsBar analytics={analytics} period={key} />
      <FlowEditor initialGraph={graph} stats={analytics.nodes} />
    </div>
  );
}
