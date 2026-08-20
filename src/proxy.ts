import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Next 16 chama de Proxy o que antes era Middleware.
 *
 * Duas funções aqui, nesta ordem:
 *
 * 1. **Renovar a sessão.** Server Component não pode gravar cookie, então é
 *    aqui que o token renovado é gravado — sem isso a pessoa é deslogada
 *    quando o access token vence, mesmo com refresh token válido.
 * 2. **Barrar rota privada.** `getClaims()` valida a assinatura do JWT; com
 *    chave assimétrica isso é verificação local contra o JWKS em cache, não uma
 *    ida ao servidor de auth a cada navegação.
 *
 * Continua sendo triagem: a checagem que vale é a do DAL
 * (`requireGroupAccess` em `features/auth/queries.ts`), porque só ela sabe de
 * papel dentro do grupo.
 */

/**
 * Rotas que exigem sessão — e a lista curta é de propósito.
 *
 * Ficam de fora as três rotas que existem justamente pra quem não tem conta:
 * `/r/**` (página pública da rodada), `/p/**` (link pessoal do jogador) e
 * `/e/**` (link de convidado do grupo). Nessas três quem autoriza é o token,
 * não o cookie — ver `requireAcessoPorLinkPessoal` e
 * `requireAcessoPorLinkDeConvidado` em `features/auth/queries.ts`.
 */
const PROTEGIDAS = [/^\/g(\/|$)/, /^\/novo(\/|$)/];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const resposta = NextResponse.next({ request });

  // Sem Supabase configurado o app não autentica ninguém; deixar passar aqui
  // faria a tela de login explicar o que falta, em vez de dar erro 500 opaco.
  if (!supabaseConfigurado) return resposta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value, options } of cookiesParaGravar) {
          // No request pra quem for renderizar agora; na resposta pro browser.
          request.cookies.set(name, value);
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && PROTEGIDAS.some((padrao) => padrao.test(pathname))) {
    const login = new URL("/entrar", request.url);
    login.searchParams.set("proximo", `${pathname}${search}`);
    const redirecionamento = NextResponse.redirect(login);
    // Cookie renovado precisa ir junto no redirect, senão a renovação se perde.
    for (const cookie of resposta.cookies.getAll()) {
      redirecionamento.cookies.set(cookie);
    }
    return redirecionamento;
  }

  return resposta;
}

export const config = {
  // Fora: assets, manifest, service worker e ícones — nada disso depende de sessão.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|.*\\.png$).*)",
  ],
};
