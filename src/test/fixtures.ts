import type { PrismaClient } from "@/db/generated/client";
import { normalizeName } from "@/domain/text/normalize";
import { slugDeTeste } from "./db";

/**
 * Cenário mínimo e realista: um grupo de 2 times, 4 na linha + 1 no gol,
 * com elenco suficiente pra sortear, e uma rodada confirmada.
 */
export async function criarCenario(
  db: PrismaClient,
  opcoes: {
    teamCount?: number;
    fieldPlayersPerTeam?: number;
    goalkeepersPerTeam?: number;
    /** Quantos jogadores no elenco (metade goleiro quando indicado). */
    jogadores?: number;
    goleiros?: number;
  } = {},
) {
  const teamCount = opcoes.teamCount ?? 2;
  const fieldPlayersPerTeam = opcoes.fieldPlayersPerTeam ?? 4;
  const goalkeepersPerTeam = opcoes.goalkeepersPerTeam ?? 1;
  const goleiros = opcoes.goleiros ?? teamCount * goalkeepersPerTeam;
  const linha = opcoes.jogadores ?? teamCount * fieldPlayersPerTeam;

  const usuario = await db.user.create({
    data: { name: "Organizador", email: `${slugDeTeste("org")}@teste.local` },
  });

  const grupo = await db.footballGroup.create({
    data: {
      name: "Fut de Teste",
      slug: slugDeTeste(),
      teamCount,
      fieldPlayersPerTeam,
      goalkeepersPerTeam,
      goalkeeperMode: "FIXED_PER_TEAM",
      recurringWeekdays: [4],
      defaultStartTime: "20:30",
      memberships: { create: { userId: usuario.id, role: "OWNER" } },
    },
  });

  const elenco = [];
  for (let i = 0; i < goleiros; i++) {
    elenco.push(
      await db.player.create({
        data: {
          groupId: grupo.id,
          displayName: `Goleiro ${i + 1}`,
          isGoalkeeper: true,
          preferredRole: "GOALKEEPER",
          skillLevel: 3,
        },
      }),
    );
  }
  for (let i = 0; i < linha; i++) {
    elenco.push(
      await db.player.create({
        data: {
          groupId: grupo.id,
          displayName: `Jogador ${i + 1}`,
          // Níveis variados: sorteio equilibrado sem variação não prova nada.
          skillLevel: (i % 5) + 1,
        },
      }),
    );
  }

  const rodada = await db.round.create({
    data: {
      groupId: grupo.id,
      date: new Date(2026, 7, 6, 20, 30),
      startsAt: new Date(2026, 7, 6, 20, 30),
      status: "CONFIRMED",
      teamCount,
      fieldPlayersPerTeam,
      goalkeeperMode: "FIXED_PER_TEAM",
      attendances: {
        create: elenco.map((jogador, index) => ({
          playerId: jogador.id,
          status: "CONFIRMED" as const,
          order: index,
          asGoalkeeper: jogador.isGoalkeeper,
        })),
      },
    },
  });

  return { usuario, grupo, elenco, rodada };
}

export async function adicionarAlias(
  db: PrismaClient,
  playerId: string,
  alias: string,
) {
  return db.playerAlias.create({
    data: { playerId, alias, normalized: normalizeName(alias) },
  });
}
