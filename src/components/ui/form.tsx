"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

/* ── Campo ─────────────────────────────────────────────────── */

const CONTROLE_BASE =
  "w-full rounded-sm border border-line bg-surface px-3.5 text-body text-ink " +
  "placeholder:text-ink-3/60 transition-colors duration-[120ms] " +
  "hover:border-line-strong focus:border-line-strong " +
  "disabled:opacity-[0.38] disabled:pointer-events-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROLE_BASE, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROLE_BASE, "resize-y py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROLE_BASE, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Rótulo + controle + dica/erro amarrados por id.
 * Erro nunca é só cor: vem com texto e `aria-invalid`.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-body-s text-red">{error}</p>
      ) : hint ? (
        <p className="text-body-s text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Escolha por chip ──────────────────────────────────────── */

export interface OpcaoChip<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Radio group desenhado como chip. Radio de verdade por baixo: teclado e
 * leitor de tela continuam funcionando, e o form serializa sozinho.
 */
export function ChipRadioGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  hint,
  columns = 2,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<OpcaoChip<T>>;
  value: T;
  onChange: (value: T) => void;
  hint?: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const grupo = useId();
  const colunas = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }[columns];

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
        {label}
      </legend>
      <div className={cn("grid gap-2", colunas)}>
        {options.map((option) => {
          const id = `${grupo}-${option.value}`;
          const ativo = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-sm border px-3 py-2",
                "transition-colors duration-[120ms]",
                ativo
                  ? "border-green/60 bg-green/12 text-ink"
                  : "border-line bg-surface text-ink-2 hover:border-line-strong",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
                "has-[:focus-visible]:outline-yellow has-[:focus-visible]:outline-offset-2",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={ativo}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="text-body-s font-medium">{option.label}</span>
              {option.hint && <span className="text-caption text-ink-3">{option.hint}</span>}
            </label>
          );
        })}
      </div>
      {hint && <p className="text-body-s text-ink-3">{hint}</p>}
    </fieldset>
  );
}

/* ── Contador ──────────────────────────────────────────────── */

/** −/+ com alvo de 44px: no celular ninguém acerta stepper nativo. */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 12,
  hint,
  sufixo,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: ReactNode;
  sufixo?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="flex items-center gap-2 rounded-sm border border-line bg-surface p-1"
      >
        <BotaoStepper
          rotulo={`Diminuir ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </BotaoStepper>
        <output className="flex-1 text-center font-display text-[22px] leading-none text-ink tabular">
          {value}
          {sufixo && <span className="ml-1 text-body-s text-ink-3">{sufixo}</span>}
        </output>
        <BotaoStepper
          rotulo={`Aumentar ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </BotaoStepper>
      </div>
      {hint && <p className="text-body-s text-ink-3">{hint}</p>}
    </div>
  );
}

function BotaoStepper({
  rotulo,
  children,
  ...props
}: ComponentProps<"button"> & { rotulo: string }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      className={cn(
        "size-11 shrink-0 rounded-sm border border-line bg-elevated text-[20px] leading-none text-ink",
        "transition-colors duration-[120ms] hover:border-line-strong",
        "disabled:opacity-[0.38] disabled:pointer-events-none",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
