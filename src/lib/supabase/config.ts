/**
 * Onde o Supabase é configurado. Uma fonte só: chave faltando quebra aqui, com
 * nome de variável e tudo, em vez de virar "sessão inválida" três telas depois.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Chave pública (antiga `anon`). Vai pro browser — é o esperado. */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Sem as duas o app não autentica ninguém; a tela de login avisa em vez de estourar. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function exigirConfig(): { url: string; chave: string } {
  if (!supabaseConfigurado) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "precisam estar configuradas — veja .env.example.",
    );
  }
  return { url: SUPABASE_URL, chave: SUPABASE_PUBLISHABLE_KEY };
}
