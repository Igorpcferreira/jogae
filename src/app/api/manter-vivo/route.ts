import { NextResponse } from "next/server";
import { prisma } from "@/db/client";

/**
 * Batida diária que impede o Supabase de pausar o projeto.
 *
 * O plano Free pausa projeto que fica uma semana sem atividade **no banco**, e
 * religar é manual: ninguém acessa e o site fica fora do ar até alguém abrir o
 * painel e clicar. O Jogaê é usado uma ou duas vezes por semana, então sete
 * dias de silêncio é cenário comum — feriado, férias do grupo, recesso.
 *
 * Por isso a consulta é de verdade (`select 1` no Postgres) e não só um 200:
 * o que conta pro Supabase é atividade no banco, não requisição no app. De
 * quebra, mantém uma instância da função morna uma vez por dia.
 *
 * A Vercel manda `Authorization: Bearer $CRON_SECRET` quando essa variável
 * existe no projeto. Sem ela a rota fica aberta — o que ela expõe é um
 * `select 1`, mas configure mesmo assim pra ninguém usar isto de martelo.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  await prisma.$queryRaw`select 1`;

  return NextResponse.json({ ok: true, bancoEmMs: Date.now() - inicio });
}
