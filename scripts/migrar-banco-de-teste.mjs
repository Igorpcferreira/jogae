/**
 * Aplica as migrations no banco dos testes de integração.
 *
 * O Prisma só lê `DATABASE_URL`; aqui a gente troca a variável pelo valor de
 * `DATABASE_URL_TESTE` e chama `migrate deploy`. Usando um *schema* separado
 * (`?schema=teste`) no mesmo Postgres do dev, não precisa de outro container.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL_TESTE;

if (!url) {
  console.log(
    "DATABASE_URL_TESTE não configurada — pulando. " +
      "Veja .env.example para habilitar os testes de integração.",
  );
  process.exit(0);
}

// `shell: true` porque no Windows o `npx` é um .cmd e o spawn direto não o acha.
// `DIRECT_URL` é apagada de propósito: `prisma.config.ts` dá precedência a ela,
// e sem isso rodar os testes com um .env de produção migraria o banco errado.
const ambiente = { ...process.env };
delete ambiente.DIRECT_URL;
const resultado = spawnSync("npx prisma migrate deploy", {
  stdio: "inherit",
  shell: true,
  env: { ...ambiente, DATABASE_URL: url },
});

process.exit(resultado.status ?? 1);
