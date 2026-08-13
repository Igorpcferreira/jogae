import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ── Superfícies ───────────────────────────────────────────── */

export function Card({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-surface p-4 sm:p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Panel({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn("rounded-sm border border-line bg-surface-2 overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Tipografia ────────────────────────────────────────────── */

export function SectionLabel({
  className,
  children,
  action,
}: {
  className?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-3", className)}>
      <h2 className="text-h3 font-bold uppercase tracking-[0.14em] text-ink-3">{children}</h2>
      {action}
    </div>
  );
}

export function Display({
  as: Tag = "h1",
  className,
  children,
}: {
  as?: "h1" | "h2" | "div";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("font-display text-h1 leading-[1.05] text-ink", className)}>
      {children}
    </Tag>
  );
}

/* ── Chips e status ────────────────────────────────────────── */

type ChipTone = "neutral" | "green" | "yellow" | "red" | "pink" | "outline";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-elevated text-ink-2 border-line",
  green: "bg-green/12 text-green border-green/40",
  yellow: "bg-yellow/12 text-yellow border-yellow/40",
  red: "bg-red/12 text-red border-red/40",
  pink: "bg-pink/12 text-pink border-pink/40",
  outline: "bg-transparent text-ink-3 border-line border-dashed",
};

export function Chip({
  tone = "neutral",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1",
        "text-caption font-bold uppercase tracking-[0.06em] whitespace-nowrap",
        CHIP_TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Ao vivo = vermelho + ponto pulsando + a palavra. Estado nunca é só cor. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-red/50 bg-red/12 px-2.5 py-1",
        "text-caption font-bold uppercase tracking-[0.1em] text-red",
        className,
      )}
    >
      <span className="size-1.5 rounded-pill bg-red animate-live-pulse" aria-hidden />
      Ao vivo
    </span>
  );
}

/* ── Avatar ────────────────────────────────────────────────── */

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  tone,
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: string;
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-[11px]",
    md: "size-10 text-[13px]",
    lg: "size-14 text-[16px]",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill",
        "border border-line bg-elevated font-bold tracking-wide text-ink-2",
        sizes[size],
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ── Estados vazios ────────────────────────────────────────── */

export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-dashed border-line",
        "bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <div className="texture-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="relative flex flex-col items-center gap-4">
        <p className="max-w-[28ch] text-body text-ink-2 text-balance">{title}</p>
        {action}
      </div>
    </div>
  );
}

/* ── Estatística ───────────────────────────────────────────── */

export function StatBlock({
  value,
  label,
  tone = "text-ink",
  className,
}: {
  value: ReactNode;
  label: string;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className={cn("font-display text-score-m tabular leading-[0.9]", tone)}>
        {value}
      </span>
      <span className="text-caption font-medium uppercase tracking-[0.06em] text-ink-3">
        {label}
      </span>
    </div>
  );
}
