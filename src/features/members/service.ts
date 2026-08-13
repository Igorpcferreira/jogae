import type { Role } from "@/domain/access/permissions";
import {
  podeConvidar,
  podeRemoverMembro,
  podeTrocarPapel,
  type Veredito,
} from "@/domain/access/membros";
import type { Db } from "@/db/types";

/**
 * Composição do grupo no banco. Como todo serviço daqui, recebe o client por
 * parâmetro e não sabe de sessão nem de `revalidatePath` — quem autoriza é a
 * action; o que este arquivo garante é que o grupo nunca fica sem dono.
 */

/**
 * Convite vale 7 dias. Ninguém abre e-mail de convite no mesmo dia, e convite
 * eterno vira porta esquecida aberta.
 */
export const DURACAO_CONVITE_MS = 7 * 24 * 60 * 60 * 1000;

export interface MembroDoGrupo {
  userId: string;
  name: string;
  email: string;
  role: Role;
  desde: Date;
}

export interface ConviteAberto {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
  createdAt: Date;
  /** Contado aqui: a tela é componente e não pode ler o relógio no render. */
  expiraEmDias: number;
}

export async function listarMembros(db: Db, groupId: string): Promise<MembroDoGrupo[]> {
  const membros = await db.membership.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return membros.map((membro) => ({
    userId: membro.user.id,
    name: membro.user.name,
    email: membro.user.email,
    role: membro.role,
    desde: membro.createdAt,
  }));
}

/** Convites emitidos e ainda não usados nem vencidos. */
export async function listarConvites(db: Db, groupId: string): Promise<ConviteAberto[]> {
  const agora = new Date();
  const convites = await db.invite.findMany({
    where: { groupId, consumedAt: null, expiresAt: { gt: agora } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });

  return convites.map((convite) => ({
    ...convite,
    expiraEmDias: Math.max(
      0,
      Math.ceil((convite.expiresAt.getTime() - agora.getTime()) / 86_400_000),
    ),
  }));
}

async function contarDonos(db: Db, groupId: string): Promise<number> {
  return db.membership.count({ where: { groupId, role: "OWNER" } });
}

export type ResultadoConvite =
  | { ok: true; email: string }
  | { ok: false; motivo: string };

/**
 * Registra o convite. Não há token: o convite é resgatado quando alguém entra
 * com aquele e-mail, e quem garante que o e-mail é dele é o provedor de auth.
 */
export async function convidar(
  db: Db,
  entrada: { groupId: string; email: string; role: Role },
): Promise<ResultadoConvite> {
  const email = entrada.email.trim().toLowerCase();

  const [usuario, jaConvidado] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.invite.count({
      where: {
        groupId: entrada.groupId,
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const jaEhMembro = usuario
    ? (await db.membership.count({
        where: { userId: usuario.id, groupId: entrada.groupId },
      })) > 0
    : false;

  const veredito = podeConvidar({
    papel: entrada.role,
    jaEhMembro,
    jaConvidado: jaConvidado > 0,
  });
  if (!veredito.ok) return { ok: false, motivo: veredito.motivo };

  await db.invite.create({
    data: {
      email,
      groupId: entrada.groupId,
      role: entrada.role,
      expiresAt: new Date(Date.now() + DURACAO_CONVITE_MS),
    },
  });

  return { ok: true, email };
}

export async function revogarConvite(
  db: Db,
  groupId: string,
  conviteId: string,
): Promise<void> {
  // O filtro por groupId é o que impede revogar convite de outro grupo com um
  // id colhido em qualquer lugar.
  await db.invite.deleteMany({ where: { id: conviteId, groupId } });
}

/**
 * Transforma em vínculo todo convite aberto pro e-mail de quem acabou de entrar.
 *
 * Chamado no callback de autenticação, onde o e-mail acabou de ser confirmado
 * pelo provedor. Quem já é membro mantém o papel que tem: um convite antigo pra
 * ASSISTANT não pode rebaixar quem virou ADMIN no meio do caminho.
 *
 * Devolve o slug do primeiro grupo pra onde a pessoa foi chamada — é pra lá que
 * ela cai depois de entrar.
 */
export async function aceitarConvitesPendentes(
  db: Db,
  entrada: { userId: string; email: string },
): Promise<{ aceitos: number; slug: string | null }> {
  const convites = await db.invite.findMany({
    where: {
      email: entrada.email.toLowerCase(),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
    include: { group: { select: { slug: true } } },
  });

  if (convites.length === 0) return { aceitos: 0, slug: null };

  await db.$transaction([
    ...convites.map((convite) =>
      db.membership.upsert({
        where: {
          userId_groupId: { userId: entrada.userId, groupId: convite.groupId },
        },
        create: {
          userId: entrada.userId,
          groupId: convite.groupId,
          role: convite.role,
        },
        update: {},
      }),
    ),
    db.invite.updateMany({
      where: { id: { in: convites.map((convite) => convite.id) } },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { aceitos: convites.length, slug: convites[0].group.slug };
}

export async function trocarPapel(
  db: Db,
  entrada: { groupId: string; userId: string; novoPapel: Role },
): Promise<Veredito> {
  const membro = await db.membership.findUnique({
    where: { userId_groupId: { userId: entrada.userId, groupId: entrada.groupId } },
    select: { id: true, role: true },
  });
  if (!membro) return { ok: false, motivo: "Essa pessoa não está no grupo." };

  const veredito = podeTrocarPapel({
    papelAtual: membro.role,
    novoPapel: entrada.novoPapel,
    donos: await contarDonos(db, entrada.groupId),
  });
  if (!veredito.ok) return veredito;

  await db.membership.update({
    where: { id: membro.id },
    data: { role: entrada.novoPapel },
  });
  return { ok: true };
}

export async function removerMembro(
  db: Db,
  entrada: { groupId: string; userId: string },
): Promise<Veredito> {
  const membro = await db.membership.findUnique({
    where: { userId_groupId: { userId: entrada.userId, groupId: entrada.groupId } },
    select: { id: true, role: true },
  });
  if (!membro) return { ok: false, motivo: "Essa pessoa não está no grupo." };

  const veredito = podeRemoverMembro({
    papelAtual: membro.role,
    donos: await contarDonos(db, entrada.groupId),
  });
  if (!veredito.ok) return veredito;

  await db.membership.delete({ where: { id: membro.id } });
  return { ok: true };
}
