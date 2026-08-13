import type { PrismaClient } from "./generated/client";

/**
 * O client que os serviços recebem por parâmetro.
 *
 * Existir esse alias é o que permite testar a camada de dados: em produção
 * entra o singleton de `db/client.ts`; no teste de integração entra um client
 * apontando pro schema de teste.
 */
export type Db = PrismaClient;
