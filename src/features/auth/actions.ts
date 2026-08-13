"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClientDoServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/base-url";

/**
 * Entradas do app. Quem valida credencial é o Supabase; o que sobra aqui é
 * montar o destino de volta e traduzir erro pra português.
 */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Esse e-mail não parece certo."));

export type EstadoLogin =
  | { status: "inicial" }
  | { status: "erro"; mensagem: string }
  | { status: "enviado"; email: string };

/** Para onde voltar depois de entrar. Só caminho interno — nada de open redirect. */
function destinoSeguro(proximo: unknown): string {
  const texto = typeof proximo === "string" ? proximo : "";
  return texto.startsWith("/") && !texto.startsWith("//") ? texto : "/";
}

/**
 * Google é o caminho principal: um toque, sem sair do app.
 *
 * O `signInWithOAuth` do client de servidor grava o cookie do PKCE e devolve a
 * URL do provedor — o `redirect` do Next leva a pessoa até lá.
 */
export async function entrarComGoogleAction(formData: FormData): Promise<void> {
  const proximo = destinoSeguro(formData.get("proximo"));
  const supabase = await criarClientDoServidor();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await urlBase()}/auth/callback?proximo=${encodeURIComponent(proximo)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/entrar?erro=google`);
  }
  // `redirect` lança — tem que ficar fora de try/catch pra não ser engolido.
  redirect(data.url);
}

/**
 * Alternativa por e-mail, pra quem não usa Google — e é por onde entra quem foi
 * convidado com um e-mail corporativo. A resposta é a mesma pra cadastrado e
 * pra desconhecido: não é aqui que se descobre quem tem conta.
 */
export async function entrarComEmailAction(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const analise = emailSchema.safeParse(formData.get("email"));
  if (!analise.success) {
    return { status: "erro", mensagem: analise.error.issues[0].message };
  }

  const proximo = destinoSeguro(formData.get("proximo"));
  const supabase = await criarClientDoServidor();

  // Aponta pro `/auth/confirm` (token_hash), não pro callback do OAuth: o link
  // do e-mail é aberto no celular com frequência, e o verificador do PKCE ficou
  // no computador onde o pedido foi feito.
  const { error } = await supabase.auth.signInWithOtp({
    email: analise.data,
    options: {
      emailRedirectTo: `${await urlBase()}/auth/confirm?proximo=${encodeURIComponent(proximo)}`,
    },
  });

  if (error) {
    // O Supabase já limita envio por e-mail e por IP; a mensagem dele é técnica.
    const excedeu = error.status === 429;
    return {
      status: "erro",
      mensagem: excedeu
        ? "Muitos pedidos seguidos. Espere uns minutos e tente de novo."
        : "Não consegui mandar o e-mail agora. Tenta de novo em instantes.",
    };
  }

  return { status: "enviado", email: analise.data };
}

export async function sairAction(): Promise<void> {
  const supabase = await criarClientDoServidor();
  await supabase.auth.signOut();
  redirect("/");
}
