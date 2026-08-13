"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { IconArrowUp, IconGoalkeeper } from "@/components/ui/icons";
import { promoverDaEsperaAction, alternarGoleiroAction } from "@/features/rounds/actions";

export function PromoteButton({
  roundId,
  playerId,
}: {
  roundId: string;
  playerId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => promoverDaEsperaAction(roundId, playerId))}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-pill border border-green/40 bg-green/10 px-3",
        "text-caption font-bold uppercase tracking-[0.06em] text-green",
        "transition-colors duration-[120ms] hover:bg-green/20 disabled:opacity-50",
      )}
    >
      <IconArrowUp size={14} />
      {pending ? "…" : "Promover"}
    </button>
  );
}

export function GoalkeeperToggle({
  roundId,
  playerId,
  isGoalkeeper,
}: {
  roundId: string;
  playerId: string;
  isGoalkeeper: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={isGoalkeeper}
      aria-label={isGoalkeeper ? "Tirar do gol" : "Marcar como goleiro"}
      onClick={() => startTransition(() => alternarGoleiroAction(roundId, playerId))}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-pill border transition-colors duration-[120ms]",
        isGoalkeeper
          ? "border-yellow/50 bg-yellow/12 text-yellow"
          : "border-line text-ink-3 hover:border-line-strong hover:text-ink-2",
        pending && "opacity-50",
      )}
    >
      <IconGoalkeeper size={18} />
    </button>
  );
}
