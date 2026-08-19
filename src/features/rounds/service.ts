import {
  aplicarAcaoDePresenca,
  type AcaoDePresenca,
  type ResultadoDePresenca,
} from "@/domain/attendance/presenca";
import { parseList } from "@/domain/list-parser/parser";
import type { ParseResult } from "@/domain/list-parser/types";
import { balanceTeams } from "@/domain/team-balancer/balancer";
import { generateSeed } from "@/domain/random/seeded";
import { proximaDataRecorrente } from "@/domain/schedule/recurrence";
import { normalizeName } from "@/domain/text/normalize";
import { teamPreset } from "@/lib/team-colors";
import type { Db } from "@/db/types";

/**
 * O que a rodada faz com o banco, sem `revalidatePath`, sem cookie e sem
 * `"use server"`. A action é a casca que autoriza e revalida; aqui mora o I/O
 * — e é isto que os testes de integração exercitam contra um Postgres de
 * verdade (plano: a camada de dados também precisa de rede de segurança).
 */

export interface EntradaResolvida {
  name: string;
  section: "confirmed" | "goalkeepers" | "waiting";
  /** `null` = criar jogador novo com esse nome. */
  playerId: string | null;
  /** Nome como veio na lista; vira alias quando difere do cadastro. */
  rawName?: string;
}

/* ── Importação da lista ───────────────────────────────────── */

export async function interpretarLista(
  db: Db,
  roundId: string,
  rawText: string,
): Promise<ParseResult> {
  const round = await db.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { group: true },
  });

  const players = await db.player.findMany({
    where: { groupId: round.groupId, active: true },
    include: { aliases: true },
  });

  return parseList(rawText, {
    players: players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      nickname: player.nickname,
      isGoalkeeper: player.isGoalkeeper,
      aliases: player.aliases.map((alias) => alias.normalized),
    })),
    capacity:
      round.teamCount * (round.fieldPlayersPerTeam + round.group.goalkeepersPerTeam),
  });
}

/** Ids de jogador chegam do client: só valem os que são deste grupo. */
export async function conferirJogadoresDoGrupo(
  db: Db,
  groupId: string,
  ids: Array<string | null | undefined>,
): Promise<void> {
  const informados = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (informados.length === 0) return;

  const validos = await db.player.count({
    where: { groupId, id: { in: informados } },
  });
  if (validos !== informados.length) {
    throw new Error("Jogador não pertence a este grupo");
  }
}

/**
 * Grava a lista revisada: cria jogador novo, aprende alias confirmado e
 * substitui as presenças da rodada.
 */
export async function aplicarLista(
  db: Db,
  roundId: string,
  entries: EntradaResolvida[],
): Promise<{ ok: true; confirmed: number; waiting: number }> {
  const round = await db.round.findUniqueOrThrow({ where: { id: roundId } });

  await conferirJogadoresDoGrupo(
    db,
    round.groupId,
    entries.map((entry) => entry.playerId),
  );

  const resolvidas: Array<{ playerId: string; section: EntradaResolvida["section"] }> = [];

  for (const entry of entries) {
    let playerId = entry.playerId;

    if (!playerId) {
      const criado = await db.player.create({
        data: {
          groupId: round.groupId,
          displayName: entry.name,
          isGoalkeeper: entry.section === "goalkeepers",
        },
      });
      playerId = criado.id;
    } else if (entry.rawName) {
      // O organizador confirmou o vínculo uma vez; o grupo aprende o alias.
      const normalized = normalizeName(entry.rawName);
      const player = await db.player.findUnique({ where: { id: playerId } });
      if (player && normalized && normalizeName(player.displayName) !== normalized) {
        await db.playerAlias.upsert({
          where: { playerId_normalized: { playerId, normalized } },
          create: { playerId, alias: entry.rawName, normalized },
          update: {},
        });
      }
    }

    resolvidas.push({ playerId, section: entry.section });
  }

  // Deduplica mantendo a primeira ocorrência — a lista manda, não o banco.
  const vistos = new Set<string>();
  const unicas = resolvidas.filter((entrada) => {
    if (vistos.has(entrada.playerId)) return false;
    vistos.add(entrada.playerId);
    return true;
  });

  await db.$transaction([
    db.attendance.deleteMany({ where: { roundId } }),
    db.attendance.createMany({
      data: unicas.map((entrada, index) => ({
        roundId,
        playerId: entrada.playerId,
        status: entrada.section === "waiting" ? ("WAITING" as const) : ("CONFIRMED" as const),
        asGoalkeeper: entrada.section === "goalkeepers",
        order: index,
      })),
    }),
    db.round.update({ where: { id: roundId }, data: { status: "CONFIRMED" } }),
  ]);

  return {
    ok: true,
    confirmed: unicas.filter((entrada) => entrada.section !== "waiting").length,
    waiting: unicas.filter((entrada) => entrada.section === "waiting").length,
  };
}

