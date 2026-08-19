"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/primitives";
import { IconCheck, IconX } from "@/components/ui/icons";
import {
  mudarMinhaPresencaAction,
  type ResultadoDaMinhaPresenca,
} from "@/features/presenca/actions";

type Status = "CONFIRMED" | "WAITING" | "ABSENT" | null;

/**
 * Os dois botões do jogador. É a única coisa que ele decide — e o componente
 * não decide nada: manda a ação e desenha o que a regra devolveu.
 *
 * O estado local existe só pra resposta ser instantânea no 4G do campo; a
 * verdade continua vindo do servidor no `revalidatePath`.
 */
export function RespostaDoJogador({
  token,
  statusInicial,
  posicaoInicial,
  podeMexer,
  motivoFechado,
}: {
  token: string;
  statusInicial: Status;
  posicaoInicial: number;
  podeMexer: boolean;
  motivoFechado: string | null;
}) {
  const [status, setStatus] = useState<Status>(statusInicial);
  const [posicao, setPosicao] = useState(posicaoInicial);
  const [retorno, setRetorno] = useState<ResultadoDaMinhaPresenca | null>(null);
  const [pendente, iniciar] = useTransition();

  function responder(acao: "confirmar" | "cancelar") {
    iniciar(async () => {
      const resposta = await mudarMinhaPresencaAction(token, acao);
      setRetorno(resposta);
      if (resposta.ok) {
        setStatus(resposta.status);
        setPosicao(resposta.posicaoNaEspera);
      }
    });
  }

  if (!podeMexer) {
    return (
      <div className="flex flex-col gap-3">
        <EtiquetaDeStatus status={status} posicao={posicao} />
        <p className="text-body-s text-ink-3">
          {motivoFechado ?? "A lista dessa rodada já fechou."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <EtiquetaDeStatus status={status} posicao={posicao} />

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          variant={status === "CONFIRMED" || status === "WAITING" ? "secondary" : "primary"}
          disabled={pendente}
          onClick={() => responder("confirmar")}
        >
          <IconCheck size={17} />
          Tô dentro
        </Button>
        <Button
          size="lg"
          variant={status === "ABSENT" ? "secondary" : "danger"}
          disabled={pendente}
          onClick={() => responder("cancelar")}
        >
          <IconX size={17} />
          Não vou
        </Button>
      </div>

      {retorno && (
        <p
          // Resposta de ação: quem usa leitor de tela ouve sem precisar procurar.
          role="status"
          className={retorno.ok ? "text-body-s text-ink-2" : "text-body-s text-red"}
        >
          {retorno.ok ? retorno.mensagem : retorno.motivo}
          {retorno.ok && retorno.promovido && (
            <> {retorno.promovido} subiu da espera no seu lugar.</>
          )}
        </p>
      )}

      <p className="text-caption uppercase tracking-[0.06em] text-ink-3">
        Pode mudar de ideia quantas vezes quiser — esse link é só seu e vale sempre.
      </p>
    </div>
  );
}

function EtiquetaDeStatus({ status, posicao }: { status: Status; posicao: number }) {
  // Estado nunca só por cor: cor + ícone + palavra (design system).
  if (status === "CONFIRMED") {
    return (
      <Chip tone="green">
        <IconCheck size={13} />
        Você tá dentro
      </Chip>
    );
  }
  if (status === "WAITING") {
    return (
      <Chip tone="yellow">
        {posicao > 0 ? `Na espera · ${posicao}º da fila` : "Na espera"}
      </Chip>
    );
  }
  if (status === "ABSENT") {
    return (
      <Chip tone="red">
        <IconX size={13} />
        Você marcou que não vai
      </Chip>
    );
  }
  return <Chip tone="outline">Ainda não respondeu</Chip>;
}
