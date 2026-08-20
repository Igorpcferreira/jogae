import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/db/client";
import { can, type Permission, type Role } from "@/domain/access/permissions";
import { lerIdentidade } from "./session";

export type UsuarioAtual = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/**
 * Camada de acesso a dado (DAL). Tudo que precisa saber "quem é" passa por
 * aqui — nenhuma página ou action lê o cookie nem fala com o Supabase direto.
 *
 * Busca por `authId`: é o vínculo verificado pelo JWT. Casar por e-mail aqui
 * deixaria qualquer um que conseguisse um token com um e-mail alheio entrar no
 * lugar do dono — o e-mail só serve de chave no momento do primeiro login,
 * dentro do callback, onde o provedor acabou de confirmá-lo.
 */
export const getUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const identidade = await lerIdentidade();
  if (!identidade) return null;

  return prisma.user.findUnique({
    where: { authId: identidade.authId },
    // Só o que a UI usa: nada de despejar o objeto inteiro pro client.
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
});

/** Exige alguém logado; senão manda pro login guardando pra onde ia. */
export async function requireUsuario(proximo?: string): Promise<UsuarioAtual> {
  const usuario = await getUsuarioAtual();
  if (!usuario) {
    redirect(proximo ? `/entrar?proximo=${encodeURIComponent(proximo)}` : "/entrar");
  }
  return usuario;
}

/** Papel do usuário logado dentro do grupo. `null` = não é membro. */
export const getPapelNoGrupo = cache(
  async (groupId: string): Promise<Role | null> => {
    const usuario = await getUsuarioAtual();
    if (!usuario) return null;

    const membership = await prisma.membership.findUnique({
      where: { userId_groupId: { userId: usuario.id, groupId } },
      select: { role: true },
    });

    return membership?.role ?? null;
  },
);

/** Grupos em que o usuário logado tem algum papel. */
export const getGruposDoUsuario = cache(async () => {
  const usuario = await getUsuarioAtual();
  if (!usuario) return [];

  const memberships = await prisma.membership.findMany({
    where: { userId: usuario.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      group: {
        select: { id: true, name: true, slug: true, defaultVenue: true },
      },
    },
  });

  return memberships.map((m) => ({ ...m.group, role: m.role }));
});

/* ── Autorização ───────────────────────────────────────────── */

/**
 * Por que o acesso foi negado. Quem chama precisa distinguir "faça login de
 * novo" (dá pra resolver) de "isso nunca vai dar certo" — é o que decide se a
 * fila offline espera ou descarta o lance.
 */
export type MotivoDeAcesso =
  | "sem-sessao"
  | "sem-vinculo"
  | "sem-permissao"
  | "nao-encontrado";

/**
 * Erro de autorização em server action. A action falha alto: componente nenhum
 * decide se pode — quem decide é esta camada.
 */
export class ErroDeAcesso extends Error {
  readonly motivo: MotivoDeAcesso;

  constructor(motivo: MotivoDeAcesso, mensagem = "Você não tem permissão para isso.") {
    super(mensagem);
    this.name = "ErroDeAcesso";
    this.motivo = motivo;
  }
}

/**
 * Porta única de toda mutação. Devolve o papel para quem quiser diferenciar
 * comportamento; lança quando não pode.
 */
export async function requireGroupAccess(
  groupId: string,
  permission: Permission,
): Promise<{ usuario: UsuarioAtual; role: Role }> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new ErroDeAcesso("sem-sessao", "Entre para continuar.");

  const role = await getPapelNoGrupo(groupId);
  if (!role) throw new ErroDeAcesso("sem-vinculo", "Você não participa deste grupo.");
  if (!can(role, permission)) throw new ErroDeAcesso("sem-permissao");

  return { usuario, role };
}

/** Mesma checagem partindo da rodada — evita repetir o lookup em cada action. */
export async function requireRoundAccess(roundId: string, permission: Permission) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, groupId: true },
  });
  if (!round) throw new ErroDeAcesso("nao-encontrado", "Rodada não encontrada.");

  const acesso = await requireGroupAccess(round.groupId, permission);
  return { ...acesso, groupId: round.groupId };
}

/** Mesma checagem partindo do jogador. */
export async function requirePlayerAccess(playerId: string, permission: Permission) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, groupId: true },
  });
  if (!player) throw new ErroDeAcesso("nao-encontrado", "Jogador não encontrado.");

  const acesso = await requireGroupAccess(player.groupId, permission);
  return { ...acesso, groupId: player.groupId };
}

