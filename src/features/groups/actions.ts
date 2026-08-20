"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/db/client";
import {
  candidatosDeSlug,
  normalizarFormato,
  slugDisponivel,
  type Modalidade,
  type ModoGoleiro,
} from "@/domain/groups/setup";
import {
  LIMITE_GOLS_MAXIMO,
  LIMITE_MINUTOS_MAXIMO,
} from "@/domain/live/fim-de-partida";
import { proximaDataRecorrente } from "@/domain/schedule/recurrence";
import { requireGroupAccess, requireUsuario } from "@/features/auth/queries";
import { slugsExistentes } from "./queries";

const formatoSchema = z.object({
  sportType: z.enum(["SOCIETY", "FUTSAL", "CAMPO", "CUSTOM"]),
  teamCount: z.coerce.number().int(),
  fieldPlayersPerTeam: z.coerce.number().int(),
  goalkeepersPerTeam: z.coerce.number().int(),
  goalkeeperMode: z.enum(["FIXED_PER_TEAM", "POOL", "ROTATING", "BORROWED"]),
  defaultDurationMin: z.coerce.number().int(),
});

const criarGrupoSchema = formatoSchema.extend({
  name: z.string().trim().min(2, "Dá um nome com pelo menos 2 letras.").max(60),
  /** 0=domingo … 6=sábado. String única ou lista — o form manda checkbox. */
  recurringWeekdays: z.array(z.coerce.number().int().min(0).max(6)).max(7),
  defaultStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário no formato 20:30.")
    .nullable(),
  defaultVenue: z.string().trim().max(120).nullable(),
  defaultVenueUrl: z.url("Link do mapa inválido.").nullable(),
});

export type EstadoFormulario =
  | { status: "inicial" }
  | { status: "salvo" }
  | { status: "erro"; mensagem: string; campo?: string };

/**
 * Cria o grupo e já abre a primeira rodada — o organizador chegou aqui pra
 * marcar um fut, não pra admirar um grupo vazio (plano §9).
 */
export async function criarGrupoAction(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await requireUsuario("/novo");

  const bruto = {
    name: formData.get("name"),
    sportType: formData.get("sportType"),
    teamCount: formData.get("teamCount"),
    fieldPlayersPerTeam: formData.get("fieldPlayersPerTeam"),
    goalkeepersPerTeam: formData.get("goalkeepersPerTeam"),
    goalkeeperMode: formData.get("goalkeeperMode"),
    defaultDurationMin: formData.get("defaultDurationMin"),
    recurringWeekdays: formData.getAll("recurringWeekdays"),
    defaultStartTime: vazioViraNulo(formData.get("defaultStartTime")),
    defaultVenue: vazioViraNulo(formData.get("defaultVenue")),
    defaultVenueUrl: vazioViraNulo(formData.get("defaultVenueUrl")),
  };

  const analise = criarGrupoSchema.safeParse(bruto);
  if (!analise.success) {
    const problema = analise.error.issues[0];
    return {
      status: "erro",
      mensagem: problema.message,
      campo: String(problema.path[0] ?? ""),
    };
  }

  const dados = analise.data;
  const formato = normalizarFormato({
    teamCount: dados.teamCount,
    fieldPlayersPerTeam: dados.fieldPlayersPerTeam,
    goalkeepersPerTeam: dados.goalkeepersPerTeam,
    goalkeeperMode: dados.goalkeeperMode as ModoGoleiro,
    defaultDurationMin: dados.defaultDurationMin,
  });

  // Uma consulta só resolve o slug: pega os candidatos e escolhe o primeiro livre.
  const candidatos = candidatosDeSlug(dados.name);
  const ocupados = await slugsExistentes(candidatos);
  const slug = slugDisponivel(dados.name, ocupados);

  const grupo = await prisma.footballGroup.create({
    data: {
      name: dados.name,
      slug,
      sportType: dados.sportType as Modalidade,
      defaultVenue: dados.defaultVenue,
      defaultVenueUrl: dados.defaultVenueUrl,
      recurringWeekdays: [...new Set(dados.recurringWeekdays)].sort(),
      defaultStartTime: dados.defaultStartTime,
      defaultDurationMin: formato.defaultDurationMin,
      teamCount: formato.teamCount,
      fieldPlayersPerTeam: formato.fieldPlayersPerTeam,
      goalkeepersPerTeam: formato.goalkeepersPerTeam,
      goalkeeperMode: formato.goalkeeperMode,
      memberships: { create: { userId: usuario.id, role: "OWNER" } },
    },
  });

  const data = proximaDataRecorrente(
    grupo.recurringWeekdays,
    grupo.defaultStartTime,
  );

  await prisma.round.create({
    data: {
      groupId: grupo.id,
      date: data,
      startsAt: data,
      venue: grupo.defaultVenue,
      venueUrl: grupo.defaultVenueUrl,
      teamCount: grupo.teamCount,
      fieldPlayersPerTeam: grupo.fieldPlayersPerTeam,
      goalkeeperMode: grupo.goalkeeperMode,
    },
  });

  revalidatePath("/", "layout");
  // `redirect` lança — precisa ficar fora de try/catch pra não ser engolido.
  redirect(`/g/${grupo.slug}/rodada/importar`);
}

