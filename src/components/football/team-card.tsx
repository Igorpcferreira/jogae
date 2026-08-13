import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { teamTheme } from "@/lib/team-colors";
import { IconGoalkeeper } from "@/components/ui/icons";

export interface TeamCardPlayer {
  id: string;
  name: string;
  isGoalkeeper: boolean;
}

/**
 * Card de time: header sólido na cor com canto chanfrado, número do time em
 * marca d'água, lista de jogadores em superfície neutra.
 */
export function TeamCard({
  name,
  color,
  order,
  players,
  footer,
  strength,
  className,
  style,
  onPlayerClick,
  onEditar,
}: {
  name: string;
  color: string;
  order: number;
  players: TeamCardPlayer[];
  footer?: ReactNode;
  strength?: number;
  className?: string;
  style?: CSSProperties;
  onPlayerClick?: (playerId: string) => void;
  /** Quando existe, o header vira botão de renomear/trocar a cor. */
  onEditar?: () => void;
}) {
  const theme = teamTheme(color);
  const goalkeepers = players.filter((p) => p.isGoalkeeper);
  const fieldPlayers = players.filter((p) => !p.isGoalkeeper);

  const cabecalho = (
    <div className="flex items-center justify-between">
      <span className="font-display text-[22px] leading-none">{name}</span>
      <span
        className="font-display text-[22px] leading-none opacity-25 tabular"
        aria-hidden
      >
        {String(order + 1).padStart(2, "0")}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface",
        "animate-rise",
        className,
      )}
      style={style}
    >
      {onEditar ? (
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar ${name}`}
          className={cn("cut-corner relative w-full px-4 py-3 text-left", theme.solid)}
        >
          {cabecalho}
        </button>
      ) : (
        <div className={cn("cut-corner relative px-4 py-3", theme.solid)}>{cabecalho}</div>
      )}

      <ul className="divide-y divide-line/50">
        {[...goalkeepers, ...fieldPlayers].map((player, index) => (
          <li key={player.id}>
            {onPlayerClick ? (
              <button
                type="button"
                onClick={() => onPlayerClick(player.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-[120ms] hover:bg-elevated/60"
              >
                <PlayerLine index={index} player={player} stripe={theme.stripe} />
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <PlayerLine index={index} player={player} stripe={theme.stripe} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {(footer || typeof strength === "number") && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          {typeof strength === "number" && (
            <span className="text-caption uppercase tracking-[0.06em] text-ink-3">
              Força <span className={cn("tabular font-bold", theme.text)}>{strength}</span>
            </span>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}

function PlayerLine({
  index,
  player,
  stripe,
}: {
  index: number;
  player: TeamCardPlayer;
  stripe: string;
}) {
  return (
    <>
      <span className={cn("h-6 w-[3px] shrink-0 rounded-pill", stripe)} aria-hidden />
      <span className="w-4 shrink-0 text-caption tabular text-ink-3">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-body text-ink">{player.name}</span>
      {player.isGoalkeeper && (
        <span className="text-yellow" title="Goleiro">
          <IconGoalkeeper size={16} />
        </span>
      )}
    </>
  );
}

/** Faixa das quatro cores — assinatura visual do produto. */
export function TeamStripe({ className }: { className?: string }) {
  return (
    <div className={cn("flex overflow-hidden rounded-pill", className)} aria-hidden>
      <div className="h-1 flex-1 bg-green" />
      <div className="h-1 flex-1 bg-yellow" />
      <div className="h-1 flex-1 bg-red" />
      <div className="h-1 flex-1 bg-pink" />
    </div>
  );
}
