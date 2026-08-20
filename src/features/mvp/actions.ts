"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireAcessoPorLinkPessoal } from "@/features/auth/queries";
import { registrarVoto, type MotivoDaRecusa } from "./service";

/**
 * O voto da "Escolha da galera", dado pelo link pessoal do jogador.
 *
 * A credencial é a mesma da presença (`Player.selfToken`, bloco I), e é ela que
 * faz "um voto por pessoa" sair de graça: sem conta, sem cadastro, sem app.
 * O `voterPlayerId` **nunca** vem do client — vem do token. Aceitar quem vota
 * como parâmetro seria deixar qualquer um votar no lugar de todo mundo.
 *
 * O `roundId` vem do client, e por isso o serviço confere que ele é do grupo do
 * votante.
 */

const votoSchema = z.object({
  token: z.string().trim().min(10).max(80),
  roundId: z.string().trim().min(1).max(40),
  votedPlayerId: z.string().trim().min(1).max(40),
});

export type ResultadoDoVotoAction =
  | { ok: true; mensagem: string }
  | { ok: false; motivo: string };

const RECADO: Record<MotivoDaRecusa, string> = {
  "rodada-nao-acabou": "A votação abre quando a rodada terminar.",
  "votacao-fechada": "A votação dessa rodada já fechou.",
  "nao-jogou": "Só quem jogou a rodada vota.",
  "ja-votou": "Você já votou nessa rodada.",
  "votou-em-si": "Vota em outro, vai.",
  "votado-nao-jogou": "Esse aí não jogou a rodada.",
  "rodada-nao-encontrada": "Rodada não encontrada.",
  "rodada-de-outro-grupo": "Rodada não encontrada.",
};

export async function votarNoCraqueAction(
  token: string,
  roundId: string,
  votedPlayerId: string,
): Promise<ResultadoDoVotoAction> {
  const analise = votoSchema.safeParse({ token, roundId, votedPlayerId });
  if (!analise.success) return { ok: false, motivo: "Esse link não vale mais." };

  const jogador = await requireAcessoPorLinkPessoal(analise.data.token);

  const resultado = await registrarVoto(prisma, {
    roundId: analise.data.roundId,
    groupId: jogador.groupId,
    voterPlayerId: jogador.id,
    votedPlayerId: analise.data.votedPlayerId,
  });

  if (!resultado.ok) return { ok: false, motivo: RECADO[resultado.motivo] };

  // A escolha da galera aparece na página pública da rodada e vira conquista
  // no grupo — as duas precisam saber que a urna mexeu.
  revalidatePath("/g", "layout");
  revalidatePath("/r", "layout");
  revalidatePath(`/p/${analise.data.token}`);

  return { ok: true, mensagem: "Voto computado. Vale um por rodada." };
}
