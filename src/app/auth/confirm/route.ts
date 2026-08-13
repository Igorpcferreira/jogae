import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { prisma } from "@/db/client";
import { criarClientDoServidor } from "@/lib/supabase/server";
import { garantirUsuario, lerIdentidade } from "@/features/auth/session";
import { aceitarConvitesPendentes } from "@/features/members/service";

/**
 * Volta do link enviado por e-mail.
 *
 * Separado do `/auth/callback` do Google por um motivo prático: o fluxo PKCE
 * guarda um verificador em cookie, e cookie não atravessa aparelho. Quem pede o
 * link no computador e abre no celular — que é o caso normal — ficaria de fora.
 * O `verifyOtp` com `token_hash` não depende de nada guardado antes.
 */
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const proximo = parametros.get("proximo");

  if (!tokenHash || !tipo) {
    return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
  }

  const supabase = await criarClientDoServidor();
  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
  }

  const identidade = await lerIdentidade();
  if (!identidade) {
    return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
  }

  const usuario = await garantirUsuario(identidade);
  const convites = await aceitarConvitesPendentes(prisma, {
    userId: usuario.id,
    email: usuario.email,
  });

  // `slug` é o nome do grupo, não um caminho: sem o `/g/` o redirect resolveria
  // relativo a `/auth/` e cairia numa rota que não existe.
  const destino = convites.slug
    ? `/g/${convites.slug}`
    : proximo?.startsWith("/") && !proximo.startsWith("//")
      ? proximo
      : "/";

  return NextResponse.redirect(new URL(destino, request.url));
}
