import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cn } from "@/lib/cn";
import { descreverRegras, lerRegrasDePartida } from "@/domain/live/fim-de-partida";
import { teamTheme } from "@/lib/team-colors";
import { getRoundByToken, splitAttendances } from "@/features/rounds/queries";
import {
  aggregatePlayerStats,
  aggregateTeamStats,
  mvpDaRodada,
} from "@/domain/statistics/aggregate";
import { Card, Chip, LiveBadge, SectionLabel } from "@/components/ui/primitives";
import { getEscolhaDaGalera } from "@/features/mvp/queries";
import { getConquistasDaRodadaPublica } from "@/features/rankings/queries";
import { ConquistaCard } from "@/components/football/conquista-card";
import { BotaoCopiar } from "@/components/ui/copiar";
import { CONQUISTAS } from "@/domain/badges/conquistas";
import { buildConquistasMessage } from "@/domain/share/whatsapp";
import { TeamCard, TeamStripe } from "@/components/football/team-card";
import {
  IconClock,
  IconPin,
  IconPlayers,
  IconTrophy,
  JogaeMark,
} from "@/components/ui/icons";
import { formatLongDate, formatRoundSchedule, formatTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const round = await getRoundByToken(token);
  if (!round) return { title: "Rodada" };

  return {
    title: `${round.group.name} · ${formatLongDate(round.date)}`,
    description: `Times, placar e ranking da rodada de ${formatLongDate(round.date)}.`,
    robots: { index: false, follow: false },
    // É o card que o WhatsApp mostra quando o link é colado no grupo.
    openGraph: {
      title: `${round.group.name} · ${formatLongDate(round.date)}`,
      images: [{ url: `/r/${token}/imagem`, width: 1200, height: 630 }],
    },
  };
}

/**
 * Página pública da rodada. Sem login, sem instalação: o jogador abre o link
 * do WhatsApp e vê o time dele. Nada privado aqui — nível técnico jamais sai.
 */
