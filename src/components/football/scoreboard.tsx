import { cn } from "@/lib/cn";
import { teamTheme } from "@/lib/team-colors";

/**
 * Placar legível a três metros: Anton tabular, 96px no mobile.
 * O número troca com overshoot; a `key` força o remount da animação.
 */
export function Scoreboard({
  teamAName,
  teamAColor,
  scoreA,
  teamBName,
  teamBColor,
  scoreB,
  live,
  className,
}: {
  teamAName: string;
  teamAColor: string;
  scoreA: number;
  teamBName: string;
  teamBColor: string;
  scoreB: number;
  live?: boolean;
  className?: string;
}) {
  const themeA = teamTheme(teamAColor);
  const themeB = teamTheme(teamBColor);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-surface",
        live ? "border-red/50" : "border-line",
        className,
      )}
    >
      <div className="texture-grid absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/10"
        aria-hidden
      />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
        <TeamSide name={teamAName} theme={themeA} score={scoreA} align="left" />
        <span className="font-display text-[28px] leading-none text-line-strong" aria-hidden>
          ×
        </span>
        <TeamSide name={teamBName} theme={themeB} score={scoreB} align="right" />
      </div>
    </div>
  );
}

function TeamSide({
  name,
  theme,
  score,
  align,
}: {
  name: string;
  theme: ReturnType<typeof teamTheme>;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col gap-2", align === "right" && "items-end text-right")}>
      <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse")}>
        <span className={cn("h-4 w-1 rounded-pill", theme.stripe)} aria-hidden />
        <span className="font-display text-[15px] tracking-[0.04em] leading-none">
          <span className={theme.text}>{name}</span>
        </span>
      </div>
      <span
        key={score}
        className="animate-score-pop font-display text-[96px] leading-[0.82] tabular text-ink"
      >
        {score}
      </span>
    </div>
  );
}
