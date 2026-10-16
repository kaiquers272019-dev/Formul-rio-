// Datas no fuso de Brasília (UTC-3, sem horário de verão desde 2019).
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** Início do dia (00:00 em Brasília) que contém `d`, deslocado em `days` dias. */
export function startOfDayBR(d: Date = new Date(), days = 0): Date {
  const local = new Date(d.getTime() - OFFSET_MS);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days);
  return new Date(start + OFFSET_MS);
}

export const formatDateTimeBR = (d: Date) =>
  d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
