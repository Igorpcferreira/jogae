"use server";

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

function vazioViraNulo(valor: FormDataEntryValue | null): string | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto === "" ? null : texto;
}
