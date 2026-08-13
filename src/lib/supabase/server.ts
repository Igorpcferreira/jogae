import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exigirConfig } from "./config";

/**
 * Client do servidor. Precisa ser criado por requisição porque carrega os
 * cookies daquela requisição — não dá pra guardar num singleton.
 */
export async function criarClientDoServidor() {
  const { url, chave } = exigirConfig();
  const jar = await cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            jar.set(name, value, options);
          }
        } catch {
          // Server Component não pode gravar cookie. Quem renova a sessão é o
          // proxy (`src/proxy.ts`); aqui o silêncio é o comportamento correto.
        }
      },
    },
  });
}

/**
 * Client administrativo, com a chave secreta. Só pra operação que o usuário
 * não pode fazer por si — hoje, disparar o e-mail de convite pelo Supabase.
 *
 * **Nunca** importe isto de componente client: a chave passa por cima de toda
 * política do banco.
 */
export function criarClientAdministrativo() {
  const chaveSecreta = process.env.SUPABASE_SECRET_KEY;
  if (!chaveSecreta) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada — o convite não pode ser enviado.",
    );
  }

  const { url } = exigirConfig();
  return createServerClient(url, chaveSecreta, {
    // Client administrativo não tem sessão de usuário: nada de cookie.
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