/* ── Presença ──────────────────────────────────────────────── */

export async function promoverDaEspera(db: Db, roundId: string, playerId: string) {
  const confirmados = await db.attendance.count({
    where: { roundId, status: "CONFIRMED" },
  });
  await db.attendance.update({
    where: { roundId_playerId: { roundId, playerId } },
    data: { status: "CONFIRMED", order: confirmados },
  });
}

export async function definirPresenca(
  db: Db,
  roundId: string,
  playerId: string,
  status: "CONFIRMED" | "WAITING" | "ABSENT",
) {
  await db.attendance.update({
    where: { roundId_playerId: { roundId, playerId } },
    data: { status, origin: "ORGANIZER" },
  });
}

export interface MudancaDePresencaAplicada {
  resultado: ResultadoDePresenca;
  /** Quem subiu da espera, com nome — a tela e a mensagem precisam dizer quem. */
  promovido: { id: string; displayName: string } | null;
}

/**
 * Confirmar ou cancelar presença passando pela regra de `domain/attendance`.
 *
 * É por aqui que entra o link pessoal do jogador (bloco I), e é por aqui que a
 * lista de espera anda sozinha: quem cancela abre vaga e o primeiro da fila
 * sobe na mesma transação — se fossem duas escritas soltas, um erro no meio
 * deixaria a rodada com uma vaga fantasma.
 */
export async function mudarPresenca(
  db: Db,
  entrada: {
    roundId: string;
    playerId: string;
    acao: AcaoDePresenca;
    origem: "ORGANIZER" | "PLAYER";
  },
): Promise<MudancaDePresencaAplicada> {
  const [round, jogador] = await Promise.all([
    db.round.findUniqueOrThrow({
      where: { id: entrada.roundId },
      include: {
        group: true,
        // `skillLevel` de propósito fora do select: a nota não passa por esta
        // função nem por acidente (plano §13).
        attendances: { include: { player: { select: { isGoalkeeper: true } } } },
      },
    }),
    db.player.findUniqueOrThrow({
      where: { id: entrada.playerId },
      select: { id: true, groupId: true, isGoalkeeper: true },
    }),
  ]);

  if (jogador.groupId !== round.groupId) {
    throw new Error("Jogador não pertence a este grupo");
  }

  const resultado = aplicarAcaoDePresenca({
    acao: entrada.acao,
    playerId: entrada.playerId,
    presencas: round.attendances.map((presenca) => ({
      playerId: presenca.playerId,
      status: presenca.status,
      order: presenca.order,
      asGoalkeeper: presenca.asGoalkeeper,
      goleiroNoElenco: presenca.player.isGoalkeeper,
    })),
    formato: {
      capacidade:
        round.teamCount * (round.fieldPlayersPerTeam + round.group.goalkeepersPerTeam),
      vagasDeGoleiro: round.teamCount * round.group.goalkeepersPerTeam,
      limiteDaEspera: round.group.waitlistLimit,
    },
    rodada: { status: round.status, sorteada: round.drawnAt !== null },
    ehGoleiro: jogador.isGoalkeeper,
  });

  if (!resultado.ok || resultado.mudancas.length === 0) {
    return { resultado, promovido: null };
  }

  await db.$transaction(
    resultado.mudancas.map((mudanca) => {
      const dados = {
        status: mudanca.status,
        order: mudanca.order,
        asGoalkeeper: mudanca.asGoalkeeper,
        // A origem marca quem *escolheu* o status. Quem sobe da espera não
        // escolheu nada: a origem dele fica como estava.
        ...(mudanca.playerId === entrada.playerId ? { origin: entrada.origem } : {}),
      };
      return db.attendance.upsert({
        where: {
          roundId_playerId: { roundId: entrada.roundId, playerId: mudanca.playerId },
        },
        create: { roundId: entrada.roundId, playerId: mudanca.playerId, ...dados },
        update: dados,
      });
    }),
  );

  const promovido = resultado.promovido
    ? await db.player.findUnique({
        where: { id: resultado.promovido },
        select: { id: true, displayName: true },
      })
    : null;

  return { resultado, promovido };
}

