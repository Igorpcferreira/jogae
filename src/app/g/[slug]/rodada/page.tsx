import { requireGrupoPorSlug } from "@/features/groups/access";
import { groupCapacity } from "@/features/groups/queries";
import {
  getCurrentRound,
  splitAttendances,
  temRodadaAnterior,
} from "@/features/rounds/queries";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  Chip,
  EmptyState,
  Panel,
  SectionLabel,
} from "@/components/ui/primitives";
import { PlayerRow } from "@/components/football/player-row";
import { IconPin, IconClock, IconFormation } from "@/components/ui/icons";
import { formatRoundSchedule, relativeDay } from "@/lib/dates";
import { CreateRoundButton } from "../_components/create-round-button";
import { PromoteButton, GoalkeeperToggle } from "./_components/attendance-controls";

export default async function RoundPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group } = await requireGrupoPorSlug(slug);

  const round = await getCurrentRound(group.id);
  const capacity = groupCapacity(group);

  if (!round) {
    return (
      <EmptyState
        title="Nada marcado ainda. Bora organizar o próximo?"
        action={<CreateRoundButton
                groupId={group.id}
                podeRepetir={await temRodadaAnterior(group.id)}
              />}
      />
    );
  }

  const { confirmed, goalkeepers, waiting } = splitAttendances(round.attendances);
  const fieldPlayers = confirmed.filter((a) => !a.asGoalkeeper);
  const remaining = Math.max(0, capacity - confirmed.length);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-caption uppercase tracking-[0.14em] text-ink-3">
              Rodada · {relativeDay(round.date)}
            </p>
            <h1 className="font-display text-h1 leading-none text-ink">
              {formatRoundSchedule(round.date, round.startsAt, group.defaultDurationMin)}
            </h1>
          </div>
          {remaining === 0 ? (
            <Chip tone="green">Lista cheia</Chip>
          ) : (
            <Chip tone="yellow">{remaining} vagas</Chip>
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
                  className="underline decoration-line-strong underline-offset-4 hover:text-ink"
                >
                  {round.venue}
                </a>
              ) : (
                round.venue
              )}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <IconFormation size={15} className="text-ink-3" />
            {round.teamCount} times · {round.fieldPlayersPerTeam} na linha
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <ButtonLink
          href={`/g/${slug}/rodada/importar`}
          variant={confirmed.length === 0 ? "primary" : "secondary"}
          size="lg"
          block
          className="sm:flex-1"
        >
          Importar lista
        </ButtonLink>
        <ButtonLink
          href={`/g/${slug}/rodada/times`}
          variant={confirmed.length === 0 ? "secondary" : "primary"}
          size="lg"
          block
          className="sm:flex-1"
        >
          {round.teams.length > 0 ? "Ver os times" : "Montar times"}
        </ButtonLink>
      </div>

      <section>
        <SectionLabel
          action={
            <span className="font-display text-[20px] tabular leading-none text-green">
              {confirmed.length}
              <span className="text-[14px] text-ink-3">/{capacity}</span>
            </span>
          }
        >
          Goleiros
        </SectionLabel>
        <Panel>
          {goalkeepers.length === 0 ? (
            <p className="px-4 py-5 text-body-s text-ink-3">
              Nenhum goleiro confirmado. Marque na lista quem pega o gol.
            </p>
          ) : (
            <div className="divide-y divide-line/60">
              {goalkeepers.map((attendance) => (
                <PlayerRow
                  key={attendance.id}
                  name={attendance.player.displayName}
                  isGoalkeeper
                  meta={attendance.player.nickname}
                  accent="border-yellow/50 text-yellow"
                  right={
                    <GoalkeeperToggle
                      roundId={round.id}
                      playerId={attendance.playerId}
                      isGoalkeeper
                    />
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section>
        <SectionLabel>Confirmados</SectionLabel>
        {fieldPlayers.length === 0 ? (
          <EmptyState title="Adicione a galera ou cole uma lista do WhatsApp." />
        ) : (
          <Panel>
            <div className="divide-y divide-line/60">
              {fieldPlayers.map((attendance, index) => (
                <PlayerRow
                  key={attendance.id}
                  slot={index + 1}
                  name={attendance.player.displayName}
                  meta={attendance.player.nickname}
                  right={
                    <GoalkeeperToggle
                      roundId={round.id}
                      playerId={attendance.playerId}
                      isGoalkeeper={false}
                    />
                  }
                />
              ))}
            </div>
          </Panel>
        )}
      </section>

      {waiting.length > 0 && (
        <section>
          <SectionLabel>Na espera</SectionLabel>
          <Panel className="border-dashed">
            <div className="divide-y divide-line/60">
              {waiting.map((attendance, index) => (
                <PlayerRow
                  key={attendance.id}
                  slot={index + 1}
                  name={attendance.player.displayName}
                  waiting
                  right={
                    <PromoteButton roundId={round.id} playerId={attendance.playerId} />
                  }
                />
              ))}
            </div>
          </Panel>
        </section>
      )}

      <Card className="flex items-center gap-3 py-3">
        <IconClock size={18} className="shrink-0 text-ink-3" />
        <p className="text-body-s text-ink-2">
          {remaining === 0
            ? `${confirmed.length} confirmados. Fechou.`
            : `Faltam ${remaining} pra fechar ${round.teamCount} times.`}
          {waiting.length > 0 && ` ${waiting.length} na espera.`}
        </p>
      </Card>
    </div>
  );
}
