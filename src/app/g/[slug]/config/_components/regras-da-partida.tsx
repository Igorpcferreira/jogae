"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { IconCheck } from "@/components/ui/icons";
import {
  LIMITE_GOLS_MAXIMO,
  LIMITE_MINUTOS_MAXIMO,
  type RegrasDePartida,
} from "@/domain/live/fim-de-partida";
import { salvarRegrasDePartidaAction } from "@/features/groups/actions";

/**
 * "Partida vai até 2 gols ou 8 minutos" — a regra que todo fut de resenha tem
 * e cada grupo tem a sua. Com ela configurada, o ao vivo mostra quanto falta,
 * avisa e **apita** quando bater; campo em branco é "sem limite", e grupo que
 * joga sem regra nenhuma continua como sempre foi.
 */
export function RegrasDaPartida({
  groupId,
  inicial,
}: {
  groupId: string;
  inicial: RegrasDePartida;
}) {
  const [gols, setGols] = useState(inicial.limiteGols?.toString() ?? "");
  const [minutos, setMinutos] = useState(inicial.limiteMinutos?.toString() ?? "");
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();

  function interpretar(texto: string, maximo: number): number | null | "erro" {
    const limpo = texto.trim();
    if (!limpo) return null;
    const valor = Number(limpo);
    if (!Number.isInteger(valor) || valor < 1 || valor > maximo) return "erro";
    return valor;
  }

  function salvar() {
    const limiteGols = interpretar(gols, LIMITE_GOLS_MAXIMO);
    const limiteMinutos = interpretar(minutos, LIMITE_MINUTOS_MAXIMO);
    if (limiteGols === "erro" || limiteMinutos === "erro") {
      setErro(
        `Use números inteiros: gols de 1 a ${LIMITE_GOLS_MAXIMO}, minutos de 1 a ${LIMITE_MINUTOS_MAXIMO} — ou deixe em branco.`,
      );
      return;
    }
    setErro(null);
    iniciarSalvar(async () => {
      const resultado = await salvarRegrasDePartidaAction(groupId, {
        limiteGols,
        limiteMinutos,
      });
      if (resultado.status === "erro") {
        setErro(resultado.mensagem);
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:p-6">
      <div>
        <h2 className="font-display text-h2 leading-none text-ink">Fim de partida</h2>
        <p className="mt-2 text-body-s text-ink-2 text-pretty">
          Quando um time chega nos gols ou o relógio bate os minutos, o ao vivo
          mostra o aviso e <strong className="text-ink">apita no celular</strong>.
          Quem apita de verdade continua sendo você — o app não encerra sozinho.
          Deixe em branco o que não valer no seu fut.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Acaba com quantos gols?" hint="Em branco = sem limite">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITE_GOLS_MAXIMO}
            placeholder="ex.: 2"
            value={gols}
            onChange={(evento) => {
              setGols(evento.target.value);
              setSalvo(false);
            }}
          />
        </Field>
        <Field label="Ou em quantos minutos?" hint="Em branco = sem limite">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITE_MINUTOS_MAXIMO}
            placeholder="ex.: 8"
            value={minutos}
            onChange={(evento) => {
              setMinutos(evento.target.value);
              setSalvo(false);
            }}
          />
        </Field>
      </div>

      {erro && <p className="text-body-s text-red">{erro}</p>}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={salvando}
        onClick={salvar}
        className="self-start"
      >
        {salvo && <IconCheck size={15} />}
        {salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar regra"}
      </Button>
    </section>
  );
}
