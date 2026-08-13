"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import type { ParseResult } from "@/domain/list-parser/types";
import {
  requireGroupAccess,
  requireRoundAccess,
  requireTeamAccess,
} from "@/features/auth/queries";
import { TEAM_COLOR_ORDER } from "@/lib/team-colors";
import * as servico from "./service";

/**
 * As actions são casca: autorizam, validam a entrada e revalidam.
 * A conversa com o banco vive em `service.ts` — é lá que os testes de
 * integração batem.
 */

/* ── Importação da lista ───────────────────────────────────── */

export async function interpretarListaAction(
  roundId: string,
  rawText: string,
): Promise<ParseResult> {
  await requireRoundAccess(roundId, "rodada:presenca");
  return servico.interpretarLista(prisma, roundId, rawText);
}

const resolvedEntrySchema = z.object({
  name: z.string().min(1).max(80),
  section: z.enum(["confirmed", "goalkeepers", "waiting"]),
  /** null = criar jogador novo com esse nome. */
  playerId: z.string().nullable(),
  /** Nome original da lista, salvo como alias quando difere do cadastro. */
  rawName: z.string().max(120).optional(),
});

const applySchema = z.object({
  roundId: z.string().min(1),
  entries: z.array(resolvedEntrySchema).max(200),
});

export type ResolvedEntry = z.infer<typeof resolvedEntrySchema>;

export async function aplicarListaAction(input: {
  roundId: string;
  entries: ResolvedEntry[];
}): Promise<{ ok: true; confirmed: number; waiting: number }> {
  const { roundId, entries } = applySchema.parse(input);
  await requireRoundAccess(roundId, "rodada:presenca");

  const resultado = await servico.aplicarLista(prisma, roundId, entries);
  revalidatePath("/g", "layout");
  return resultado;
}

/* ── Presença ──────────────────────────────────────────────── */

export async function promoverDaEsperaAction(roundId: string, playerId: string) {
  await requireRoundAccess(roundId, "rodada:presenca");
  await servico.promoverDaEspera(prisma, roundId, playerId);
  revalidatePath("/g", "layout");
}

export async function definirPresencaAction(
  roundId: string,
  playerId: string,
  status: "CONFIRMED" | "WAITING" | "ABSENT",
) {
  await requireRoundAccess(roundId, "rodada:presenca");
  await servico.definirPresenca(prisma, roundId, playerId, status);
  revalidatePath("/g", "layout");
}

export async function alternarGoleiroAction(roundId: string, playerId: string) {
  await requireRoundAccess(roundId, "rodada:presenca");
  await servico.alternarGoleiro(prisma, roundId, playerId);
  revalidatePath("/g", "layout");
}

/* ── Sorteio ───────────────────────────────────────────────── */

export async function sortearTimesAction(
  roundId: string,
  mode: "RANDOM" | "BALANCED",
): Promise<{ ok: true; seed: string; spread: number }> {
  await requireRoundAccess(roundId, "rodada:sortear");
  const resultado = await servico.sortearTimes(prisma, roundId, mode);
  revalidatePath("/g", "layout");
  return resultado;
}

export async function trocarJogadoresAction(
  roundId: string,
  playerAId: string,
  playerBId: string,
) {
  await requireRoundAccess(roundId, "rodada:sortear");
  await servico.trocarJogadores(prisma, roundId, playerAId, playerBId);
  revalidatePath("/g", "layout");
}

export async function alternarTravaAction(roundId: string, playerId: string) {
  await requireRoundAccess(roundId, "rodada:sortear");
  await servico.alternarTrava(prisma, roundId, playerId);
  revalidatePath("/g", "layout");
}

/* ── Rodada ────────────────────────────────────────────────── */

export async function criarRodadaAction(groupId: string, date?: Date) {
  await requireGroupAccess(groupId, "rodada:criar");
  const rodada = await servico.criarRodada(prisma, groupId, date);
  revalidatePath("/g", "layout");
  return rodada;
}

export async function duplicarRodadaAction(
  groupId: string,
): Promise<{ ok: true; copiados: number } | { ok: false; motivo: string }> {
  await requireGroupAccess(groupId, "rodada:criar");

  const resultado = await servico.duplicarRodada(prisma, groupId);
  if (!resultado) {
    return { ok: false, motivo: "Não tem rodada anterior pra repetir ainda." };
  }

  revalidatePath("/g", "layout");
  return { ok: true, copiados: resultado.copiados };
}

/* ── Time ──────────────────────────────────────────────────── */

const timeSchema = z.object({
  name: z.string().trim().min(1, "O time precisa de um nome.").max(24),
  color: z.enum(TEAM_COLOR_ORDER),
});

export async function atualizarTimeAction(
  teamId: string,
  entrada: { name: string; color: string },
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  await requireTeamAccess(teamId, "rodada:sortear");

  const analise = timeSchema.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, motivo: analise.error.issues[0].message };
  }

  await servico.atualizarTime(prisma, teamId, analise.data);
  revalidatePath("/g", "layout");
  return { ok: true };
}
