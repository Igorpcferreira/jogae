import type { Db } from "@/db/types";

/**
 * "Sou eu" traduzido pra banco: o link do grupo mais o nome escolhido viram o
 * link pessoal daquele jogador.
 *
 * Serviço extraído porque é aqui que mora a checagem que protege o link: o
 * `playerId` vem do client, e sem conferir o grupo o link de um fut escolheria
 * jogador de outro. A action não sabe fazer isso, e a action não é testável —
 * ela grava cookie e redireciona.
 *
 * Motivo sai como código, não como frase: quem escreve texto de tela é a tela.
 */

export type MotivoDaRecusa = "link-invalido" | "jogador-fora-do-elenco";

export type ResolucaoDaEntrada =
  | { ok: true; groupId: string; selfToken: string }
  | { ok: false; motivo: MotivoDaRecusa };

export async function resolverJogadorDaEntrada(
  db: Db,
  entrada: { publicToken: string; playerId: string },
): Promise<ResolucaoDaEntrada> {
  const grupo = await db.footballGroup.findUnique({
    where: { publicToken: entrada.publicToken },
    select: { id: true },
  });
  if (!grupo) return { ok: false, motivo: "link-invalido" };

  const jogador = await db.player.findUnique({
    where: { id: entrada.playerId },
    select: { groupId: true, active: true, selfToken: true },
  });

  // Jogador de outro grupo e jogador inativo dão a mesma recusa: o link não
  // pode servir de sonda pra descobrir quem existe em qual grupo.
  if (!jogador || jogador.groupId !== grupo.id || !jogador.active) {
    return { ok: false, motivo: "jogador-fora-do-elenco" };
  }

  return { ok: true, groupId: grupo.id, selfToken: jogador.selfToken };
}
