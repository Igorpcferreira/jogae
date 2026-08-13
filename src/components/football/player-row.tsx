import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/primitives";
import { IconGoalkeeper } from "@/components/ui/icons";

export function PlayerRow({
  name,
  slot,
  meta,
  isGoalkeeper,
  waiting,
  accent,
  right,
  className,
}: {
  name: string;
  slot?: number | null;
  meta?: ReactNode;
  isGoalkeeper?: boolean;
  /** Espera aparece com tracejado e opacidade — estado não é só cor. */
  waiting?: boolean;
  accent?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 min-h-14",
        waiting && "opacity-55",
        className,
      )}
    >
      {typeof slot === "number" && (
        <span className="w-6 shrink-0 text-body-s tabular text-ink-3">
          {String(slot).padStart(2, "0")}
        </span>
      )}
      <Avatar name={name} size="sm" tone={accent} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-body font-medium text-ink">{name}</span>
          {isGoalkeeper && (
            <span title="Goleiro" className="text-yellow">
              <IconGoalkeeper size={15} />
            </span>
          )}
        </div>
        {meta && <div className="text-caption text-ink-3 truncate">{meta}</div>}
      </div>
      {right}
    </div>
  );
}

export function PlayerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line/60", className)}>{children}</div>
  );
}
