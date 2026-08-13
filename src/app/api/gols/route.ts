import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { ErroDeAcesso, requireMatchAccess } from "@/features/auth/queries";
import { conferirJogadoresDoGrupo } from "@/features/rounds/service";
import { registrarGol } from "@/features/live/service";

/**
 * Descarga da fila offline de gols.
 *
 * Existe como route handler (e não server action) porque quem chama é o
 * código de sincronização, não um formulário: ele reenvia a fila inteira
 * quando a conexão volta e precisa saber, item a item, o que entrou.
 *
 * Autorização é a mesma da action — `requireMatchAccess` por partida.
 */

const golSchema = z.object({
  id: z.string().min(1).max(64),
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  playerId: z.string().nullable(),
  assistPlayerId: z.string().nullable(),
  ownGoal: z.boolean().default(false),
  minute: z.number().int().min(1).max(240).nullable(),
  criadoEm: z.number().int(),
});

const corpoSchema = z.object({ gols: z.array(golSchema).max(100) });

export async function POST(request: Request) {
  const analise = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!analise.success) {
    return NextResponse.json({ erro: "Payload inválido" }, { status: 400 });
  }

  const aceitos: string[] = [];
  /** Recusado de vez: manter na fila só faria tentar pra sempre. */
  const rejeitados: string[] = [];

  // Ordem de chegada — o placar é reconstruído na sequência do jogo.
  const gols = [...analise.data.gols].sort((a, b) => a.criadoEm - b.criadoEm);

  for (const gol of gols) {
    try {
      const { groupId } = await requireMatchAccess(gol.matchId, "partida:gerenciar");
      await conferirJogadoresDoGrupo(prisma, groupId, [gol.playerId, gol.assistPlayerId]);

      await registrarGol(prisma, {
        matchId: gol.matchId,
        teamId: gol.teamId,
        playerId: gol.playerId,
        assistPlayerId: gol.assistPlayerId,
        ownGoal: gol.ownGoal,
        minute: gol.minute,
        clientEventId: gol.id,
      });

      aceitos.push(gol.id);
    } catch (erro) {
      // Sessão vencida é problema de agora: a fila espera o usuário entrar
      // de novo em vez de jogar o gol fora.
      if (erro instanceof ErroDeAcesso && erro.motivo === "sem-sessao") {
        return NextResponse.json({ aceitos, rejeitados }, { status: 401 });
      }
      // O resto (partida encerrada, time fora da partida) não melhora com o
      // tempo — o lance sai da fila e o organizador registra na mão.
      rejeitados.push(gol.id);
    }
  }

  return NextResponse.json({ aceitos, rejeitados });
}
