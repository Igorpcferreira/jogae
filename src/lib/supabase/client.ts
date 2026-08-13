"use client";

import { createBrowserClient } from "@supabase/ssr";
import { exigirConfig } from "./config";

/**
 * Client do navegador. Só é usado pra começar um login (Google, código por
 * e-mail) — leitura de dado nunca passa por aqui: quem lê é Server Component
 * com Prisma, atrás do DAL.
 */
export function criarClientDoNavegador() {
  const { url, chave } = exigirConfig();
  return createBrowserClient(url, chave);
}
