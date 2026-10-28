import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rocha_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET não está definida.");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Comparação em tempo constante. */
function safeEqual(input: string, expected: string): boolean {
  const a = new TextEncoder().encode(input);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Usuário do painel: ADMIN_USERNAME, ou "admin" se não estiver definido. */
export function adminUsername(): string {
  return process.env.ADMIN_USERNAME?.trim() || "admin";
}

/** Confere usuário (sem diferenciar maiúsculas) e senha. */
export function credentialsMatch(username: string, password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;
  const userOk = safeEqual(username.trim().toLowerCase(), adminUsername().toLowerCase());
  const passOk = safeEqual(password, expectedPassword);
  return userOk && passOk;
}
