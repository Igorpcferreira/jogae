// Regras de composição do grupo: quem pode virar o quê e quem não pode sair.
// Puro de propósito — a mesma regra vale pro convite, pra troca de papel e pra
// remoção, e nenhuma delas precisa de banco pra ser decidida (plano §6).

import type { Role } from "./permissions";

/** Papéis que aparecem no seletor, do mais forte pro mais fraco. */
export const PAPEIS_ATRIBUIVEIS: readonly Role[] = ["OWNER", "ADMIN", "ASSISTANT"];

/**
 * O que cada papel significa na prática, na linguagem do organizador.
 * Fica aqui, e não na tela, porque convite e ficha de membro dizem a mesma coisa.
 */
export const ROLE_DESCRICOES: Record<Role, string> = {
  OWNER: "Manda em tudo, inclusive em quem entra e quem sai.",
  ADMIN: "Monta rodada, sorteia time e mexe no elenco.",
  ASSISTANT: "Só apita o jogo: marca gol e encerra a rodada.",
};

export type Veredito = { ok: true } | { ok: false; motivo: string };

const SEM_DONO =
  "O grupo precisa de pelo menos um dono. Passe a coroa pra alguém antes.";

/**
 * Trocar o papel de um membro.
 *
 * A única regra dura é não deixar o grupo órfão: rebaixar o último dono
 * tiraria de todo mundo o direito de convidar e de mexer na configuração —
 * inclusive de desfazer o próprio rebaixamento.
 */
export function podeTrocarPapel(entrada: {
  papelAtual: Role;
  novoPapel: Role;
  /** Quantos OWNER o grupo tem hoje, contando o alvo. */
  donos: number;
}): Veredito {
  const { papelAtual, novoPapel, donos } = entrada;

  if (papelAtual === novoPapel) {
    return { ok: false, motivo: "Esse já é o papel dele." };
  }
  if (papelAtual === "OWNER" && novoPapel !== "OWNER" && donos <= 1) {
    return { ok: false, motivo: SEM_DONO };
  }
  return { ok: true };
}

/**
 * Remover alguém do grupo. Sair sozinho passa pela mesma porta: o último dono
 * também não pode se remover.
 */
export function podeRemoverMembro(entrada: {
  papelAtual: Role;
  donos: number;
}): Veredito {
  if (entrada.papelAtual === "OWNER" && entrada.donos <= 1) {
    return { ok: false, motivo: SEM_DONO };
  }
  return { ok: true };
}

/**
 * Convidar alguém. O papel tem que ser um dos três conhecidos — o valor chega
 * do formulário e um papel inventado viraria vínculo sem permissão nenhuma.
 */
export function podeConvidar(entrada: {
  papel: Role;
  /** Já existe vínculo desse e-mail com o grupo? */
  jaEhMembro: boolean;
  /** Já existe convite aberto pra esse e-mail? */
  jaConvidado: boolean;
}): Veredito {
  if (!PAPEIS_ATRIBUIVEIS.includes(entrada.papel)) {
    return { ok: false, motivo: "Papel desconhecido." };
  }
  if (entrada.jaEhMembro) {
    return { ok: false, motivo: "Essa pessoa já está no grupo." };
  }
  if (entrada.jaConvidado) {
    return { ok: false, motivo: "Já tem um convite aberto pra esse e-mail." };
  }
  return { ok: true };
}
