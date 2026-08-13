import Link from "next/link";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { cn } from "@/lib/cn";
import { getCurrentRound } from "@/features/rounds/queries";
import { getRanking, type RankingPeriod } from "@/features/rankings/queries";
import type { RankingMetric } from "@/domain/statistics/aggregate";
import { Card, EmptyState, SectionLabel } from "@/components/ui/primitives";

export const metadata = { title: "Ranking" };

const PERIODS: Array<{ value: RankingPeriod; label: string }> = [
  { value: "round", label: "Rodada" },
  { value: "month", label: "Mês" },
  { value: "all", label: "Geral" },
];

const METRICS: Array<{ value: RankingMetric; label: string; tone: string }> = [
  { value: "goals", label: "Gols", tone: "text-ink" },
  { value: "assists", label: "Assistências", tone: "text-yellow" },
  { value: "contributions", label: "Participações", tone: "text-pink" },
  { value: "wins", label: "Vitórias", tone: "text-green" },
  { value: "presence", label: "Presença", tone: "text-ink-2" },
];

const MEDALS = ["bg-yellow text-canvas", "bg-elevated text-ink", "bg-elevated text-ink-2"];

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; metrica?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { group } = await requireGrupoPorSlug(slug);

  const period: RankingPeriod = PERIODS.some((p) => p.value === query.periodo)
    ? (query.periodo as RankingPeriod)
    : "month";
  const metric: RankingMetric = METRICS.some((m) => m.value === query.metrica)
    ? (query.metrica as RankingMetric)
    : "goals";

  const round = period === "round" ? await getCurrentRound(group.id) : null;
  const ranking = await getRanking(group.id, period, metric, round?.id);
  const activeMetric = METRICS.find((m) => m.value === metric)!;

  const valueOf = (row: (typeof ranking)[number]) =>
    metric === "presence" ? row.presence : row[metric];

  const visible = ranking.filter((row) => valueOf(row) > 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-h1 leading-none text-ink">Ranking</h1>

      <Tabs
        options={PERIODS.map((p) => ({
          label: p.label,
          href: `/g/${slug}/ranking?periodo=${p.value}&metrica=${metric}`,
          active: p.value === period,
        }))}
      />

      <Tabs
        subtle
        options={METRICS.map((m) => ({
          label: m.label,
          href: `/g/${slug}/ranking?periodo=${period}&metrica=${m.value}`,
          active: m.value === metric,
        }))}
      />

      {visible.length === 0 ? (
        <EmptyState title="O ranking começa no primeiro apito." />
      ) : (
        <>
          <SectionLabel>{activeMetric.label}</SectionLabel>
          <Card className="p-0">
            <ul>
              {visible.map((row, index) => (
                <li
                  key={row.playerId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    index % 2 === 1 && "bg-surface-2",
                    index > 0 && "border-t border-line/50",
                    // Só o pódio ganha entrada escalonada; a lista inteira
                    // animando vira ruído.
                    index < 3 && "animate-rise",
                  )}
                  style={index < 3 ? { animationDelay: `${index * 60}ms` } : undefined}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-pill font-display text-[15px] tabular",
                      row.position <= 3 ? MEDALS[row.position - 1] : "text-ink-3",
                    )}
                  >
                    {row.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                    {row.nickname ?? row.displayName}
                  </span>
                  <span className="hidden text-caption tabular text-ink-3 sm:inline">
                    {row.matchesPlayed} {row.matchesPlayed === 1 ? "jogo" : "jogos"}
                  </span>
                  <span
                    className={cn(
                      "w-12 text-right font-display text-[24px] tabular leading-none",
                      activeMetric.tone,
                    )}
                  >
                    {valueOf(row)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function Tabs({
  options,
  subtle,
}: {
  options: Array<{ label: string; href: string; active: boolean }>;
  subtle?: boolean;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto",
        !subtle && "rounded-pill border border-line p-1",
      )}
    >
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          scroll={false}
          aria-current={option.active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-pill px-4 py-2 text-caption font-bold uppercase tracking-[0.06em]",
            "transition-colors duration-[120ms]",
            option.active
              ? subtle
                ? "bg-elevated text-ink"
                : "bg-green text-canvas"
              : "text-ink-3 hover:text-ink",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
