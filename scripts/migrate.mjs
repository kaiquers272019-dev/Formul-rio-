// Aplica as migrations no build quando há banco configurado (usa a URL sem pooler se existir).
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  console.log("[migrate] Nenhuma DATABASE_URL definida; migrations puladas.");
} else {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
