import type { ComponentType, SVGProps } from "react";
import { CONQUISTAS, type TipoDeConquista } from "@/domain/badges/conquistas";
import {
  IconBall,
  IconGoal,
  IconAssist,
  IconStar,
  IconStreak,
  IconTrophy,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Conquista desenhada (plano §27). O que ela é, quanto vale e de que cor —
 * tudo vem do domínio; aqui mora só o ícone, que é assunto de tela.
 *
 * Cor sozinha não conta estado (design system): cada conquista tem cor **e**
 * ícone **e** o nome escrito por extenso.
 */

type Icone = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const ICONES: Record<TipoDeConquista, Icone> = {
  artilheiro: IconGoal,
  garcom: IconAssist,
  "presenca-de-ferro": IconStreak,
  "hat-trick": IconBall,
  mvp: IconTrophy,
  estreia: IconStar,
};

const TONS: Record<string, { texto: string; fundo: string }> = {
  green: { texto: "text-green", fundo: "bg-green/12 border-green/40" },
  yellow: { texto: "text-yellow", fundo: "bg-yellow/12 border-yellow/40" },
  red: { texto: "text-red", fundo: "bg-red/12 border-red/40" },
  pink: { texto: "text-pink", fundo: "bg-pink/12 border-pink/40" },
};

export function ConquistaCard({
  tipo,
  valor,
  nome,
  className,
  style,
}: {
  tipo: TipoDeConquista;
  valor: number;
  nome: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const meta = CONQUISTAS[tipo];
  const Icone = ICONES[tipo];
  const tom = TONS[meta.tom];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-3",
        className,
      )}
      style={style}
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
      <div className="min-w-0">
        <div
          className={cn(
            "text-caption font-bold uppercase tracking-[0.1em]",
            tom.texto,
          )}
        >
          {meta.rotulo}
        </div>
        <div className="mt-0.5 truncate text-body font-medium text-ink">{nome}</div>
        <div className="text-body-s text-ink-3">{meta.descricao(valor)}</div>
      </div>
    </div>
  );
}
