"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/db/client";
import { lembrarJogador } from "./cookie";
import { resolverJogadorDaEntrada, type MotivoDaRecusa } from "./service";

/**
 * "Sou eu" — o único passo que o link de convidado adiciona ao bloco I.
 *
 * A action não muda presença nem nada do grupo: ela troca "tenho o link do
 * grupo" por "sou o Marcos", grava isso no aparelho e entrega a pessoa ao link
 * pessoal dela, que é quem sempre autorizou a presença. A regra de quem pode
 * responder por quem continua exatamente onde estava.
 *
 * Casca fina como as outras: valida a entrada, chama o serviço, grava o cookie
 * e redireciona. A conferência que protege o link (o `playerId` vem do client e
 * precisa ser do grupo daquele token) mora em `service.ts`, coberta por teste
 * de integração.
 */

const entradaSchema = z.object({
  token: z.string().trim().min(10).max(80),
  playerId: z.string().trim().min(1).max(40),
});

/** Só existe estado de erro: o caminho feliz sai daqui por `redirect`. */
export type EstadoDaEntrada = { erro: string | null };

const RECADO: Record<MotivoDaRecusa, string> = {
  "link-invalido": "Esse link não vale mais. Pede o novo pra quem organiza.",
  "jogador-fora-do-elenco":
    "Esse nome não está mais no elenco. Fala com quem organiza.",
};

export async function entrarComoJogadorAction(
  token: string,
  _anterior: EstadoDaEntrada,
  formData: FormData,
): Promise<EstadoDaEntrada> {
  const analise = entradaSchema.safeParse({
    token,
    playerId: formData.get("playerId"),
  });
  if (!analise.success) return { erro: "Esse link não vale mais." };

  const resolucao = await resolverJogadorDaEntrada(prisma, {
    publicToken: analise.data.token,
    playerId: analise.data.playerId,
  });
  if (!resolucao.ok) return { erro: RECADO[resolucao.motivo] };

  await lembrarJogador(resolucao.groupId, resolucao.selfToken);

  // `redirect` lança — precisa ficar fora de try/catch pra não ser engolido.
  redirect(`/p/${resolucao.selfToken}`);
}
