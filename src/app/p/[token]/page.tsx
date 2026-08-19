import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, Chip, SectionLabel } from "@/components/ui/primitives";
import { TeamCard, TeamStripe } from "@/components/football/team-card";
import { IconClock, IconPin, JogaeMark } from "@/components/ui/icons";
import { podeMexerNaPresenca } from "@/domain/attendance/presenca";
import { getPainelDoJogador } from "@/features/presenca/queries";
import { formatRoundSchedule, formatTime } from "@/lib/dates";
import { RespostaDoJogador } from "./_components/resposta-do-jogador";

export const dynamic = "force-dynamic";

/**
 * A porta do jogador (bloco I, opção B): um link pessoal, dois botões, nenhuma
 * conta. O token **é** a credencial — quem tem o link responde por um jogador
 * só, e nada mais.
 *
 * Invariante do plano §13: **nível técnico não aparece aqui**. A tela mostra
 * presença, time e onde é o jogo — nunca a nota. A consulta que alimenta esta
 * página nem seleciona o campo.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const painel = await getPainelDoJogador(token);

  return {
    title: painel ? `Sua presença · ${painel.jogador.group.name}` : "Presença",
    // Link pessoal não entra em buscador, e não vira prévia no grupo do
    // WhatsApp: quem encaminha o link encaminha a presença de outra pessoa.
    robots: { index: false, follow: false },
  };
}

const MOTIVO_FECHADO: Record<string, string> = {
  LIVE: "O jogo já começou. Fala direto com quem tá organizando.",
  FINISHED: "Essa rodada já acabou.",
  CANCELLED: "Essa rodada foi cancelada.",
};

export default async function PaginaDoJogador({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const painel = await getPainelDoJogador(token);
  // Link inválido, revogado ou de jogador inativado responde 404 — nunca uma
  // mensagem que confirme que o token um dia existiu.
  if (!painel) notFound();

  const { jogador, rodada } = painel;
  const primeiroNome = (jogador.nickname ?? jogador.displayName).split(" ")[0];

  return (
    <div className="relative min-h-dvh">
      <div className="texture-grid-lg absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8 lg:py-12">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <JogaeMark size={38} />
            <div>
              <div className="font-display text-[26px] leading-none text-ink">
                {jogador.group.name}
              </div>
              <div className="mt-1 text-caption uppercase tracking-[0.1em] text-ink-3">
                Oi, {primeiroNome}
              </div>
            </div>
          </div>
          <TeamStripe className="max-w-32" />
        </header>

        {!rodada ? (
          <Card className="flex flex-col gap-2 py-6">
            <p className="font-display text-[22px] leading-tight text-ink">
              Nenhuma rodada marcada ainda.
            </p>
            <p className="text-body-s text-ink-2">
              Guarda este link: quando a próxima rodada abrir, é aqui que você
              responde se vai ou não.
            </p>
          </Card>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <SectionLabel>A próxima rodada</SectionLabel>
              <Card className="flex flex-col gap-4 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-display text-[22px] leading-tight text-ink">
                    {formatRoundSchedule(rodada.date, rodada.startsAt)}
                  </div>
                  <Chip tone={rodada.confirmados >= rodada.capacidade ? "yellow" : "green"}>
                    {rodada.confirmados}/{rodada.capacidade}
                  </Chip>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-s text-ink-2">
                  {rodada.venue && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconPin size={15} className="text-ink-3" />
                      {rodada.venueUrl ? (
                        <a
                          href={rodada.venueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-line-strong underline-offset-4"
                        >
                          {rodada.venue}
                        </a>
                      ) : (
                        rodada.venue
                      )}
                    </span>
                  )}
                  {formatTime(rodada.startsAt ?? rodada.date) && (
                    <span className="inline-flex items-center gap-1.5">
                      <IconClock size={15} className="text-ink-3" />
                      {formatTime(rodada.startsAt ?? rodada.date)}
                    </span>
                  )}
                </div>

                <RespostaDoJogador
                  token={token}
                  statusInicial={rodada.minhaPresenca}
                  posicaoInicial={rodada.minhaPosicaoNaEspera}
                  podeMexer={podeMexerNaPresenca(rodada.status)}
                  motivoFechado={MOTIVO_FECHADO[rodada.status] ?? null}
                />
              </Card>
            </section>

            {rodada.meuTime && (
              <section className="flex flex-col gap-3">
                <SectionLabel>Seu time</SectionLabel>
                <TeamCard
                  name={rodada.meuTime.name}
                  color={rodada.meuTime.color}
                  order={0}
                  players={rodada.meuTime.jogadores.map((companheiro) => ({
                    id: companheiro.id,
                    name: companheiro.nome,
                    isGoalkeeper: companheiro.isGoalkeeper,
                  }))}
                />
              </section>
            )}

            <a
              href={`/r/${rodada.publicToken}`}
              className="text-body-s text-ink-2 underline decoration-line-strong underline-offset-4"
            >
              Ver todos os times e o placar da rodada
            </a>
          </>
        )}

        <p className="text-caption uppercase tracking-[0.06em] text-ink-3">
          Este link é seu. Não repassa pro grupo — quem abrir responde no seu lugar.
        </p>
      </div>
    </div>
  );
}
