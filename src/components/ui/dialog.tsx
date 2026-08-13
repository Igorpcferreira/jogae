"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconX } from "./icons";

/**
 * Folha que sobe de baixo — o padrão de diálogo do app no celular.
 *
 * Prende o foco dentro dela: sem isso, um Tab a mais leva o teclado pra lista
 * atrás do scrim, que continua clicável e não deveria estar. Fecha no Escape e
 * devolve o foco pra onde estava quando some.
 *
 * Montar/desmontar zera o estado do conteúdo — nada de `setState` em efeito
 * (regra do ESLint do Next 16). Quem abre passa `key` quando precisa disso.
 */

const FOCAVEIS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function Sheet({
  titulo,
  onFechar,
  children,
  rodape,
  acessorio,
  className,
  corpoClassName,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  /** Ocupa o canto do cabeçalho no lugar do X — quando fechar já está no rodapé. */
  acessorio?: ReactNode;
  className?: string;
  corpoClassName?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  // Foco entra ao abrir e volta pro gatilho ao fechar.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const inicial =
      caixa.current?.querySelector<HTMLElement>("[data-foco-inicial]") ??
      caixa.current?.querySelector<HTMLElement>(FOCAVEIS);
    inicial?.focus();

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
      anterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onFechar();
        return;
      }
      if (evento.key !== "Tab" || !caixa.current) return;

      // `offsetParent` nulo = elemento escondido; tabular pra ele prenderia o
      // foco num lugar invisível.
      const focaveis = Array.from(
        caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS),
      ).filter((elemento) => elemento.offsetParent !== null);
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      const dentro = caixa.current.contains(atual);

      if (evento.shiftKey && (atual === primeiro || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (atual === ultimo || !dentro)) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={onFechar}
        className="absolute inset-0 scrim"
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-xl",
          "border border-line-strong bg-elevated pb-safe shadow-3",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-[24px] leading-none text-ink">{titulo}</h2>
          {acessorio ?? (
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-sm text-ink-3 hover:text-ink"
            >
              <IconX size={18} />
            </button>
          )}
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col gap-5 overflow-y-auto p-5",
            corpoClassName,
          )}
        >
          {children}
        </div>

        {rodape && (
          <div className="flex flex-col gap-2 border-t border-line p-4">{rodape}</div>
        )}
      </div>
    </div>
  );
}
