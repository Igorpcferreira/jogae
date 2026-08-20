import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, Chip, SectionLabel, StatBlock } from "@/components/ui/primitives";
import { TeamCard, TeamStripe } from "@/components/football/team-card";
import { ConquistaCard } from "@/components/football/conquista-card";
import { RecordeCard } from "@/components/football/recorde-card";
import { BotaoCopiar } from "@/components/ui/copiar";
import { IconClock, IconPin, JogaeMark } from "@/components/ui/icons";
import { podeMexerNaPresenca } from "@/domain/attendance/presenca";
import { cn } from "@/lib/cn";
import { lerJogadorLembrado } from "@/features/entrada/cookie";
import { getCardDoJogador } from "@/features/jogadores/queries";
import { getPainelDeVotacao, getRodadaEmVotacao } from "@/features/mvp/queries";
import { getPainelDoJogador } from "@/features/presenca/queries";
import { buildCardDoJogadorMessage } from "@/domain/share/whatsapp";
import { RECORDES } from "@/domain/statistics/recordes";
import { formatLongDate, formatRoundSchedule, formatTime, mesEAno } from "@/lib/dates";
import { RespostaDoJogador } from "./_components/resposta-do-jogador";
import { VotacaoDoCraque } from "./_components/votacao-do-craque";

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

  const { jogador, rodada, conquistas } = painel;
  const primeiroNome = (jogador.nickname ?? jogador.displayName).split(" ")[0];

  // Saída pra quem tocou no nome errado no link do grupo. Só aparece se este
  // aparelho passou por lá: o link pessoal sozinho não abre o elenco, e mostrar
  // o link de convidado aqui transformaria um link vazado em acesso ao grupo.
  const veioDoLinkDoGrupo = (await lerJogadorLembrado(jogador.groupId)) !== null;

  // O que a Fase 2 acrescentou nesta tela: a votação do craque e o card do
  // jogador (temporada, recordes, melhor mês). Em paralelo — uma não depende da
  // outra, e cada ida ao banco atravessa a rede (função em gru1, banco em
  // sa-east-1).
  const [emVotacao, card] = await Promise.all([
    getRodadaEmVotacao(jogador.groupId),
    getCardDoJogador(jogador.groupId, jogador.id, jogador.group.timezone),
  ]);

  const votacao = emVotacao
    ? await getPainelDeVotacao(emVotacao.roundId, jogador.id)
    : null;

  const mensagemDoCard =
    card && card.resumo.rodadas > 0
      ? buildCardDoJogadorMessage({
          groupName: jogador.group.name,
          nome: jogador.nickname ?? jogador.displayName,
          rodadas: card.resumo.rodadas,
          gols: card.resumo.gols,
          assistencias: card.resumo.assistencias,
          vitorias: card.resumo.vitorias,
          aproveitamento: card.resumo.aproveitamento,
          recorde: card.recordes[0]
            ? `${RECORDES[card.recordes[0].tipo].rotulo} — ${RECORDES[card.recordes[0].tipo].descricao(card.recordes[0].valor)}`
            : null,
        })
      : null;

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

            {votacao && (
              <section className="flex flex-col gap-3">
                <SectionLabel>Escolha da galera</SectionLabel>
                <Card className="py-5">
                  {votacao.podeVotar ? (
                    <VotacaoDoCraque
                      token={token}
                      roundId={votacao.roundId}
                      candidatos={votacao.candidatos}
                      // "Quinta · 23:30" — o prazo em hora de parede, que é
                      // como alguém checa se ainda dá tempo.
                      fechaEm={
                        votacao.fechaEm
                          ? formatRoundSchedule(votacao.fechaEm, votacao.fechaEm)
                          : null
                      }
                    />
                  ) : (
                    <p className="text-body-s text-ink-3">
                      {votacao.motivo ?? "A votação dessa rodada já fechou."}
                    </p>
                  )}
                </Card>
              </section>
            )}

            {conquistas.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionLabel>Suas conquistas</SectionLabel>
                <div className="grid gap-2">
                  {conquistas.map((conquista) => (
                    <ConquistaCard
                      key={conquista.tipo}
                      tipo={conquista.tipo}
                      valor={conquista.valor}
                      nome={jogador.nickname ?? jogador.displayName}
                    />
                  ))}
                </div>
              </section>
            )}

            {card && card.resumo.rodadas > 0 && (
              <>
                <section className="flex flex-col gap-3">
                  <SectionLabel>Seus números</SectionLabel>
                  <Card>
                    <div className="grid grid-cols-3 gap-3">
                      <StatBlock value={card.resumo.gols} label="Gols" tone="text-red" />
                      <StatBlock
                        value={card.resumo.assistencias}
                        label="Assistências"
                        tone="text-yellow"
                      />
                      <StatBlock
                        value={card.resumo.rodadas}
                        label="Rodadas"
                        tone="text-ink"
                      />
                    </div>
                    <p className="mt-4 text-body-s text-ink-2">
                      {card.resumo.vitorias}{" "}
                      {card.resumo.vitorias === 1 ? "vitória" : "vitórias"} em{" "}
                      {card.resumo.partidas}{" "}
                      {card.resumo.partidas === 1 ? "jogo" : "jogos"} ·{" "}
                      {Math.round(card.resumo.aproveitamento * 100)}% de aproveitamento
                    </p>
                  </Card>
                </section>

                {card.melhorMes && (
                  <section className="flex flex-col gap-3">
                    <SectionLabel>Seu melhor mês</SectionLabel>
                    <Card className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <div className="font-display text-[22px] leading-none text-ink">
                          {mesEAno(card.melhorMes.mes, card.melhorMes.ano)}
                        </div>
                        <p className="mt-1.5 text-body-s text-ink-2">
                          {card.melhorMes.gols}{" "}
                          {card.melhorMes.gols === 1 ? "gol" : "gols"} e{" "}
                          {card.melhorMes.assistencias}{" "}
                          {card.melhorMes.assistencias === 1
                            ? "assistência"
                            : "assistências"}
                        </p>
                      </div>
                      <span className="font-display text-score-m tabular leading-none text-pink">
                        {card.melhorMes.participacoes}
                      </span>
                    </Card>
                  </section>
                )}

                {card.recordes.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <SectionLabel>Seus recordes</SectionLabel>
                    <div className="grid gap-2">
                      {card.recordes.map((recorde) => (
                        <RecordeCard
                          key={recorde.tipo}
                          tipo={recorde.tipo}
                          valor={recorde.valor}
                          quando={recorde.data ? formatLongDate(recorde.data) : null}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {card.parcerias.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <SectionLabel>Com quem você mais joga</SectionLabel>
                    <Card className="p-0">
                      <ul>
                        {card.parcerias.map((parceria, index) => (
                          <li
                            key={parceria.parceiroId}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3",
                              index > 0 && "border-t border-line/50",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                              {parceria.nome}
                            </span>
                            <span className="text-caption tabular text-ink-3">
                              {parceria.jogosJuntos} jogos juntos
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </section>
                )}

                {mensagemDoCard && (
                  <BotaoCopiar texto={mensagemDoCard} rotulo="Copiar seu card" block />
                )}
              </>
            )}

            <a
              href={`/r/${rodada.publicToken}`}
              className="text-body-s text-ink-2 underline decoration-line-strong underline-offset-4"
            >
              Ver todos os times e o placar da rodada
            </a>
          </>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-caption uppercase tracking-[0.06em] text-ink-3">
            Este link é seu. Não repassa pro grupo — quem abrir responde no seu lugar.
          </p>
          {veioDoLinkDoGrupo && (
            <a
              href={`/e/${jogador.group.publicToken}?trocar=1`}
              className="text-body-s text-ink-3 underline decoration-line-strong underline-offset-4"
            >
              Não é você? Escolher outro nome
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
