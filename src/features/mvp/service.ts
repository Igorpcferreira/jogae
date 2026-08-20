import type { Db } from "@/db/types";
import {
  apurarVotacao,
  janelaDaVotacao,
  podeVotar,
  votoValido,
  type Apuracao,
  type MotivoDeVotoInvalido,
  type MotivoParaNaoVotar,
} from "@/domain/mvp/votacao";

/**
 * A urna da "Escolha da galera".
 *
 * Serviço extraído porque é aqui que as regras da votação encostam no banco, e
 * cada uma delas é uma forma de fraude ou de constrangimento se falhar: votar
 * depois do prazo, votar duas vezes, votar em quem não jogou, votar numa rodada
 * de outro grupo. A action não testa nada disso — ela só sabe quem é o votante.
 *
 * O par votante→votado é gravado e **nunca lido de volta pela tela**: quem lê é
 * `apurarVotacao`, que devolve só o vencedor. O voto é secreto por desenho.
 */

export type MotivoDaRecusa =
  | MotivoParaNaoVotar
  | MotivoDeVotoInvalido
  | "rodada-nao-encontrada"
  | "rodada-de-outro-grupo";

export type ResultadoDoVoto =
  | { ok: true; votou: string }
  | { ok: false; motivo: MotivoDaRecusa };

/**
 * O apito final da rodada — ou a data dela, pra rodada encerrada antes de
 * `finishedAt` existir.
 *
 * O fallback fecha a votação de tudo que é antigo (a janela é de 48h e a data
 * já passou), que é o comportamento certo: ninguém vai votar no craque de um
 * jogo de três meses atrás.
 */
export function apitoFinalDe(round: {
  finishedAt: Date | null;
  date: Date;
}): Date {
  return round.finishedAt ?? round.date;
}

export async function registrarVoto(
  db: Db,
  entrada: {
    roundId: string;
    groupId: string;
    voterPlayerId: string;
    votedPlayerId: string;
    agora?: Date;
  },
): Promise<ResultadoDoVoto> {
  const agora = entrada.agora ?? new Date();

  const round = await db.round.findUnique({
    where: { id: entrada.roundId },
    select: {
      id: true,
      groupId: true,
      status: true,
      date: true,
      finishedAt: true,
      attendances: {
        where: { status: "CONFIRMED" },
        select: { playerId: true },
      },
    },
  });
  if (!round) return { ok: false, motivo: "rodada-nao-encontrada" };
  // O votante vem do link pessoal dele, que carrega o grupo: rodada de outro
  // grupo é sempre id vindo do client.
  if (round.groupId !== entrada.groupId) {
    return { ok: false, motivo: "rodada-de-outro-grupo" };
  }

  const quemJogou = round.attendances.map((presenca) => presenca.playerId);

  const jaVotou = await db.mvpVote.findUnique({
    where: {
      roundId_voterPlayerId: {
        roundId: round.id,
        voterPlayerId: entrada.voterPlayerId,
      },
    },
    select: { id: true },
  });

  const permissao = podeVotar({
    status: round.status,
    encerradaEm: apitoFinalDe(round),
    agora,
    jogou: quemJogou.includes(entrada.voterPlayerId),
    jaVotou: jaVotou !== null,
  });
  if (!permissao.ok) return { ok: false, motivo: permissao.motivo };

  const valido = votoValido(entrada.voterPlayerId, entrada.votedPlayerId, quemJogou);
  if (!valido.ok) return { ok: false, motivo: valido.motivo };

  await db.mvpVote.create({
    data: {
      roundId: round.id,
      voterPlayerId: entrada.voterPlayerId,
      votedPlayerId: entrada.votedPlayerId,
    },
  });

  return { ok: true, votou: entrada.votedPlayerId };
}

export interface SituacaoDaVotacao {
  roundId: string;
  aberta: boolean;
  fechaEm: Date | null;
  /** Este jogador já votou. Nunca em quem — nem pra ele mesmo. */
  jaVotou: boolean;
  /** Ele pode votar agora; quando não, o motivo. */
  permissao: { ok: true } | { ok: false; motivo: MotivoParaNaoVotar };
  /** Em quem dá pra votar: quem jogou, menos ele. */
  candidatos: string[];
  apuracao: Apuracao;
}

/**
 * Tudo que a tela de votação precisa, numa consulta.
 *
 * Devolve a apuração mesmo com a votação aberta porque a tela mostra o
 * resultado parcial? **Não** — devolve porque a mesma função serve pra depois
 * do fechamento. Quem decide o que mostrar é a tela, e ela só mostra vencedor
 * com a urna fechada; parcial no meio da votação induz voto de última hora.
 */
export async function situacaoDaVotacao(
  db: Db,
  roundId: string,
  playerId: string,
  agora: Date = new Date(),
): Promise<SituacaoDaVotacao | null> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      status: true,
      date: true,
      finishedAt: true,
      attendances: {
        where: { status: "CONFIRMED" },
        select: { playerId: true },
      },
      votos: { select: { voterPlayerId: true, votedPlayerId: true } },
    },
  });
  if (!round) return null;

  const quemJogou = round.attendances.map((presenca) => presenca.playerId);
  const encerradaEm = apitoFinalDe(round);
  const janela = janelaDaVotacao(round.status, encerradaEm, agora);
  const jaVotou = round.votos.some((voto) => voto.voterPlayerId === playerId);

  return {
    roundId: round.id,
    aberta: janela.aberta,
    fechaEm: janela.fechaEm,
    jaVotou,
    permissao: podeVotar({
      status: round.status,
      encerradaEm,
      agora,
      jogou: quemJogou.includes(playerId),
      jaVotou,
    }),
    candidatos: quemJogou.filter((candidato) => candidato !== playerId),
    apuracao: apurarVotacao(
      round.votos.map((voto) => ({
        votanteId: voto.voterPlayerId,
        votadoId: voto.votedPlayerId,
      })),
      quemJogou.length,
    ),
  };
}
