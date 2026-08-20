// Que comemoração o lance merece (plano §27, "animações especiais para
// hat-trick").
//
// A regra existe pra proteger a raridade. Se a animação grande disparasse em
// todo gol do cara que já fez três, ela deixaria de significar alguma coisa na
// mesma noite — e uma animação que interrompe a tela do placar tem que valer a
// interrupção. Por isso ela sai **exatamente** no gol que fecha o hat-trick: o
// quarto e o quinto voltam a ser "Goool", que já é a comemoração padrão.
//
// A conta é por **rodada**, não por partida. No fut de resenha o time joga seis
// jogos curtos de 10 minutos numa noite; hat-trick por partida sairia toda hora
// e ninguém chama três gols espalhados pela noite de hat-trick. É a mesma
// contagem que a conquista `hat-trick` já usa em `domain/badges`, e as duas
// precisam concordar — senão a tela comemora o que o histórico não registra.

import { GOLS_DO_HAT_TRICK } from "@/domain/badges/conquistas";

export type TipoDeCelebracao = "gol" | "hat-trick";

export interface Celebracao {
  tipo: TipoDeCelebracao;
  /** Gols do autor na rodada, contando este. */
  gols: number;
}

/**
 * A comemoração do gol que acabou de entrar.
 *
 * `golsAntes` é quantos o autor já tinha na rodada **antes** deste lance. Gol
 * sem autor definido nunca é hat-trick: sem saber de quem foi, não dá pra
 * contar três de ninguém — quem chama passa `null` e recebe "gol".
 */
export function celebracaoDoLance(golsAntes: number | null): Celebracao {
  if (golsAntes === null) return { tipo: "gol", gols: 0 };

  const gols = golsAntes + 1;
  return {
    tipo: gols === GOLS_DO_HAT_TRICK ? "hat-trick" : "gol",
    gols,
  };
}
