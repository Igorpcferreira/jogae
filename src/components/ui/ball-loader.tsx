import { cn } from "@/lib/cn";

/**
 * Espera do parser: a bola percorre a mesma trajetória do símbolo da marca
 * em vez de um ícone girando. O movimento usa `offset-path` com o keyframe
 * `trail` (globals.css) — `prefers-reduced-motion` já congela a animação
 * globalmente, e aí sobra a bola parada no início do caminho.
 */
export function BallLoader({
  size = 72,
  className,
  label = "Carregando",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 52 52" width={size} height={size} aria-hidden>
        <path
          d="M8 44 C30 44 40 26 40 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 5"
          className="text-line-strong"
        />
        <path
          d="M34 8 H46"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-ink-3"
        />
      </svg>

      <span
        aria-hidden
        className="absolute left-0 top-0 block size-2.5 rounded-pill bg-green animate-trail"
        style={{
          // O caminho precisa estar na mesma escala do SVG acima.
          offsetPath: `path("M ${(8 / 52) * size} ${(44 / 52) * size} C ${(30 / 52) * size} ${(44 / 52) * size}, ${(40 / 52) * size} ${(26 / 52) * size}, ${(40 / 52) * size} ${(8 / 52) * size}")`,
          offsetAnchor: "center",
        }}
      />
    </div>
  );
}
