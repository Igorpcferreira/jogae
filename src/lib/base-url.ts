import "server-only";

import { headers } from "next/headers";

/**
 * URL pública da aplicação, usada em todo link que sai daqui (magic link,
 * convite, link público da rodada).
 *
 * `NEXT_PUBLIC_APP_URL` manda quando existe — em produção é o domínio real e
 * não dá pra confiar no `Host` da requisição pra montar link de acesso. Sem
 * ela, cai no host da requisição, o que faz localhost e preview funcionarem.
 */
export async function urlBase(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_APP_URL;
  if (configurada) return configurada.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