export async function alternarGoleiro(db: Db, roundId: string, playerId: string) {
  const presenca = await db.attendance.findUniqueOrThrow({
    where: { roundId_playerId: { roundId, playerId } },
  });
  await db.attendance.update({
    where: { roundId_playerId: { roundId, playerId } },
    data: { asGoalkeeper: !presenca.asGoalkeeper },
  });
}

/* ── Sorteio ───────────────────────────────────────────────── */

/** Times da rodada anterior — alimentam o histórico do balanceador. */
export async function timesAnteriores(
  db: Db,
  groupId: string,
  antesDe: Date,
): Promise<string[][]> {
  const anterior = await db.round.findFirst({
    where: { groupId, date: { lt: antesDe }, teams: { some: {} } },
    orderBy: { date: "desc" },
    include: { teams: { include: { players: true }, orderBy: { order: "asc" } } },
  });
  if (!anterior) return [];
  return anterior.teams.map((time) => time.players.map((tp) => tp.playerId));
}

export async function sortearTimes(
  db: Db,
  roundId: string,
  mode: "RANDOM" | "BALANCED",
  seed = generateSeed(),
): Promise<{ ok: true; seed: string; spread: number }> {
  const round = await db.round.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      group: true,
      attendances: {
        where: { status: "CONFIRMED" },
        include: { player: true },
        orderBy: { order: "asc" },
      },
      teams: { include: { players: true } },
    },
  });

  // Locks sobrevivem ao re-sorteio: o organizador travou por um motivo.
  const travadosPorJogador = new Map<string, number>();
  for (const time of round.teams) {
    for (const tp of time.players) {
      if (tp.locked) travadosPorJogador.set(tp.playerId, time.order);
    }
  }

  const anteriores = await timesAnteriores(db, round.groupId, round.date);

  const resultado = balanceTeams({
    players: round.attendances.map((presenca) => ({
      id: presenca.playerId,
      skillLevel: presenca.player.skillLevel,
      preferredRole: presenca.player.preferredRole,
      isGoalkeeper: presenca.asGoalkeeper || presenca.player.isGoalkeeper,
      lockedTeamIndex: travadosPorJogador.get(presenca.playerId) ?? null,
    })),
    teamCount: round.teamCount,
    fieldPlayersPerTeam: round.fieldPlayersPerTeam,
    goalkeeperMode: round.goalkeeperMode,
    mode,
    seed,
    history: { previousTeams: anteriores },
  });

  await db.$transaction(async (tx) => {
    await tx.team.deleteMany({ where: { roundId } });

    // Dois `createMany` em vez de um `create` por time: com 8 times era uma ida
    // e volta por time dentro da transação. `createManyAndReturn` devolve os ids
    // gerados, que é o que falta pra escrever os `TeamPlayer` de uma vez só.
    const criados = await tx.team.createManyAndReturn({
      data: resultado.teams.map((time) => {
        const preset = teamPreset(time.index);
        return { roundId, name: preset.name, color: preset.color, order: time.index };
      }),
      select: { id: true, order: true },
    });
    const idPorOrdem = new Map(criados.map((time) => [time.order, time.id]));

    await tx.teamPlayer.createMany({
      data: resultado.teams.flatMap((time) => {
        const teamId = idPorOrdem.get(time.index);
        if (!teamId) return [];
        return [
          ...time.goalkeeperIds.map((playerId) => ({
            teamId,
            playerId,
            isGoalkeeper: true,
            locked: travadosPorJogador.get(playerId) === time.index,
          })),
          ...time.playerIds.map((playerId) => ({
            teamId,
            playerId,
            isGoalkeeper: false,
            locked: travadosPorJogador.get(playerId) === time.index,
          })),
        ];
      }),
    });

    await tx.round.update({
      where: { id: roundId },
      data: { drawMode: mode, drawSeed: seed, drawnAt: new Date(), manualEdits: 0 },
    });
  });

  return { ok: true, seed, spread: resultado.strengthSpread };
}

