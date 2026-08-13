import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "live";
type Size = "lg" | "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  // Nunca há dois primários verdes na mesma tela.
  primary: "bg-green text-canvas hover:bg-green/90 active:bg-green/80",
  secondary:
    "bg-elevated text-ink border border-line hover:border-line-strong active:bg-elevated/70",
  ghost: "text-ink-2 hover:text-ink hover:bg-elevated/60",
  danger: "bg-red text-canvas hover:bg-red/90 active:bg-red/80",
  live: "bg-elevated text-red border border-red/60 hover:bg-red/10",
};

const SIZES: Record<Size, string> = {
  lg: "h-13 px-6 text-label", // 52px — ação crítica no mobile
  md: "h-11 px-5 text-label", // 44px — padrão
  // Compacto é o tipo e o respiro lateral, não o alvo: 44px é o mínimo de
  // toque do design system, e `sm` aparece em decisão de importação e em
  // "pular animação" — coisa que se toca com o polegar, em pé, no campo.
  sm: "min-h-11 px-4 text-caption",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-bold uppercase tracking-[0.1em] " +
  "transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] " +
  "active:translate-y-px disabled:opacity-[0.38] disabled:pointer-events-none " +
  "select-none whitespace-nowrap";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  ...props
}: CommonProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  block,
  className,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className)}
      {...props}
    />
  );
}

/** Alvo de 56px para ação de partida — usado no modo ao vivo. */
export function MatchActionButton({
  className,
  ...props
}: Omit<ComponentProps<"button">, "className"> & { className?: string }) {
  return (
    <button
      className={cn(
        BASE,
        "h-14 px-5 text-label bg-elevated border border-line-strong text-ink",
        "hover:border-ink-2 active:bg-elevated/70",
        className,
      )}
      {...props}
    />
  );
}
