import type { ComponentType, SVGProps } from "react";
import { RECORDES, type TipoDeRecorde } from "@/domain/statistics/recordes";
import {
  IconBall,
  IconAssist,
  IconStreak,
  IconTrophy,
  IconStar,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Recorde pessoal desenhado (plano §27).
 *
 * Irmão do `ConquistaCard` e de propósito parecido, mas não o mesmo componente:
 * conquista é disputada (você é *o* artilheiro do mês) e recorde é seu contra
 * você mesmo. Misturar os dois numa lista só faria a pessoa achar que ganhou de
 * alguém.
 */

type Icone = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const ICONES: Record<TipoDeRecorde, Icone> = {
  "gols-na-rodada": IconBall,
  "assistencias-na-rodada": IconAssist,
  "participacoes-na-rodada": IconStar,
  "vitorias-na-rodada": IconTrophy,
  "sequencia-de-presenca": IconStreak,
};

const TONS: Record<string, { texto: string; fundo: string }> = {
  green: { texto: "text-green", fundo: "bg-green/12 border-green/40" },
  yellow: { texto: "text-yellow", fundo: "bg-yellow/12 border-yellow/40" },
  red: { texto: "text-red", fundo: "bg-red/12 border-red/40" },
  pink: { texto: "text-pink", fundo: "bg-pink/12 border-pink/40" },
};

export function RecordeCard({
  tipo,
  valor,
  quando,
  className,
}: {
  tipo: TipoDeRecorde;
  valor: number;
  /** Quando a marca foi feita, já formatado. A sequência não tem uma data só. */
  quando?: string | null;
  className?: string;
}) {
  const meta = RECORDES[tipo];
  const Icone = ICONES[tipo];
  const tom = TONS[meta.tom];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-3",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-pill border",
          tom.fundo,
          tom.texto,
        )}
      >
        <Icone size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-caption font-bold uppercase tracking-[0.1em]", tom.texto)}>
          {meta.rotulo}
        </div>
        <div className="mt-0.5 text-body font-medium text-ink">
          {meta.descricao(valor)}
        </div>
        {quando && <div className="text-body-s text-ink-3">{quando}</div>}
      </div>
      <span className="font-display text-score-m tabular leading-none text-ink-2">
        {valor}
      </span>
    </div>
  );
}