/** Troca dois jogadores de time — registra a edição manual para transparência. */
export async function trocarJogadores(
  db: Db,
  roundId: string,
  playerAId: string,
  playerBId: string,
): Promise<void> {
  const [a, b] = await Promise.all([
    db.teamPlayer.findFirstOrThrow({ where: { playerId: playerAId, team: { roundId } } }),
    db.teamPlayer.findFirstOrThrow({ where: { playerId: playerBId, team: { roundId } } }),
  ]);

  if (a.teamId === b.teamId) return;

  await db.$transaction([
    db.teamPlayer.update({ where: { id: a.id }, data: { teamId: b.teamId } }),
    db.teamPlayer.update({ where: { id: b.id }, data: { teamId: a.teamId } }),
    db.round.update({
      where: { id: roundId },
      data: { manualEdits: { increment: 1 }, drawMode: "MANUAL" },
    }),
  ]);
}

export async function alternarTrava(db: Db, roundId: string, playerId: string) {
  const tp = await db.teamPlayer.findFirstOrThrow({
    where: { playerId, team: { roundId } },
  });
  await db.teamPlayer.update({ where: { id: tp.id }, data: { locked: !tp.locked } });
}

/**
 * Nome e cor do time. O grupo chama os times de "Coletes" e "Sem colete", não
 * de "Time Verde" — o preset é só o ponto de partida (plano §42: a cor continua
 * semântica, quem escolhe qual das quatro é o organizador).
 */
export async function atualizarTime(
  db: Db,
  teamId: string,
  dados: { name: string; color: string },
): Promise<void> {
  await db.team.update({
    where: { id: teamId },
    data: { name: dados.name, color: dados.color },
  });
}

/* ── Rodada ────────────────────────────────────────────────── */

/**
 * Repete a última rodada que teve gente: mesma lista, data nova.
 *
 * É o caso comum do fut fixo — a galera é quase sempre a mesma e reimportar a
 * lista toda semana é trabalho à toa (plano §52). Quem saiu do grupo não vem
 * junto: jogador inativo e quem faltou ficam de fora, e a lista de espera
 * continua espera.
 */
export async function duplicarRodada(
  db: Db,
  groupId: string,
  date?: Date,
): Promise<{ round: Awaited<ReturnType<typeof criarRodada>>; copiados: number } | null> {
  const anterior = await db.round.findFirst({
    where: { groupId, attendances: { some: {} } },
    orderBy: { date: "desc" },
    include: {
      attendances: {
        where: { status: { not: "ABSENT" }, player: { active: true } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!anterior) return null;

  let round = await criarRodada(db, groupId, date);

  await db.attendance.createMany({
    data: anterior.attendances.map((presenca, index) => ({
      roundId: round.id,
      playerId: presenca.playerId,
      status: presenca.status,
      asGoalkeeper: presenca.asGoalkeeper,
      order: index,
    })),
  });

  const confirmados = anterior.attendances.filter(
    (presenca) => presenca.status === "CONFIRMED",
  ).length;

  // Já nasce confirmada quando veio gente: a rodada duplicada pula a etapa de
  // importar lista e vai direto pro sorteio.
  if (confirmados > 0) {
    round = await db.round.update({
      where: { id: round.id },
      data: { status: "CONFIRMED" },
    });
  }

  return { round, copiados: anterior.attendances.length };
}

export async function criarRodada(db: Db, groupId: string, date?: Date) {
  const grupo = await db.footballGroup.findUniqueOrThrow({ where: { id: groupId } });
  const alvo = date ?? proximaDataRecorrente(grupo.recurringWeekdays, grupo.defaultStartTime);

  return db.round.create({
    data: {
      groupId,
      date: alvo,
      startsAt: alvo,
      venue: grupo.defaultVenue,
      venueUrl: grupo.defaultVenueUrl,
      teamCount: grupo.teamCount,
      fieldPlayersPerTeam: grupo.fieldPlayersPerTeam,
      goalkeeperMode: grupo.goalkeeperMode,
    },
  });
}