/** Edição da config do grupo, a partir da tela "Mais". */
export async function atualizarGrupoAction(
  groupId: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requireGroupAccess(groupId, "grupo:editar");

  const analise = criarGrupoSchema.safeParse({
    name: formData.get("name"),
    sportType: formData.get("sportType"),
    teamCount: formData.get("teamCount"),
    fieldPlayersPerTeam: formData.get("fieldPlayersPerTeam"),
    goalkeepersPerTeam: formData.get("goalkeepersPerTeam"),
    goalkeeperMode: formData.get("goalkeeperMode"),
    defaultDurationMin: formData.get("defaultDurationMin"),
    recurringWeekdays: formData.getAll("recurringWeekdays"),
    defaultStartTime: vazioViraNulo(formData.get("defaultStartTime")),
    defaultVenue: vazioViraNulo(formData.get("defaultVenue")),
    defaultVenueUrl: vazioViraNulo(formData.get("defaultVenueUrl")),
  });

  if (!analise.success) {
    const problema = analise.error.issues[0];
    return {
      status: "erro",
      mensagem: problema.message,
      campo: String(problema.path[0] ?? ""),
    };
  }

  const dados = analise.data;
  const formato = normalizarFormato({
    teamCount: dados.teamCount,
    fieldPlayersPerTeam: dados.fieldPlayersPerTeam,
    goalkeepersPerTeam: dados.goalkeepersPerTeam,
    goalkeeperMode: dados.goalkeeperMode as ModoGoleiro,
    defaultDurationMin: dados.defaultDurationMin,
  });

  // O slug não muda: link já compartilhado no grupo do WhatsApp continua valendo.
  await prisma.footballGroup.update({
    where: { id: groupId },
    data: {
      name: dados.name,
      sportType: dados.sportType as Modalidade,
      defaultVenue: dados.defaultVenue,
      defaultVenueUrl: dados.defaultVenueUrl,
      recurringWeekdays: [...new Set(dados.recurringWeekdays)].sort(),
      defaultStartTime: dados.defaultStartTime,
      defaultDurationMin: formato.defaultDurationMin,
      teamCount: formato.teamCount,
      fieldPlayersPerTeam: formato.fieldPlayersPerTeam,
      goalkeepersPerTeam: formato.goalkeepersPerTeam,
      goalkeeperMode: formato.goalkeeperMode,
    },
  });

  revalidatePath("/g", "layout");
  return { status: "salvo" };
}

/**
 * Troca o link de convidado do grupo — o botão de "vazou".
 *
 * O link vive numa conversa de WhatsApp, e conversa de WhatsApp é encaminhada.
 * Quem tem o link vê os nomes do elenco e pode responder presença no lugar de
 * qualquer um, então precisa existir um jeito de cortar isso sem migration nem
 * suporte: gravar outro token invalida o antigo na hora.
 *
 * O que a troca **não** desfaz: quem já entrou pelo link antigo escolheu um
 * nome e ficou com o link pessoal daquele jogador, que é outro token e não
 * muda aqui. Isso é de propósito — quem já entrou é o pessoal do grupo, e
 * derrubar os 22 junto transformaria "vazou" em "todo mundo recomeça".
 */
export async function regenerarLinkDeConvidadoAction(groupId: string): Promise<string> {
  await requireGroupAccess(groupId, "grupo:editar");

  // UUID v4 gerado aqui, e não pelo default do banco: `update` não dispara
  // default de coluna, e deixar o Postgres decidir exigiria SQL cru.
  const grupo = await prisma.footballGroup.update({
    where: { id: groupId },
    data: { publicToken: randomUUID() },
    select: { publicToken: true },
  });

  revalidatePath("/g", "layout");
  return grupo.publicToken;
}

function vazioViraNulo(valor: FormDataEntryValue | null): string | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto === "" ? null : texto;
}

const regrasDePartidaSchema = z.object({
  limiteGols: z.number().int().min(1).max(LIMITE_GOLS_MAXIMO).nullable(),
  limiteMinutos: z.number().int().min(1).max(LIMITE_MINUTOS_MAXIMO).nullable(),
});

/**
 * Grava a regra de fim de partida ("até 2 gols ou 8 minutos") no `settings`
 * do grupo. É merge, não substituição: o `settings` também guarda o
 * `matchRule` em texto livre e o que mais vier a morar lá.
 */
export async function salvarRegrasDePartidaAction(
  groupId: string,
  entrada: { limiteGols: number | null; limiteMinutos: number | null },
): Promise<{ status: "ok" } | { status: "erro"; mensagem: string }> {
  await requireGroupAccess(groupId, "grupo:editar");

  const analise = regrasDePartidaSchema.safeParse(entrada);
  if (!analise.success) {
    return { status: "erro", mensagem: "Números fora do intervalo. Confere e tenta de novo." };
  }

  const grupo = await prisma.footballGroup.findUniqueOrThrow({
    where: { id: groupId },
    select: { settings: true },
  });
  const atuais =
    grupo.settings && typeof grupo.settings === "object" && !Array.isArray(grupo.settings)
      ? grupo.settings
      : {};

  await prisma.footballGroup.update({
    where: { id: groupId },
    data: { settings: { ...atuais, partida: analise.data } },
  });

  revalidatePath("/g", "layout");
  return { status: "ok" };
}
