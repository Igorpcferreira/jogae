import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, Chip, SectionLabel } from "@/components/ui/primitives";
import { TeamStripe } from "@/components/football/team-card";
import { IconClock, IconPin, JogaeMark } from "@/components/ui/icons";
import { entrarComoJogadorAction } from "@/features/entrada/actions";
import { lerJogadorLembrado } from "@/features/entrada/cookie";
import { getEntradaDoGrupo, jogadorLembradoValido } from "@/features/entrada/queries";
import { formatRoundSchedule, formatTime } from "@/lib/dates";
import { EscolhaDeJogador } from "./_components/escolha-de-jogador";

export const dynamic = "force-dynamic";

/**
 * O link de convidado do grupo: **um** link, colado na conversa do WhatsApp,
 * que serve pros 22.
 *
 * Ele não é um modelo de acesso novo — é um distribuidor. A pessoa diz quem é,
 * o servidor guarda isso no aparelho e a manda pro link pessoal dela, que é
 * quem sempre autorizou a presença (bloco I, opção B). Nada da regra de
 * presença, espera ou goleiro muda por causa desta tela.
 *
 * O que o link **entrega**, e é a decisão de produto por trás dele: quem tem o
 * link vê os nomes do elenco e pode responder no lugar de qualquer um. Num
 * grupo de amigos isso é zoeira, não fraude, e o custo de tratar cada um como
 * suspeito era 22 mensagens no privado toda vez que alguém trocasse de celular.
 * O antídoto pro dia em que o link vazar é a troca do token, na configuração.
 *
 * Invariante do plano §13 continua de pé: nível técnico não é selecionado, não
 * chega no componente e não existe nesta árvore.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const entrada = await getEntradaDoGrupo(token);

  return {
    title: entrada ? `Entrar · ${entrada.grupo.name}` : "Entrar",
    // O link circula no grupo, mas não em buscador: a lista de nomes do elenco
    // não tem por que ser indexada.
    robots: { index: false, follow: false },
  };
}

export default async function PaginaDeEntrada({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ trocar?: string }>;
}) {
  const [{ token }, { trocar }] = await Promise.all([params, searchParams]);

  const entrada = await getEntradaDoGrupo(token);
  // Link revogado ou inventado responde 404 — nunca uma mensagem que confirme
  // que o grupo existe.
  if (!entrada) notFound();

  const { grupo, opcoes, rodada } = entrada;

  // Segunda visita: o aparelho já sabe quem é, então o link do grupo cai direto
  // na página da pessoa. `?trocar=1` é a saída pra quem tocou no nome errado ou
  // emprestou o celular.
  if (!trocar) {
    const lembrado = await jogadorLembradoValido(
      grupo.id,
      await lerJogadorLembrado(grupo.id),
    );
    if (lembrado) redirect(`/p/${lembrado}`);
  }

  return (
    <div className="relative min-h-dvh">
      <div className="texture-grid-lg absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8 lg:py-12">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <JogaeMark size={38} />
            <div>
              <div className="font-display text-[26px] leading-none text-ink">
                {grupo.name}
              </div>
              <div className="mt-1 text-caption uppercase tracking-[0.1em] text-ink-3">
                Confirmar presença
              </div>
            </div>
          </div>
          <TeamStripe className="max-w-32" />
        </header>

        {rodada && (
          <Card className="flex flex-col gap-3 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-[22px] leading-tight text-ink">
                {formatRoundSchedule(rodada.date, rodada.startsAt)}
              </div>
              <Chip tone="green">{rodada.confirmados} confirmados</Chip>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-s text-ink-2">
              {rodada.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin size={15} className="text-ink-3" />
                  {rodada.venue}
                </span>
              )}
              {formatTime(rodada.startsAt ?? rodada.date) && (
                <span className="inline-flex items-center gap-1.5">
                  <IconClock size={15} className="text-ink-3" />
                  {formatTime(rodada.startsAt ?? rodada.date)}
                </span>
              )}
            </div>
          </Card>
        )}

        <section className="flex flex-col gap-3">
          <SectionLabel>Quem é você?</SectionLabel>

          {opcoes.length === 0 ? (
            <Card className="py-6">
              <p className="text-body-s text-ink-2">
                O elenco desse grupo ainda tá vazio. Fala com quem organiza pra
                te colocar na lista.
              </p>
            </Card>
          ) : (
            <>
              <p className="text-body-s text-ink-2">
                Toca no seu nome. Da próxima vez esse link já abre direto na sua
                página.
              </p>
              <EscolhaDeJogador
                acao={entrarComoJogadorAction.bind(null, token)}
                opcoes={opcoes}
              />
            </>
          )}
        </section>

        <p className="text-caption uppercase tracking-[0.06em] text-ink-3">
          Não achou seu nome? Fala com quem organiza o {grupo.name} — só ele
          coloca gente no elenco.
        </p>
      </div>
    </div>
  );
}
