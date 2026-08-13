"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { requireMatchAccess, requireRoundAccess } from "@/features/auth/queries";
import { conferirJogadoresDoGrupo } from "@/features/rounds/service";
import * as servico from "./service";

/**
 * Casca fina: autoriza, chama o serviço e revalida.
 * O I/O de verdade está em `service.ts`.
 */

export async function iniciarPartidaAction(
  roundId: string,
  teamAId: string,
  teamBId: string,
) {
  await requireRoundAccess(roundId, "partida:gerenciar");
  const partida = await servico.iniciarPartida(prisma, roundId, teamAId, teamBId);
  revalidatePath("/g", "layout");
  return partida;
}

export async function registrarGolAction(input: {
  matchId: string;
  teamId: string;
  playerId?: string | null;
  assistPlayerId?: string | null;
  ownGoal?: boolean;
  minute?: number | null;
  /** Id da fila offline — reenvio do mesmo lance não duplica o placar. */
  clientEventId?: string | null;
}) {
  const { groupId } = await requireMatchAccess(input.matchId, "partida:gerenciar");

  // Autor e assistência têm que ser jogadores deste grupo — o id vem do client.
  await conferirJogadoresDoGrupo(prisma, groupId, [input.playerId, input.assistPlayerId]);

  await servico.registrarGol(prisma, input);
  revalidatePath("/g", "layout");
}

export async function desfazerUltimoLanceAction(matchId: string) {
  await requireMatchAccess(matchId, "partida:gerenciar");
  await servico.desfazerUltimoLance(prisma, matchId);
  revalidatePath("/g", "layout");
}

export async function encerrarPartidaAction(matchId: string) {
  await requireMatchAccess(matchId, "partida:gerenciar");
  await servico.encerrarPartida(prisma, matchId);
  revalidatePath("/g", "layout");
}

export async function encerrarRodadaAction(roundId: string) {
  await requireRoundAccess(roundId, "rodada:encerrar");
  await servico.encerrarRodada(prisma, roundId);
  revalidatePath("/g", "layout");
}
