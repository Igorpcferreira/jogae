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

  const events: LiveEvent[] = (current?.events ?? [])
    .filter((event) => !event.voidedAt)
    .map((event) => ({
      id: event.id,
      minute: event.minute,
      teamColor: event.team.color,
      playerName: event.player?.nickname ?? event.player?.displayName ?? null,
      assistName: event.assistPlayer?.nickname ?? event.assistPlayer?.displayName ?? null,
      type: event.type,
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
      matchRule={settings.matchRule ?? null}
    />
  );
}
