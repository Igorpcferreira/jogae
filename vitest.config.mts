import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Suíte padrão: domínio puro, sem banco e sem rede. Roda em qualquer máquina.
 * Os testes de integração vivem em `vitest.integration.mts` — precisam de
 * Postgres e por isso ficam fora daqui.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