/** Mesma checagem partindo do time — nome e cor são editáveis pela tela de times. */
export async function requireTeamAccess(teamId: string, permission: Permission) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, roundId: true, round: { select: { groupId: true } } },
  });
  if (!team) throw new ErroDeAcesso("nao-encontrado", "Time não encontrado.");

  const acesso = await requireGroupAccess(team.round.groupId, permission);
  return { ...acesso, groupId: team.round.groupId, roundId: team.roundId };
}

/**
 * Acesso pelo link pessoal do jogador (`/p/<token>`, bloco I — opção B).
 *
 * Aqui o token **é** a credencial: não tem sessão, não tem papel e não tem
 * grupo alheio pra confundir — ele abre um jogador e mais nada. Fica no mesmo
 * arquivo que os outros `require*` de propósito: autorização é um assunto só.
 *
 * Jogador inativo perde o link junto com a vaga no elenco, e o `select` é
 * explícito porque `skillLevel` não pode vazar pra rota pública (plano §13).
 */
export const getJogadorPorLinkPessoal = cache(async (selfToken: string) => {
  if (!selfToken) return null;

  const jogador = await prisma.player.findUnique({
    where: { selfToken },
    select: {
      id: true,
      displayName: true,
      nickname: true,
      isGoalkeeper: true,
      active: true,
      groupId: true,
      group: {
        select: {
          id: true,
          name: true,
          slug: true,
          publicToken: true,
          timezone: true,
          teamCount: true,
          fieldPlayersPerTeam: true,
          goalkeepersPerTeam: true,
          waitlistLimit: true,
        },
      },
    },
  });

  return jogador?.active ? jogador : null;
});

export type JogadorDoLinkPessoal = NonNullable<
  Awaited<ReturnType<typeof getJogadorPorLinkPessoal>>
>;

/** Versão que falha alto — é a porta das mutações vindas do link pessoal. */
export async function requireAcessoPorLinkPessoal(
  selfToken: string,
): Promise<JogadorDoLinkPessoal> {
  const jogador = await getJogadorPorLinkPessoal(selfToken);
  if (!jogador) {
    throw new ErroDeAcesso("nao-encontrado", "Esse link não vale mais.");
  }
  return jogador;
}

/**
 * Acesso pelo **link de convidado do grupo** (`/e/<token>`).
 *
 * O irmão mais fraco de `getJogadorPorLinkPessoal`: este token não abre jogador
 * nenhum, abre o grupo. Quem tem ele vê a lista de nomes do elenco e pode dizer
 * "sou o Marcos" — a partir daí quem autoriza volta a ser o link pessoal, e a
 * regra de presença continua exatamente onde estava.
 *
 * A separação importa: o link do grupo circula no WhatsApp e vai ser
 * encaminhado; o pessoal, não. Por isso o de grupo é revogável numa tela
 * (basta gravar outro `publicToken`) e não carrega presença de ninguém.
 *
 * Aqui só a leitura da página. Quem transforma o token em jogador é
 * `features/entrada/service.ts` — é lá que a conferência "esse `playerId` é
 * mesmo deste grupo?" está coberta por teste de integração.
 *
 * O `select` é explícito pelo motivo de sempre: `skillLevel` não pode chegar
 * perto de rota pública (plano §13), e aqui não se seleciona jogador nenhum.
 */
export const getGrupoPorLinkDeConvidado = cache(async (publicToken: string) => {
  if (!publicToken) return null;

  return prisma.footballGroup.findUnique({
    where: { publicToken },
    select: {
      id: true,
      name: true,
      slug: true,
      publicToken: true,
      defaultVenue: true,
    },
  });
});

export type GrupoDoLinkDeConvidado = NonNullable<
  Awaited<ReturnType<typeof getGrupoPorLinkDeConvidado>>
>;

/** Mesma checagem partindo da partida. */
export async function requireMatchAccess(matchId: string, permission: Permission) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, roundId: true, round: { select: { groupId: true } } },
  });
  if (!match) throw new ErroDeAcesso("nao-encontrado", "Partida não encontrada.");

  const acesso = await requireGroupAccess(match.round.groupId, permission);
  return { ...acesso, groupId: match.round.groupId, roundId: match.roundId };
}