export default async function PublicRoundPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const round = await getRoundByToken(token);
  if (!round) notFound();

  const { confirmed, goalkeepers, waiting } = splitAttendances(round.attendances);
  const teamStats = aggregateTeamStats(
    round.matches.map((match) => ({
      id: match.id,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
    })),
  );
  const isLive = round.status === "LIVE";
  const playedMatches = round.matches.filter((match) => match.status !== "SCHEDULED");

  // MVP só depois do apito final: eleger no meio da rodada seria injusto com
  // quem ainda vai jogar.
  const nomeDoJogador = new Map(
    round.teams.flatMap((team) =>
      team.players.map((tp) => [
        tp.playerId,
        tp.player.nickname ?? tp.player.displayName,
      ]),
    ),
  );
  const mvp =
    round.status === "FINISHED"
      ? mvpDaRodada(
          aggregatePlayerStats(
            round.matches.map((match) => ({
              id: match.id,
              teamAId: match.teamAId,
              teamBId: match.teamBId,
              scoreA: match.scoreA,
              scoreB: match.scoreB,
              status: match.status,
            })),
            round.matches.flatMap((match) =>
              match.events.map((event) => ({
                matchId: match.id,
                teamId: event.teamId,
                playerId: event.playerId,
                assistPlayerId: event.assistPlayerId,
                type: event.type,
                voidedAt: event.voidedAt,
              })),
            ),
            Object.fromEntries(
              round.teams.map((team) => [
                team.id,
                team.players.map((tp) => tp.playerId),
              ]),
            ),
          ).values(),
        )
      : null;
  // A escolha da galera só sai com a urna fechada (`getEscolhaDaGalera`
  // devolve null enquanto a votação está aberta): parcial no meio da votação
  // transforma o prêmio em campanha.
  const escolhaDaGalera = await getEscolhaDaGalera(round.id);

  // As conquistas da rodada (craque, escolha da galera, hat-trick, estreia) —
  // as do mês ficam no app: um card que mistura as duas coisas mente na data.
  const conquistas = await getConquistasDaRodadaPublica(round.id);

  const settings = (round.group.settings ?? {}) as { matchRule?: string };
  // Grupo que escreveu a regra em texto manda; sem texto, a frase sai dos
  // limites configurados ("Partida vai até 2 gols ou 8 minutos.").
  const regraDoDia =
    settings.matchRule ?? descreverRegras(lerRegrasDePartida(round.group.settings));

  return (
    <div className="relative min-h-dvh">
      <div className="texture-grid-lg absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <JogaeMark size={38} />
              <div>
                <div className="font-display text-[26px] leading-none text-ink">
                  {round.group.name}
                </div>
                <div className="mt-1 text-caption uppercase tracking-[0.1em] text-ink-3">
                  {formatRoundSchedule(round.date, round.startsAt, round.group.defaultDurationMin)}
                </div>
              </div>
            </div>
            {isLive ? (
              <LiveBadge />
            ) : round.status === "FINISHED" ? (
              <Chip tone="neutral">Encerrada</Chip>
            ) : (
              <Chip tone="green">Lista fechada</Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-s text-ink-2">
            {round.venue && (
              <span className="inline-flex items-center gap-1.5">
                <IconPin size={15} className="text-ink-3" />
                {round.venueUrl ? (
                  <a
                    href={round.venueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line-strong underline-offset-4"
                  >
                    {round.venue}
                  </a>
                ) : (
                  round.venue
                )}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={15} className="text-ink-3" />
              {formatTime(round.startsAt ?? round.date)}
            </span>
          </div>

          <TeamStripe className="max-w-32" />
        </header>

        <section className="grid grid-cols-3 gap-3">
          <Stat value={confirmed.length} label="Jogam" tone="text-green" />
          <Stat value={goalkeepers.length} label="Goleiros" tone="text-yellow" />
          <Stat value={waiting.length} label="Espera" tone="text-ink-2" />
        </section>

        {escolhaDaGalera && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Escolha da galera</SectionLabel>
            <Card className="flex items-center gap-4 py-4">
              <span className="text-yellow">
                <IconPlayers size={28} />
              </span>
              <div className="min-w-0">
                <div className="font-display text-[26px] leading-tight text-ink">
                  {escolhaDaGalera.vencedores.map((v) => v.nome).join(" e ")}
                </div>
                <div className="mt-1.5 text-body-s text-ink-2">
                  {escolhaDaGalera.votos}{" "}
                  {escolhaDaGalera.votos === 1 ? "voto" : "votos"} de{" "}
                  {escolhaDaGalera.totalDeVotos} — quem jogou escolheu
                </div>
              </div>
            </Card>
          </section>
        )}

        {mvp && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Craque da rodada</SectionLabel>
            <Card className="flex items-center gap-4 py-4">
              <span className="text-yellow">
                <IconTrophy size={28} />
              </span>
              <div className="min-w-0">
                <div className="font-display text-[26px] leading-none text-ink">
                  {nomeDoJogador.get(mvp.playerId) ?? "Craque da rodada"}
                </div>
                <div className="mt-1.5 text-body-s text-ink-2">
                  {mvp.goals} {mvp.goals === 1 ? "gol" : "gols"} · {mvp.assists}{" "}
                  {mvp.assists === 1 ? "assistência" : "assistências"}
                </div>
              </div>
            </Card>
          </section>
        )}

        {conquistas.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionLabel
              action={
                <BotaoCopiar
                  texto={buildConquistasMessage({
                    groupName: round.group.name,
                    recorte: "da rodada",
                    conquistas: conquistas.map((conquista) => ({
                      emoji: CONQUISTAS[conquista.tipo].emoji,
                      rotulo: CONQUISTAS[conquista.tipo].rotulo,
                      nome: conquista.nickname ?? conquista.displayName,
                      detalhe: CONQUISTAS[conquista.tipo].descricao(conquista.valor),
                    })),
                  })}
                  rotulo="Copiar"
                />
              }
            >
              Conquistas da rodada
            </SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {conquistas.map((conquista) => (
                <ConquistaCard
                  key={`${conquista.tipo}-${conquista.playerId}`}
                  tipo={conquista.tipo}
                  valor={conquista.valor}
                  nome={conquista.nickname ?? conquista.displayName}
                />
              ))}
            </div>
          </section>
        )}

        {round.teams.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Os times</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              {round.teams.map((team) => {
                const stats = teamStats.get(team.id);
                return (
                  <TeamCard
                    key={team.id}
                    name={team.name}
                    color={team.color}
                    order={team.order}
                    players={team.players
                      .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper))
                      .map((tp) => ({
                        id: tp.playerId,
                        name: tp.player.nickname ?? tp.player.displayName,
                        isGoalkeeper: tp.isGoalkeeper,
                      }))}
                    footer={
                      stats && stats.played > 0 ? (
                        <span className="ml-auto text-caption tabular uppercase tracking-[0.06em] text-ink-3">
                          {stats.wins}V {stats.draws}E {stats.losses}D · saldo{" "}
                          {stats.goalDiff > 0 ? `+${stats.goalDiff}` : stats.goalDiff}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {waiting.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Na espera</SectionLabel>
            <Card className="py-4">
              <p className="text-body text-ink-2">
                {waiting.map((a) => a.player.nickname ?? a.player.displayName).join(" · ")}
              </p>
              <p className="mt-2 text-body-s text-ink-3">
                Se alguém furar, sobe automático e o grupo é avisado.
              </p>
            </Card>
          </section>
        )}

        {regraDoDia && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Como funciona hoje</SectionLabel>
            <Card className="py-4">
              <p className="text-body text-ink-2">{regraDoDia}</p>
            </Card>
          </section>
        )}

        {playedMatches.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionLabel action={isLive ? <LiveBadge /> : undefined}>Como foi</SectionLabel>
            <Card className="p-0">
              <ul className="divide-y divide-line/60">
                {playedMatches.map((match) => {
                  const themeA = teamTheme(match.teamA.color);
                  const themeB = teamTheme(match.teamB.color);
                  const live = match.status === "LIVE";
                  return (
                    <li
                      key={match.id}
                      className={cn(
                        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3",
                        live && "bg-red/8",
                      )}
                    >
                      <span className="flex items-center justify-end gap-2 text-right">
                        <span className={cn("truncate text-body", themeA.text)}>
                          {match.teamA.name.replace("Time ", "")}
                        </span>
                        <span className={cn("h-4 w-1 rounded-pill", themeA.stripe)} aria-hidden />
                      </span>
                      <span className="font-display text-[24px] tabular leading-none text-ink">
                        {match.scoreA}
                        <span className="mx-2 text-line-strong">×</span>
                        {match.scoreB}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-4 w-1 rounded-pill", themeB.stripe)} aria-hidden />
                        <span className={cn("truncate text-body", themeB.text)}>
                          {match.teamB.name.replace("Time ", "")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        )}

        <footer className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-6">
          <span className="text-body-s text-ink-3">{round.group.name}</span>
          <span className="text-caption font-bold uppercase tracking-[0.14em] text-ink-3">
            Feito no Jogaê
          </span>
        </footer>
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className={cn("font-display text-score-m tabular leading-none", tone)}>{value}</div>
      <div className="mt-1 text-caption uppercase tracking-[0.06em] text-ink-3">{label}</div>
    </div>
  );
}
