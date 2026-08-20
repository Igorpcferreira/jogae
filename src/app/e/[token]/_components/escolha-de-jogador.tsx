"use client";

import { useActionState, useMemo, useState } from "react";
import { normalizeName } from "@/domain/text/normalize";
import { cn } from "@/lib/cn";
import type { EstadoDaEntrada } from "@/features/entrada/actions";
import type { OpcaoDeEscolha } from "@/domain/roster/escolha-de-jogador";

const INICIAL: EstadoDaEntrada = { erro: null };

/**
 * "Quem é você?" — a única pergunta do link de convidado.
 *
 * É um `<form>` com um botão por nome, e não uma lista com `onClick`, porque
 * esta é a primeira tela que 21 pessoas vão abrir, do 4G do estacionamento:
 * `<form action={...}>` funciona no toque que acontece antes da hidratação
 * terminar. O filtro é enfeite que chega depois e não bloqueia ninguém.
 */
export function EscolhaDeJogador({
  acao,
  opcoes,
}: {
  acao: (estado: EstadoDaEntrada, formData: FormData) => Promise<EstadoDaEntrada>;
  opcoes: OpcaoDeEscolha[];
}) {
  const [estado, enviar, enviando] = useActionState(acao, INICIAL);
  const [busca, setBusca] = useState("");

  // Filtrar 22 nomes não justifica índice nenhum; normalizar sim, senão
  // "avila" não acha "Ávila" e a pessoa conclui que não está na lista.
  const filtradas = useMemo(() => {
    const alvo = normalizeName(busca);
    if (!alvo) return opcoes;
    return opcoes.filter((opcao) => normalizeName(opcao.nome).includes(alvo));
  }, [busca, opcoes]);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {opcoes.length > 10 && (
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar seu nome"
          aria-label="Buscar seu nome"
          className={cn(
            "h-11 w-full rounded-md border border-line bg-surface px-4",
            "text-body text-ink placeholder:text-ink-3",
            "focus:border-line-strong focus:outline-none",
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        {filtradas.map((opcao) => (
          <button
            key={opcao.id}
            type="submit"
            name="playerId"
            value={opcao.id}
            disabled={enviando}
            className={cn(
              "flex min-h-14 items-center justify-center rounded-md border border-line bg-surface px-3 py-2",
              "text-body font-medium text-ink transition-colors duration-[120ms]",
              "hover:border-line-strong active:bg-elevated disabled:opacity-40",
            )}
          >
            <span className="truncate">{opcao.nome}</span>
          </button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <p className="text-body-s text-ink-3">
          Nenhum nome com “{busca}”. Confere se tá escrito como o pessoal te chama.
        </p>
      )}

      {estado.erro && (
        <p role="status" className="text-body-s text-red">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
