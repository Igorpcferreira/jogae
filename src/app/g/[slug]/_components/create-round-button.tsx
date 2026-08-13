"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconHistory } from "@/components/ui/icons";
import { criarRodadaAction, duplicarRodadaAction } from "@/features/rounds/actions";

/**
 * Duas saídas pro mesmo lugar. "Repetir a última" só aparece quando existe
 * rodada com gente: no fut fixo é o caminho de sempre, e reimportar a lista
 * toda semana é trabalho à toa (plano §52).
 */
export function CreateRoundButton({
  groupId,
  podeRepetir,
}: {
  groupId: string;
  podeRepetir?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {podeRepetir && (
          <Button
            size="lg"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setErro(null);
                const resultado = await duplicarRodadaAction(groupId);
                if (!resultado.ok) {
                  setErro(resultado.motivo);
                  return;
                }
                router.refresh();
              })
            }
          >
            <IconHistory size={17} />
            {pending ? "Repetindo…" : "Repetir a última"}
          </Button>
        )}
        <Button
          size="lg"
          variant={podeRepetir ? "secondary" : "primary"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setErro(null);
              await criarRodadaAction(groupId);
              router.refresh();
            })
          }
        >
          {pending ? "Criando…" : podeRepetir ? "Começar do zero" : "Criar rodada"}
        </Button>
      </div>
      {erro && <p className="text-body-s text-red">{erro}</p>}
    </div>
  );
}
