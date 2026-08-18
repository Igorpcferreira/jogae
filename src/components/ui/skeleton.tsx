import { cn } from "@/lib/cn";

/**
 * Bloco de espera. O gradiente varre os mesmos neutros do palco
 * (`surface-2` → `elevated`), então o esqueleto dá lugar ao conteúdo sem
 * piscar de cinza claro pra escuro.
 *
 * `prefers-reduced-motion` congela a animação globalmente (globals.css); aí
 * sobra o bloco parado, que é exatamente o que se quer nesse caso.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,var(--color-surface-2)_0%,var(--color-elevated)_50%,var(--color-surface-2)_100%)]",
        className,
      )}
    />
  );
}
