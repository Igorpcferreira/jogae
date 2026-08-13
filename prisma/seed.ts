import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/db/generated/client";
import { balanceTeams } from "../src/domain/team-balancer/balancer";
import { createRng } from "../src/domain/random/seeded";
import { normalizeName } from "../src/domain/text/normalize";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TEAM_PRESETS = [
  { name: "Time Verde", color: "green" },
  { name: "Time Amarelo", color: "yellow" },
  { name: "Time Vermelho", color: "red" },
  { name: "Time Rosa", color: "pink" },
];

type Role = "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | "VERSATILE";

const ROSTER: Array<{
  name: string;
  nickname?: string;
  aliases?: string[];
  skill: number;
  role: Role;
  gk?: boolean;
}> = [
  { name: "Salles", skill: 4, role: "MIDFIELDER" },
  { name: "Guilherme", skill: 4, role: "GOALKEEPER", gk: true },
  { name: "Deivão", skill: 4, role: "FORWARD" },
  { name: "Kaique", skill: 3, role: "MIDFIELDER" },
  { name: "Juan", skill: 3, role: "DEFENDER" },
  { name: "Heitor", skill: 3, role: "GOALKEEPER", gk: true },
  { name: "Marcos Manus", skill: 3, role: "DEFENDER" },
  { name: "Igor de Castro", nickname: "Igão", aliases: ["Igao", "Igor"], skill: 5, role: "MIDFIELDER" },
  { name: "Tomás", skill: 3, role: "FORWARD" },
  { name: "Ney", skill: 2, role: "MIDFIELDER" },
  { name: "Dhener", skill: 4, role: "GOALKEEPER", gk: true },
  { name: "Alexandre", skill: 4, role: "DEFENDER" },
  { name: "Pablo", skill: 4, role: "FORWARD" },
  { name: "Kauã", skill: 2, role: "MIDFIELDER" },
  { name: "Jorge", skill: 3, role: "DEFENDER" },
  { name: "Danilo", skill: 5, role: "GOALKEEPER", gk: true },
  { name: "Pedrão", skill: 5, role: "FORWARD" },
  { name: "Lucas", skill: 4, role: "FORWARD" },
  { name: "Thalysson", skill: 3, role: "MIDFIELDER" },
  { name: "Agnaldo", skill: 2, role: "DEFENDER" },
  { name: "Carlão", skill: 3, role: "MIDFIELDER" },
  { name: "Juliel", skill: 2, role: "FORWARD" },
];

/** Quinta-feira mais próxima (para frente ou para trás) a partir de hoje. */
function thursdayOffset(weeks: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30, 0, 0);
  const daysUntilThursday = (4 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntilThursday + weeks * 7);
  return date;
}

