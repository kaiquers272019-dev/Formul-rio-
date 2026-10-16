import { redirect } from "next/navigation";

// Lead nunca cai numa página interna: / → /aplicacao preservando a query string.
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v !== undefined) qs.append(k, v);
  }
  const s = qs.toString();
  redirect(s ? `/aplicacao?${s}` : "/aplicacao");
}
