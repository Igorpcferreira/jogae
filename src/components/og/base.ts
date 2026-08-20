import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * O que os cards PNG (`ImageResponse`) compartilham: cor, tamanho e fonte.
 *
 * Existe porque a Fase 2 acrescentou um segundo card compartilhável (conquista)
 * ao que já havia (times), e dois arquivos com `#090a0c` escrito na mão é como
 * um card sai com o fundo de ontem depois de um ajuste de tema.
 *
 * Os valores vêm em hex porque a imagem é renderizada fora do CSS do app — são
 * exatamente os mesmos tokens de `globals.css`. Se um mudar lá, muda aqui.
 */

export const CANVAS = "#090a0c";
export const SURFACE = "#111317";
export const LINE = "#262a31";
export const INK = "#eceff3";
export const INK_2 = "#a7aeb9";
export const INK_3 = "#7a828e";

/** As quatro cores do produto, na ordem da faixa de assinatura. */
export const CORES = ["#35e878", "#ffd84a", "#ff4d4d", "#ff4fa3"] as const;

export const LARGURA = 1200;
export const ALTURA = 630;

/**
 * A Anton é a fonte display do produto, mas `ImageResponse` precisa do arquivo
 * embutido e `next/font` não expõe o .ttf. Se alguém colocar o arquivo em
 * `public/fonts/`, os cards saem com a tipografia certa; sem ele, caem na fonte
 * padrão e continuam legíveis — a identidade aqui vem sobretudo da cor.
 */
export function carregarAnton(): Promise<Buffer | null> {
  return readFile(join(process.cwd(), "public/fonts/Anton-Regular.ttf")).catch(
    () => null,
  );
}
