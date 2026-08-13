import { defineConfig } from "vitest/config";
import path from "node:path";
import "dotenv/config";

/**
 * Testes que falam com o Postgres de verdade.
 *
 * Rodam em série: cada teste limpa o banco antes de começar, e paralelismo
 * aqui viraria teste apagando o cenário do vizinho. No Vitest 4 isso é
 * `fileParallelism: false` + `maxWorkers: 1` (o antigo `poolOptions` sumiu).
 * Sem `DATABASE_URL_TESTE` os arquivos se declaram pulados — ver `src/test/db.ts`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
