"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import type { AvisoDePresenca } from "@/domain/attendance/presenca";
import { requireAcessoPorLinkPessoal } from "@/features/auth/queries";
import { getCurrentRoundId } from "@/features/rounds/queries";
import { mudarPresenca } from "@/features/rounds/service";

/**
 * A porta do jogador: dois botões, nenhuma conta.
 *
 * A action é casca como todas as outras — o que muda é a credencial. Aqui não
 * existe sessão: quem autoriza é `requireAcessoPorLinkPessoal`, e o token
 * autoriza um jogador só. Ele nunca aceita `playerId` nem `roundId` vindos do
 * client, senão o link de um viraria a presença de outro.
 */

const entradaSchema = z.object({
  token: z.string().trim().min(10).max(80),
  acao: z.enum(["confirmar", "cancelar"]),
});

export type ResultadoDaMinhaPresenca =
  | { ok: false; motivo: string }
  | {
      ok: true;
      status: "CONFIRMED" | "WAITING" | "ABSENT";
      mensagem: string;
      posicaoNaEspera: number;
      avisos: AvisoDePresenca[];
      /** Nome de quem subiu da espera, quando alguém subiu. */
      promovido: string | null;
    };

export async function mudarMinhaPresencaAction(
  token: string,
  acao: "confirmar" | "cancelar",
): Promise<ResultadoDaMinhaPresenca> {
  const analise = entradaSchema.safeParse({ token, acao });
  if (!analise.success) return { ok: false, motivo: "Esse link não vale mais." };

  const jogador = await requireAcessoPorLinkPessoal(analise.data.token);

  const roundId = await getCurrentRoundId(jogador.group.id);
  if (!roundId) {
    return { ok: false, motivo: "Ainda não tem rodada marcada. Volta depois." };
  }

  const { resultado, promovido } = await mudarPresenca(prisma, {
    roundId,
    playerId: jogador.id,
    acao: analise.data.acao,
    origem: "PLAYER",
  });

  if (!resultado.ok) return { ok: false, motivo: resultado.motivo };

  // A rodada mudou pros dois lados: pro organizador (`/g/**`), pra página
  // pública da rodada e pro próprio link de quem clicou.
  revalidatePath("/g", "layout");
  revalidatePath("/r", "layout");
  revalidatePath(`/p/${analise.data.token}`);

  return {
    ok: true,
    status: resultado.status,
    mensagem: resultado.mensagem,
    posicaoNaEspera: resultado.posicaoNaEspera,
    avisos: resultado.avisos,
    promovido: promovido?.displayName ?? null,
  };
}
