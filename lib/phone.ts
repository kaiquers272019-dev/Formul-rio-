// Utilitários de telefone (puros; usados no client e no servidor).

export const phoneDigits = (v: string) => v.replace(/\D/g, "");

/** Máscara brasileira enquanto digita: (11) 91234-5678 / (11) 1234-5678. */
export function formatPhoneInput(v: string): string {
  const d = phoneDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Link do WhatsApp; adiciona 55 quando o número tem até 11 dígitos. */
export function whatsappUrl(phone: string): string | null {
  const d = phoneDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}
