import { requireGrupoPorSlug } from "@/features/groups/access";
import {
  getCurrentRound,
  splitAttendances,
  temRodadaAnterior,
} from "@/features/rounds/queries";
import { buildTeamsMessage } from "@/domain/share/whatsapp";
import { EmptyState } from "@/components/ui/primitives";
import { formatTime } from "@/lib/dates";
import { urlBase } from "@/lib/base-url";
import { CreateRoundButton } from "../../_components/create-round-button";
import { TeamsView, type TeamsViewTeam } from "./_components/teams-view";

export const metadata = { title: "Times" };

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, pode } = await requireGrupoPorSlug(slug);

  const round = await getCurrentRound(group.id);
  if (!round) {
    return (
      <EmptyState
        title="Sem rodada aberta. Cria a próxima pra montar os times."
        action={<CreateRoundButton
                groupId={group.id}
                podeRepetir={await temRodadaAnterior(group.id)}
              />}
      />
    );
  }

  const { confirmed, waiting } = splitAttendances(round.attendances);

  const teams: TeamsViewTeam[] = round.teams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    order: team.order,
    strength: team.players.reduce(
      (sum, tp) => (tp.isGoalkeeper ? sum : sum + tp.player.skillLevel),
      0,
    ),
    players: team.players
      .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper))
      .map((tp) => ({
        id: tp.playerId,
        name: tp.player.nickname ?? tp.player.displayName,
        isGoalkeeper: tp.isGoalkeeper,
      })),
  }));

  const base = await urlBase();
  const publicUrl = `${base}/r/${round.publicToken}`;
  const imagemUrl = `${base}/r/${round.publicToken}/imagem`;

  const shareText = buildTeamsMessage({
    teams: teams.map((team) => ({
      name: team.name,
      color: team.color,
      goalkeepers: team.players.filter((p) => p.isGoalkeeper).map((p) => p.name),
      players: team.players.filter((p) => !p.isGoalkeeper).map((p) => p.name),
    })),
    venue: round.venue,
    time: formatTime(round.startsAt ?? round.date),
    waiting: waiting.map((a) => a.player.nickname ?? a.player.displayName),
    publicUrl,
    groupName: group.name,
  });

  return (
    <TeamsView
      roundId={round.id}
      slug={slug}
      teams={teams}
      confirmedCount={confirmed.length}
      drawMode={round.drawMode}
      drawSeed={round.drawSeed}
      drawnAtLabel={round.drawnAt ? formatTime(round.drawnAt) : null}
      manualEdits={round.manualEdits}
      shareText={shareText}
      publicUrl={publicUrl}
      imagemUrl={imagemUrl}
      // O assistente precisa ver os times pra apitar, mas não sorteia nem troca.
      podeSortear={pode("rodada:sortear")}
      liveHref={`/g/${slug}/ao-vivo`}
    />
  );
}
