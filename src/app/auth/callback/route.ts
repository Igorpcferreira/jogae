import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/db/client";
import { criarClientDoServidor } from "@/lib/supabase/server";
import { garantirUsuario, lerIdentidade } from "@/features/auth/session";
import { aceitarConvitesPendentes } from "@/features/members/service";

/**
 * Volta do provedor de identidade — Google ou link por e-mail.
 *
 * É o único lugar que casa e-mail com cadastro: aqui o provedor **acabou de
 * confirmar** que a pessoa controla aquele endereço. Depois deste ponto, quem
 * identifica é sempre o `authId` do JWT.
 *
 * Três coisas acontecem, nesta ordem: troca o código pela sessão, garante o
 * `User` do domínio e transforma em vínculo todo convite aberto pro e-mail.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const proximo = request.nextUrl.searchParams.get("proximo");

  if (!code) {
    return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
  }

  const supabase = await criarClientDoServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
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

  // Quem chegou por convite cai direto no grupo pra onde foi chamado. `slug` é
  // o nome do grupo, não um caminho — sem o `/g/` o redirect resolveria
  // relativo a `/auth/` e cairia numa rota que não existe.
  const destino = convites.slug
    ? `/g/${convites.slug}`
    : proximo?.startsWith("/") && !proximo.startsWith("//")
      ? proximo
      : "/";

  return NextResponse.redirect(new URL(destino, request.url));
}
