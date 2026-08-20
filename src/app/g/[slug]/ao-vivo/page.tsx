import { requireGrupoPorSlug } from "@/features/groups/access";
import { getCurrentRound } from "@/features/rounds/queries";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import {
  LiveControl,
  type LiveEvent,
  type LiveTeam,
} from "./_components/live-control";

export const metadata = { title: "Ao vivo" };

export default async function LivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group } = await requireGrupoPorSlug(slug);

  const round = await getCurrentRound(group.id);

  if (!round || round.teams.length === 0) {
    return (
      <EmptyState
        title="Times prontos? Comece o primeiro jogo."
        action={
          <ButtonLink href={`/g/${slug}/rodada/times`} size="lg">
            Montar times
          </ButtonLink>
        }
      />
    );
  }

  const teams: LiveTeam[] = round.teams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    players: team.players
      .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper))
      .map((tp) => ({
        id: tp.playerId,
        name: tp.player.nickname ?? tp.player.displayName,
        isGoalkeeper: tp.isGoalkeeper,
      })),
  }));

  const current = round.matches.find((match) => match.status === "LIVE") ?? null;

  // Gols de cada um **na rodada**, não na partida. No fut de resenha a noite
  // tem seis jogos de 10 minutos; hat-trick por partida sairia toda hora, e
  // ninguém chama três gols espalhados pela noite de outra coisa. É a mesma
  // contagem que a conquista `hat-trick` usa no histórico — as duas precisam
  // concordar, senão a tela comemora o que o ranking não registra.
  const golsDaRodada: Record<string, number> = {};
  for (const match of round.matches) {
    for (const evento of match.events) {
      if (evento.voidedAt) continue;
      if (evento.type !== "GOAL" || !evento.playerId) continue;
      golsDaRodada[evento.playerId] = (golsDaRodada[evento.playerId] ?? 0) + 1;
    }
  }

  const events: LiveEvent[] = (current?.events ?? [])
    .filter((event) => !event.voidedAt)
    .map((event) => ({
      id: event.id,
      minute: event.minute,
      teamColor: event.team.color,
      playerName: event.player?.nickname ?? event.player?.displayName ?? null,
      assistName: event.assistPlayer?.nickname ?? event.assistPlayer?.displayName ?? null,
      type: event.type,
      teamId: event.teamId,
      playerId: event.playerId,
      registradoEm: event.createdAt.getTime(),
    }));

  const settings = (round.group.settings ?? {}) as { matchRule?: string };

  return (
    <LiveControl
      roundId={round.id}
      teams={teams}
      match={
        current
          ? {
              id: current.id,
              teamAId: current.teamAId,
              teamBId: current.teamBId,
              scoreA: current.scoreA,
              scoreB: current.scoreB,
              startedAt: current.startedAt?.toISOString() ?? null,
            }
          : null
      }
      events={events}
      golsDaRodada={golsDaRodada}
      matchRule={settings.matchRule ?? null}
      // Relógio do servidor: o celular na beira do campo pode estar minutos
      // fora, e a checagem de gol repetido compara carimbo do banco com "agora"
      // do cliente. Sem esta referência ela sumiria em silêncio justo no
      // aparelho desacertado.
      //
      // A regra de pureza existe pro componente que **re-renderiza**: valor
      // instável entre renders vira UI que pisca e hidratação que não bate.
      // Aqui é Server Component, e ele roda uma vez por requisição — este
      // `Date.now()` é dado de request, da mesma natureza de `cookies()` e
      // `headers()`, e chega ao cliente como número congelado no payload.
      // eslint-disable-next-line react-hooks/purity -- valor de request em Server Component
      agoraNoServidor={Date.now()}
    />
  );
}