async function main() {
  console.log("Limpando dados anteriores…");
  // Partida é alcançada por cascata pela rodada e pelos dois times.
  await prisma.matchEvent.deleteMany({
    where: { match: { round: { group: { slug: "fut-da-quinta" } } } },
  });
  await prisma.footballGroup.deleteMany({ where: { slug: "fut-da-quinta" } });
  await prisma.user.deleteMany({ where: { email: "salles@jogae.app" } });

  const organizer = await prisma.user.create({
    data: { name: "Salles", email: "salles@jogae.app" },
  });

  const group = await prisma.footballGroup.create({
    data: {
      name: "Fut da Quinta",
      slug: "fut-da-quinta",
      description: "Resenha semanal na Arena Farofa. Chegou, jogou.",
      sportType: "SOCIETY",
      defaultVenue: "Arena Farofa · Campo 03",
      defaultVenueUrl: "https://maps.google.com/?q=Arena+Farofa",
      recurringWeekdays: [4],
      defaultStartTime: "20:30",
      defaultDurationMin: 90,
      teamCount: 4,
      fieldPlayersPerTeam: 4,
      goalkeepersPerTeam: 1,
      goalkeeperMode: "FIXED_PER_TEAM",
      waitlistLimit: 8,
      settings: {
        matchRule: "Jogos de 10 min ou 2 gols. Quem vence continua.",
        maxMatchMinutes: 10,
        maxMatchGoals: 2,
      },
      memberships: { create: { userId: organizer.id, role: "OWNER" } },
    },
  });

  console.log(`Grupo criado: ${group.name} (${group.slug})`);

  const players = [];
  for (const entry of ROSTER) {
    const player = await prisma.player.create({
      data: {
        groupId: group.id,
        displayName: entry.name,
        nickname: entry.nickname,
        skillLevel: entry.skill,
        preferredRole: entry.role,
        isGoalkeeper: entry.gk ?? false,
        aliases: {
          create: (entry.aliases ?? []).map((alias) => ({
            alias,
            normalized: normalizeName(alias),
          })),
        },
      },
    });
    players.push(player);
  }
  console.log(`${players.length} jogadores cadastrados`);

  const byName = new Map(players.map((p) => [p.displayName, p]));
  const waitingNames = ["Carlão", "Juliel"];
  const roundPlayers = players.filter((p) => !waitingNames.includes(p.displayName));

  // ── Rodada anterior (alimenta o ranking do mês) ─────────────
  const lastRound = await prisma.round.create({
    data: {
      groupId: group.id,
      date: thursdayOffset(-1),
      startsAt: thursdayOffset(-1),
      venue: group.defaultVenue,
      venueUrl: group.defaultVenueUrl,
      status: "FINISHED",
      teamCount: 4,
      fieldPlayersPerTeam: 4,
      goalkeeperMode: "FIXED_PER_TEAM",
      drawMode: "BALANCED",
      drawSeed: "SEMANA01",
      drawnAt: thursdayOffset(-1),
      attendances: {
        create: roundPlayers.map((player, index) => ({
          playerId: player.id,
          status: "CONFIRMED" as const,
          order: index,
          asGoalkeeper: player.isGoalkeeper,
        })),
      },
    },
  });

  const lastBalance = balanceTeams({
    players: roundPlayers.map((p) => ({
      id: p.id,
      skillLevel: p.skillLevel,
      preferredRole: p.preferredRole,
      isGoalkeeper: p.isGoalkeeper,
    })),
    teamCount: 4,
    fieldPlayersPerTeam: 4,
    goalkeeperMode: "FIXED_PER_TEAM",
    mode: "BALANCED",
    seed: "SEMANA01",
  });

  const lastTeams = [];
  for (const team of lastBalance.teams) {
    const preset = TEAM_PRESETS[team.index];
    const created = await prisma.team.create({
      data: {
        roundId: lastRound.id,
        name: preset.name,
        color: preset.color,
        order: team.index,
        players: {
          create: [
            ...team.goalkeeperIds.map((playerId) => ({ playerId, isGoalkeeper: true })),
            ...team.playerIds.map((playerId) => ({ playerId, isGoalkeeper: false })),
          ],
        },
      },
      include: { players: true },
    });
    lastTeams.push(created);
  }

  // Confrontos da rodada anterior com gols plausíveis e determinísticos.
  const rng = createRng("SEMANA01-GOLS");
  const fixtures: Array<[number, number]> = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ];

  for (const [i, [a, b]] of fixtures.entries()) {
    const teamA = lastTeams[a];
    const teamB = lastTeams[b];
    const scoreA = rng.int(3);
    const scoreB = rng.int(3);

    const match = await prisma.match.create({
      data: {
        roundId: lastRound.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        scoreA,
        scoreB,
        status: "FINISHED",
        order: i,
        startedAt: thursdayOffset(-1),
        endedAt: thursdayOffset(-1),
      },
    });

    for (const [team, goals] of [
      [teamA, scoreA],
      [teamB, scoreB],
    ] as const) {
      const scorers = team.players.filter((tp) => !tp.isGoalkeeper);
      for (let g = 0; g < goals; g++) {
        const author = rng.pick(scorers);
        const others = scorers.filter((s) => s.playerId !== author.playerId);
        const withAssist = rng.next() > 0.45 && others.length > 0;
        await prisma.matchEvent.create({
          data: {
            matchId: match.id,
            teamId: team.id,
            type: "GOAL",
            playerId: author.playerId,
            assistPlayerId: withAssist ? rng.pick(others).playerId : null,
            minute: rng.int(10) + 1,
          },
        });
      }
    }
  }
  console.log(`Rodada anterior criada com ${fixtures.length} partidas`);

  // ── Próxima rodada (a que aparece na home) ──────────────────
  const nextRound = await prisma.round.create({
    data: {
      groupId: group.id,
      date: thursdayOffset(0),
      startsAt: thursdayOffset(0),
      venue: group.defaultVenue,
      venueUrl: group.defaultVenueUrl,
      status: "CONFIRMED",
      teamCount: 4,
      fieldPlayersPerTeam: 4,
      goalkeeperMode: "FIXED_PER_TEAM",
      attendances: {
        create: [
          ...roundPlayers.map((player, index) => ({
            playerId: player.id,
            status: "CONFIRMED" as const,
            order: index,
            asGoalkeeper: player.isGoalkeeper,
          })),
          ...waitingNames.map((name, index) => ({
            playerId: byName.get(name)!.id,
            status: "WAITING" as const,
            order: index,
          })),
        ],
      },
    },
  });

  console.log(`Próxima rodada: ${nextRound.date.toLocaleDateString("pt-BR")}`);
  console.log("\nSeed concluído.");
  console.log(`  Organizador: ${organizer.email}`);
  console.log(`  Grupo:       /g/${group.slug}`);
  console.log(`  Link público da rodada: /r/${nextRound.publicToken}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
