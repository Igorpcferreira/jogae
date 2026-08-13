"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Sorteio: 1400ms, pulável desde o frame 2.
 * Linhas de campo → trajetória → faixas dos times acendendo.
 * Com reduced motion a animação é ignorada e o resultado aparece direto.
 */
export function DrawOverlay({ onSkip }: { onSkip: () => void }) {
  const [frame, setFrame] = useState(0);

  // O overlay só existe enquanto o sorteio roda, então a sequência começa
  // na montagem e não precisa ser resetada.
  useEffect(() => {
    const timers = [200, 500, 900, 1400].map((delay, index) =>
      setTimeout(() => setFrame(index + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const stripes = ["bg-green", "bg-yellow", "bg-red", "bg-pink"];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center scrim backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm px-6">
        <div className="relative h-56 overflow-hidden rounded-lg border border-line bg-surface">
          <div className="texture-grid absolute inset-0" aria-hidden />
          <div
            className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/15 transition-opacity duration-300"
            style={{ opacity: frame >= 1 ? 1 : 0 }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-1/2 w-px bg-ink/10 transition-opacity duration-300"
            style={{ opacity: frame >= 1 ? 1 : 0 }}
            aria-hidden
          />

          <svg
            viewBox="0 0 320 224"
            className="absolute inset-0 size-full"
            aria-hidden
            style={{ opacity: frame >= 2 ? 1 : 0, transition: "opacity 200ms" }}
          >
            <path
              d="M10 200 C110 200 170 60 312 24"
              stroke="#FF4FA3"
              strokeWidth="2"
              strokeDasharray="5 8"
              fill="none"
            />
            <circle cx="18" cy="198" r="6" fill="#FF4FA3" />
          </svg>

          <div className="absolute inset-x-6 bottom-6 flex flex-col gap-2">
            {stripes.map((stripe, index) => (
              <div
                key={stripe}
                className={`h-2.5 rounded-pill ${stripe} origin-left transition-transform duration-300 ease-[cubic-bezier(0.2,1.3,0.35,1)]`}
                style={{
                  transform: frame >= 3 ? "scaleX(1)" : "scaleX(0)",
                  transitionDelay: `${index * 40}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <p className="mt-5 text-center font-display text-[26px] leading-none text-ink">
          Sorteando…
        </p>

        {frame >= 1 && (
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Pular
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
