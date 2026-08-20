"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/db/client";
import { urlBase } from "@/lib/base-url";
import { normalizeName } from "@/domain/text/normalize";
import {
  conflitoDeNome,
  MAX_NOME_JOGADOR,
  prepararJogador,
  type Posicao,
} from "@/domain/roster/roster";
import { requireGroupAccess, requirePlayerAccess } from "@/features/auth/queries";

const jogadorSchema = z.object({
  displayName: z.string().max(MAX_NOME_JOGADOR),
  nickname: z.string().max(40).nullable(),
  skillLevel: z.coerce.number(),
  preferredRole: z.enum([
    "GOALKEEPER",
    "DEFENDER",
    "MIDFIELDER",
    "FORWARD",
    "VERSATILE",
  ]),
  isGoalkeeper: z.boolean(),
  /** Apelidos separados por vírgula na UI. */
  aliases: z.array(z.string().max(60)).max(12),
  notes: z.string().max(280).nullable(),
});

export type EntradaJogador = z.input<typeof jogadorSchema>;

export type ResultadoJogador =
  | { status: "ok"; playerId: string }
  | { status: "erro"; mensagem: string; campo?: string };

/** Elenco do grupo no formato que o domínio entende (nome + apelido + aliases). */
async function conhecidosDoGrupo(groupId: string) {
  const jogadores = await prisma.player.findMany({
    where: { groupId },
    select: {
      id: true,
      displayName: true,
      nickname: true,
      aliases: { select: { alias: true } },
    },
  });
  return jogadores.map((jogador) => ({
    id: jogador.id,
    displayName: jogador.displayName,
    nickname: jogador.nickname,
    aliases: jogador.aliases.map((alias) => alias.alias),
  }));
}

export async function criarJogadorAction(
  groupId: string,
  entrada: EntradaJogador,
): Promise<ResultadoJogador> {
  await requireGroupAccess(groupId, "elenco:editar");
  return gravar({ groupId, entrada });
}

export async function atualizarJogadorAction(
  playerId: string,
  entrada: EntradaJogador,
): Promise<ResultadoJogador> {
  const { groupId } = await requirePlayerAccess(playerId, "elenco:editar");
  return gravar({ groupId, playerId, entrada });
}

async function gravar({
  groupId,
  playerId,
  entrada,
}: {
  groupId: string;
  playerId?: string;
  entrada: EntradaJogador;
}): Promise<ResultadoJogador> {
  const analise = jogadorSchema.safeParse(entrada);
  if (!analise.success) {
    const problema = analise.error.issues[0];
    return {
      status: "erro",
      mensagem: problema.message,
      campo: String(problema.path[0] ?? ""),
    };
  }

  const preparado = prepararJogador({
    ...analise.data,
    preferredRole: analise.data.preferredRole as Posicao,
  });
  if (!preparado.ok) {
    return {
      status: "erro",
      mensagem: preparado.erros[0].mensagem,
      campo: String(preparado.erros[0].campo),
    };
  }

  const jogador = preparado.valor;
  const conhecidos = await conhecidosDoGrupo(groupId);

  // Nome, apelido e cada alias precisam ser únicos no grupo: se dois "Lucas"
  // colidissem, o parser da lista passaria a errar em toda importação.
  for (const forma of [jogador.displayName, jogador.nickname ?? "", ...jogador.aliases]) {
    if (!forma) continue;
    const colidiu = conflitoDeNome(forma, conhecidos, playerId);
    if (colidiu) {
      return {
        status: "erro",
        campo: forma === jogador.displayName ? "displayName" : "aliases",
        mensagem: `"${forma}" já é ${colidiu.displayName} aqui no grupo.`,
      };
    }
  }

  const dados = {
    displayName: jogador.displayName,
    nickname: jogador.nickname,
    skillLevel: jogador.skillLevel,
    preferredRole: jogador.preferredRole,
    isGoalkeeper: jogador.isGoalkeeper,
    notes: analise.data.notes,
  };

  const salvo = playerId
    ? await prisma.$transaction(async (tx) => {
        const atualizado = await tx.player.update({
          where: { id: playerId },
          data: dados,
        });
        // Aliases são substituídos em bloco: a tela edita a lista inteira.
        await tx.playerAlias.deleteMany({ where: { playerId } });
        await tx.playerAlias.createMany({
          data: jogador.aliases.map((alias) => ({
            playerId,
            alias,
            normalized: normalizeName(alias),
          })),
        });
        return atualizado;
      })
    : await prisma.player.create({
        data: {
          ...dados,
          groupId,
          aliases: {
            create: jogador.aliases.map((alias) => ({
              alias,
              normalized: normalizeName(alias),
            })),
          },
        },
      });

  revalidatePath("/g", "layout");
  return { status: "ok", playerId: salvo.id };
}

/**
 * Troca o link pessoal de UM jogador. O link é credencial (quem tem responde a
 * presença dele), vive no WhatsApp e WhatsApp é encaminhado — vazou, ou a
 * pessoa trocou de celular e perdeu o controle do antigo, gera outro: o velho
 * para de valer na hora. Sem isso, "cortar o acesso de um" era tirar a pessoa
 * do elenco. A troca do link de convidado do grupo não cobre este caso: ela
 * não desfaz o link pessoal de quem já entrou.
 */
export async function regenerarLinkPessoalAction(playerId: string): Promise<string> {
  await requirePlayerAccess(playerId, "elenco:editar");

  // UUID v4 gerado aqui, e não pelo default do banco: `update` não dispara
  // default de coluna, e deixar o Postgres decidir exigiria SQL cru.
  const jogador = await prisma.player.update({
    where: { id: playerId },
    data: { selfToken: randomUUID() },
    select: { selfToken: true },
  });

  revalidatePath("/g", "layout");
  return `${await urlBase()}/p/${jogador.selfToken}`;
}

/**
 * Inativar em vez de apagar: o histórico de gols e presenças do cara continua
 * valendo no ranking, ele só some das listas de hoje.
 */
export async function alternarAtivoAction(playerId: string): Promise<void> {
  await requirePlayerAccess(playerId, "elenco:editar");

  const jogador = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
    select: { active: true },
  });
  await prisma.player.update({
    where: { id: playerId },
    data: { active: !jogador.active },
  });

  revalidatePath("/g", "layout");
}

/**
 * Exclusão de verdade só para quem nunca jogou — apagar alguém com estatística
 * reescreveria o histórico do grupo.
 */
export async function excluirJogadorAction(
  playerId: string,
): Promise<{ status: "ok" } | { status: "erro"; mensagem: string }> {
  await requirePlayerAccess(playerId, "elenco:editar");

  const [presencas, gols] = await Promise.all([
    prisma.attendance.count({ where: { playerId } }),
    prisma.matchEvent.count({
      where: { OR: [{ playerId }, { assistPlayerId: playerId }] },
    }),
  ]);

  if (presencas > 0 || gols > 0) {
    return {
      status: "erro",
      mensagem: "Esse já jogou aqui. Dá pra inativar, mas apagar apagaria o histórico.",
    };
  }

  await prisma.player.delete({ where: { id: playerId } });
  revalidatePath("/g", "layout");
  return { status: "ok" };
}
