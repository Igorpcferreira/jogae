"use client";

import { useState, useTransition } from "react";
import { Chip } from "@/components/ui/primitives";
import { IconCheck, IconPlayers } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  votarNoCraqueAction,
  type ResultadoDoVotoAction,
} from "@/features/mvp/actions";

/**
 * A urna da "Escolha da galera" na tela do jogador.
 *
 * O componente não decide nada: quem pode votar, em quem, e até quando é
 * resposta do servidor (`domain/mvp/votacao.ts`). Aqui só tem o toque.
 *
 * O que **não** aparece de propósito: estatística ao lado do nome. Mostrar
 * "Igão — 3 gols" seria o app sugerindo o voto, e aí a votação vira o craque
 * calculado com passos a mais. O ponto dela é justamente premiar o que o número
 * não vê — o goleiro que fez dez defesas.
 */
export function VotacaoDoCraque({
  token,
  roundId,
  candidatos,
  fechaEm,
}: {
  token: string;
  roundId: string;
  candidatos: Array<{ id: string; nome: string }>;
  fechaEm: string | null;
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [retorno, setRetorno] = useState<ResultadoDoVotoAction | null>(null);
  const [pendente, iniciar] = useTransition();

  function votar(votedPlayerId: string) {
    setEscolhido(votedPlayerId);
    iniciar(async () => {
      const resposta = await votarNoCraqueAction(token, roundId, votedPlayerId);
      setRetorno(resposta);
      if (!resposta.ok) setEscolhido(null);
    });
  }

  if (retorno?.ok) {
    return (
      <div className="flex flex-col gap-2">
        <Chip tone="green">
          <IconCheck size={13} />
          Voto computado
        </Chip>
        <p className="text-body-s text-ink-2">
          Seu voto é secreto — nem quem organiza vê em quem você votou. O
          resultado sai quando a votação fechar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-s text-ink-2">
        Quem foi o cara da rodada? Vale um voto, e ele é secreto.
        {fechaEm && <> A votação fecha {fechaEm}.</>}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {candidatos.map((candidato) => (
          <button
            key={candidato.id}
            type="button"
            disabled={pendente}
            onClick={() => votar(candidato.id)}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-md border px-3 py-2",
              "text-body font-medium transition-colors duration-[120ms] disabled:opacity-40",
              escolhido === candidato.id
                ? "border-transparent bg-yellow text-canvas"
                : "border-line bg-surface text-ink hover:border-line-strong active:bg-elevated",
            )}
          >
            <span className="truncate">{candidato.nome}</span>
          </button>
        ))}
      </div>

      {retorno && !retorno.ok && (
        <p role="status" className="text-body-s text-red">
          {retorno.motivo}
        </p>
      )}

      <p className="inline-flex items-center gap-1.5 text-caption uppercase tracking-[0.06em] text-ink-3">
        <IconPlayers size={13} />O craque calculado sai do número; este sai da galera.
      </p>
    </div>
  );
}
