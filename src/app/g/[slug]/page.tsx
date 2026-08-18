import Link from "next/link";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { groupCapacity } from "@/features/groups/queries";
import {
  getCurrentRound,
  splitAttendances,
  temRodadaAnterior,
} from "@/features/rounds/queries";
import { getTopScorersOfMonth } from "@/features/rankings/queries";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  Chip,
  EmptyState,
  LiveBadge,
  SectionLabel,
} from "@/components/ui/primitives";
import { TeamStripe } from "@/components/football/team-card";
import { Scoreboard } from "@/components/football/scoreboard";
import {
  IconChevronRight,
  IconClock,
  IconDraw,
  IconPin,
  IconTrophy,
  JogaeMark,
} from "@/components/ui/icons";
import {
  formatRoundSchedule,
  greeting,
  relativeDay,
  weekdayName,
} from "@/lib/dates";
import { CreateRoundButton } from "./_components/create-round-button";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group } = await requireGrupoPorSlug(slug);

  // Rodada e artilharia são independentes: em série a home pagava a ida ao
  // banco das duas somada.
  const [round, topScorers] = await Promise.all([
    getCurrentRound(group.id),
    getTopScorersOfMonth(group.id),
  ]);
  const capacity = groupCapacity(group);

  const attendance = round ? splitAttendances(round.attendances) : null;
  const liveMatch = round?.matches.find((match) => match.status === "LIVE");
  const isLive = round?.status === "LIVE";
  const remaining = attendance ? Math.max(0, capacity - attendance.confirmed.length) : capacity;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-body-s text-ink-3">{greeting()} 👋</p>
          <h1 className="font-display text-h1 leading-none text-ink">{group.name}</h1>
          <p className="mt-1.5 text-caption uppercase tracking-[0.1em] text-ink-3">
            {group.recurringWeekdays.length > 0
              ? `${group.recurringWeekdays.map((d) => weekdayName(new Date(2024, 0, 7 + d))).join(" · ")} · ${group.defaultStartTime ?? ""}`
              : "Sem recorrência definida"}
          </p>
        </div>
        <Link href={`/g/${slug}/mais`} aria-label="Mais opções">
          <JogaeMark size={36} />
        </Link>
      </header>

      {/* Se há partida rolando, o placar é o elemento principal da home. */}
      {isLive && liveMatch ? (
        <section className="flex flex-col gap-3">
          <SectionLabel action={<LiveBadge />}>Acontecendo agora</SectionLabel>
          <Scoreboard
            live
            teamAName={liveMatch.teamA.name.replace("Time ", "")}
            teamAColor={liveMatch.teamA.color}
            scoreA={liveMatch.scoreA}
            teamBName={liveMatch.teamB.name.replace("Time ", "")}
            teamBColor={liveMatch.teamB.color}
            scoreB={liveMatch.scoreB}
          />
          <ButtonLink href={`/g/${slug}/ao-vivo`} variant="danger" size="lg" block>
            Abrir controle ao vivo
          </ButtonLink>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionLabel>Próxima rodada</SectionLabel>

        {!round ? (
          <EmptyState
            title="Nada marcado ainda. Bora organizar o próximo?"
            action={<CreateRoundButton
                groupId={group.id}
                podeRepetir={await temRodadaAnterior(group.id)}
              />}
          />
        ) : (
          <Card className="relative overflow-hidden p-0">
            <TeamStripe />
            <div className="flex flex-col gap-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-display text-[30px] leading-none text-ink">
                    {formatRoundSchedule(round.date, round.startsAt, group.defaultDurationMin)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-s text-ink-2">
                    {round.venue && (
                      <span className="inline-flex items-center gap-1.5">
                        <IconPin size={15} className="text-ink-3" />
                        {round.venue}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <IconClock size={15} className="text-ink-3" />
                      {relativeDay(round.date)}
                    </span>
                  </div>
                </div>
                {remaining === 0 ? (
                  <Chip tone="green">Fechou</Chip>
                ) : (
                  <Chip tone="yellow">
                    {remaining} {remaining === 1 ? "vaga" : "vagas"}
                  </Chip>
                )}
              </div>

              <div className="flex items-end gap-6">
                <div>
                  <div className="font-display text-score-m tabular leading-none text-green">
                    {attendance!.confirmed.length}
                    <span className="text-[20px] text-ink-3">/{capacity}</span>
                  </div>
                  <div className="mt-1 text-caption uppercase tracking-[0.06em] text-ink-3">
                    Confirmados
                  </div>
                </div>
                <div>
                  <div className="font-display text-score-m tabular leading-none text-yellow">
                    {attendance!.goalkeepers.length}
                  </div>
                  <div className="mt-1 text-caption uppercase tracking-[0.06em] text-ink-3">
                    Goleiros
                  </div>
                </div>
                <div>
                  <div className="font-display text-score-m tabular leading-none text-ink-2">
                    {attendance!.waiting.length}
                  </div>
                  <div className="mt-1 text-caption uppercase tracking-[0.06em] text-ink-3">
                    Na espera
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {attendance!.confirmed.length === 0 ? (
                  <ButtonLink
                    href={`/g/${slug}/rodada/importar`}
                    size="lg"
                    block
                    className="sm:flex-1"
                  >
                    Importar lista
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink
                      href={`/g/${slug}/rodada/times`}
                      size="lg"
                      block
                      className="sm:flex-1"
                    >
                      <IconDraw size={18} />
                      {round.teams.length > 0 ? "Ver os times" : "Montar times"}
                    </ButtonLink>
                    <ButtonLink
                      href={`/g/${slug}/rodada`}
                      variant="secondary"
                      size="lg"
                      block
                      className="sm:flex-1"
                    >
                      Abrir rodada
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel
          action={
            <Link
              href={`/g/${slug}/ranking`}
              className="inline-flex items-center gap-1 text-caption font-bold uppercase tracking-[0.06em] text-ink-3 transition-colors hover:text-ink"
            >
              Ver tudo
              <IconChevronRight size={13} />
            </Link>
          }
        >
          Artilharia do mês
        </SectionLabel>

        {topScorers.length === 0 ? (
          <EmptyState title="O ranking começa no primeiro apito." />
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line/60">
              {topScorers.map((row, index) => (
                <li
                  key={row.playerId}
                  // Stagger de 60ms: o pódio entra em sequência, não em bloco.
                  className="flex animate-rise items-center gap-3 px-4 py-3"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span
                    className={[
                      "flex size-7 shrink-0 items-center justify-center rounded-pill font-display text-[15px] tabular",
                      index === 0
                        ? "bg-yellow text-canvas"
                        : index === 1
                          ? "bg-elevated text-ink"
                          : "bg-elevated text-ink-2",
                    ].join(" ")}
                  >
                    {row.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                    {row.nickname ?? row.displayName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-display text-[22px] tabular leading-none text-ink">
                    {row.goals}
                    <IconTrophy size={15} className="text-yellow" />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
