// Regras do elenco (plano §13). Puro: valida e detecta conflito sem banco.
// A tela só desenha o que sai daqui.

import { normalizeName, titleCaseName } from "@/domain/text/normalize";

export type Posicao =
  | "GOALKEEPER"
  | "DEFENDER"
  | "MIDFIELDER"
  | "FORWARD"
  | "VERSATILE";

export const ROTULO_POSICAO: Record<Posicao, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Defesa",
  MIDFIELDER: "Meio",
  FORWARD: "Ataque",
  VERSATILE: "Versátil",
};

/** Escala 1–5, privada: só o balanceador lê (plano §13). */
export const SKILL_MIN = 1;
export const SKILL_MAX = 5;

export const ROTULO_SKILL: Record<number, string> = {
  1: "Tá começando",
  2: "Quebra o galho",
  3: "Joga bem",
  4: "Decide jogo",
  5: "Craque do grupo",
};

export interface EntradaDeJogador {
  displayName: string;
  nickname?: string | null;
  skillLevel: number;
  preferredRole: Posicao;
  isGoalkeeper: boolean;
  aliases: string[];
}

export interface JogadorConhecido {
  id: string;
  displayName: string;
  nickname?: string | null;
  aliases: string[];
}

export type ErroDeJogador = { campo: keyof EntradaDeJogador; mensagem: string };

/**
 * Valida e arruma a entrada. Nome vira title case porque a lista do WhatsApp
 * vem em CAIXA ALTA metade das vezes e ninguém quer "SALLES" no card do time.
 */
export function prepararJogador(entrada: EntradaDeJogador): {
  ok: true;
  valor: EntradaDeJogador & { normalizado: string };
} | {
  ok: false;
  erros: ErroDeJogador[];
} {
  const erros: ErroDeJogador[] = [];

  const nome = titleCaseName(entrada.displayName ?? "");
  if (nome.length < 2) {
    erros.push({ campo: "displayName", mensagem: "Nome com pelo menos 2 letras." });
  }
  if (nome.length > 60) {
    erros.push({ campo: "displayName", mensagem: "Nome muito longo." });
  }

  const skill = Math.round(entrada.skillLevel);
  if (!Number.isFinite(skill) || skill < SKILL_MIN || skill > SKILL_MAX) {
    erros.push({ campo: "skillLevel", mensagem: "Nível vai de 1 a 5." });
  }

  const apelido = entrada.nickname?.trim() ? titleCaseName(entrada.nickname) : null;
  if (apelido && apelido.length > 30) {
    erros.push({ campo: "nickname", mensagem: "Apelido muito longo." });
  }

  // Alias duplicado ou igual ao próprio nome não acrescenta nada.
  const vistos = new Set<string>([normalizeName(nome)]);
  const aliases: string[] = [];
  for (const bruto of entrada.aliases ?? []) {
    const normalizado = normalizeName(bruto);
    if (!normalizado || vistos.has(normalizado)) continue;
    vistos.add(normalizado);
    aliases.push(bruto.trim());
  }

  if (erros.length > 0) return { ok: false, erros };

  return {
    ok: true,
    valor: {
      displayName: nome,
      nickname: apelido,
      skillLevel: skill,
      preferredRole: entrada.preferredRole,
      // Posição de goleiro e a flag andam juntas: marcar uma marca a outra.
      isGoalkeeper: entrada.isGoalkeeper || entrada.preferredRole === "GOALKEEPER",
      aliases,
      normalizado: normalizeName(nome),
    },
  };
}

/**
 * O nome (ou apelido, ou alias) já pertence a outra pessoa do grupo?
 * `ignorarId` deixa a edição salvar sem colidir consigo mesma.
 */
export function conflitoDeNome(
  candidato: string,
  conhecidos: JogadorConhecido[],
  ignorarId?: string,
): JogadorConhecido | null {
  const alvo = normalizeName(candidato);
  if (!alvo) return null;

  for (const jogador of conhecidos) {
    if (jogador.id === ignorarId) continue;
    const formas = [jogador.displayName, jogador.nickname ?? "", ...jogador.aliases];
    if (formas.some((forma) => normalizeName(forma) === alvo)) return jogador;
  }
  return null;
}

/** Busca do elenco: casa por nome, apelido ou alias, sem acento e sem caixa. */
export function filtrarElenco<T extends JogadorConhecido>(
  jogadores: T[],
  termo: string,
): T[] {
  const busca = normalizeName(termo);
  if (!busca) return jogadores;

  return jogadores.filter((jogador) =>
    [jogador.displayName, jogador.nickname ?? "", ...jogador.aliases]
      .map(normalizeName)
      .some((forma) => forma.includes(busca)),
  );
}
