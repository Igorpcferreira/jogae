"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { requireGroupAccess } from "@/features/auth/queries";
import { criarClientAdministrativo, criarClientDoServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/base-url";
import * as servico from "./service";

/**
 * Casca fina: autoriza com `membros:gerenciar` (só o dono tem), valida a
 * entrada e revalida. Quem decide se a mudança é legítima é o domínio, via
 * `service.ts`.
 */

export type ResultadoMembro =
  | { ok: true; aviso?: string }
  | { ok: false; motivo: string };

const papelSchema = z.enum(["OWNER", "ADMIN", "ASSISTANT"]);

const conviteSchema = z.object({
  groupId: z.string().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email("Esse e-mail não parece certo.")),
  role: papelSchema,
});

export async function convidarMembroAction(entrada: {
  groupId: string;
  email: string;
  role: string;
}): Promise<ResultadoMembro> {
  const analise = conviteSchema.safeParse(entrada);
  if (!analise.success) {
    return { ok: false, motivo: analise.error.issues[0].message };
  }

  await requireGroupAccess(analise.data.groupId, "membros:gerenciar");

  // O vínculo é registrado antes do e-mail: se o envio falhar, a pessoa ainda
  // entra por conta própria e o convite é aplicado no login.
  const resultado = await servico.convidar(prisma, analise.data);
  if (!resultado.ok) return { ok: false, motivo: resultado.motivo };

  const aviso = await avisarConvidado(resultado.email);

  revalidatePath("/g", "layout");
  return aviso ? { ok: true, aviso } : { ok: true };
}

/**
 * Manda o e-mail de convite. Devolve um aviso pro organizador quando o convite
 * ficou registrado mas o e-mail não saiu — silenciar viraria "convidei e a
 * pessoa nunca recebeu", sem rastro.
 */
async function avisarConvidado(email: string): Promise<string | null> {
  // Mesmo motivo do login por e-mail: convite é aberto no celular.
  const destino = `${await urlBase()}/auth/confirm`;

  try {
    const admin = criarClientAdministrativo();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: destino,
    });
    if (!error) return null;

    // Quem já tem conta não pode ser "convidado" de novo: manda link de acesso.
    const supabase = await criarClientDoServidor();
    const { error: erroDeLink } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: destino },
    });
    if (!erroDeLink) return null;

    return "Convite registrado, mas o e-mail não saiu. Avise a pessoa pra entrar pelo app.";
  } catch {
    return (
      "Convite registrado, mas o envio de e-mail não está configurado " +
      "(SUPABASE_SECRET_KEY). A pessoa entra pelo app e o convite é aplicado."
    );
  }
}

export async function revogarConviteAction(
  groupId: string,
  conviteId: string,
): Promise<ResultadoMembro> {
  await requireGroupAccess(groupId, "membros:gerenciar");
  await servico.revogarConvite(prisma, groupId, conviteId);
  revalidatePath("/g", "layout");
  return { ok: true };
}

export async function trocarPapelAction(
  groupId: string,
  userId: string,
  novoPapel: string,
): Promise<ResultadoMembro> {
  const papel = papelSchema.safeParse(novoPapel);
  if (!papel.success) return { ok: false, motivo: "Papel desconhecido." };

  await requireGroupAccess(groupId, "membros:gerenciar");

  const veredito = await servico.trocarPapel(prisma, {
    groupId,
    userId,
    novoPapel: papel.data,
  });
  if (!veredito.ok) return { ok: false, motivo: veredito.motivo };

  revalidatePath("/g", "layout");
  return { ok: true };
}

export async function removerMembroAction(
  groupId: string,
  userId: string,
): Promise<ResultadoMembro> {
  await requireGroupAccess(groupId, "membros:gerenciar");

  const veredito = await servico.removerMembro(prisma, { groupId, userId });
  if (!veredito.ok) return { ok: false, motivo: veredito.motivo };

  revalidatePath("/g", "layout");
  return { ok: true };
}
