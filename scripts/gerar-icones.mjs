/**
 * Gera os PNG do PWA a partir da mesma geometria do símbolo da marca
 * (`JogaeMark`, em src/components/ui/icons.tsx).
 *
 * Por que rasterizar na mão em vez de instalar `sharp`/`resvg`: o único uso
 * seria este, o binário é pesado e o registry da máquina de dev é chato.
 * São ~180 linhas de aritmética previsível — e o resultado é versionado, então
 * isto roda uma vez por mudança de marca, não a cada build.
 *
 *   node scripts/gerar-icones.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "public");

/* ── Cores (as mesmas do @theme) ───────────────────────────── */
const CANVAS = [0x09, 0x0a, 0x0c];
const VERDE = [0x35, 0xe8, 0x78];

/* ── Geometria no viewBox 52×52 do JogaeMark ───────────────── */

/** Quadrado chanfrado: canto superior-esquerdo e inferior-direito cortados. */
const QUADRO = [
  [0, 10],
  [10, 0],
  [52, 0],
  [52, 42],
  [42, 52],
  [0, 52],
];

const BOLA = { x: 16, y: 38, r: 6 };
/** Trajetória: cúbica de (16,38) a (37,12), traço de 5. */
const TRAJETORIA = { p0: [16, 38], p1: [31, 38], p2: [37, 25], p3: [37, 12] };
const TRAVESSAO = { x1: 31, x2: 43, y: 12, largura: 5 };

/* ── Rasterização ──────────────────────────────────────────── */

/** Ponto dentro do polígono (ray casting). */
function dentroDoPoligono(x, y, pontos) {
  let dentro = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
    const [xi, yi] = pontos[i];
    const [xj, yj] = pontos[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Amostras da cúbica; o traço vira uma sequência de discos. */
function pontosDaTrajetoria(quantidade = 220) {
  const { p0, p1, p2, p3 } = TRAJETORIA;
  const pontos = [];
  for (let i = 0; i <= quantidade; i++) {
    const t = i / quantidade;
    const u = 1 - t;
    const x =
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y =
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    pontos.push([x, y]);
  }
  return pontos;
}

const TRACO = pontosDaTrajetoria();

/** A tinta escura do símbolo: bola + trajetória + travessão. */
function ehTintaEscura(x, y) {
  if ((x - BOLA.x) ** 2 + (y - BOLA.y) ** 2 <= BOLA.r ** 2) return true;

  const raio = 2.5; // stroke-width 5
  for (const [px, py] of TRACO) {
    if ((x - px) ** 2 + (y - py) ** 2 <= raio * raio) return true;
  }

  // Travessão horizontal com pontas arredondadas.
  const meia = TRAVESSAO.largura / 2;
  const xClamp = Math.min(TRAVESSAO.x2, Math.max(TRAVESSAO.x1, x));
  if ((x - xClamp) ** 2 + (y - TRAVESSAO.y) ** 2 <= meia * meia) return true;

  return false;
}

/**
 * Desenha o ícone com supersampling 3×3 (antialias honesto sem lib).
 * `escala` < 1 encolhe o símbolo dentro do quadro — é assim que sai o maskable
 * com a zona segura de 40% que o Android exige.
 */
function desenhar(tamanho, { fundo = null, escala = 1 } = {}) {
  const amostras = 3;
  const pixels = Buffer.alloc(tamanho * tamanho * 4);
  const margem = ((1 - escala) / 2) * tamanho;
  const lado = tamanho * escala;

  for (let py = 0; py < tamanho; py++) {
    for (let px = 0; px < tamanho; px++) {
      let acumR = 0;
      let acumG = 0;
      let acumB = 0;
      let acumA = 0;

      for (let sy = 0; sy < amostras; sy++) {
        for (let sx = 0; sx < amostras; sx++) {
          const ax = px + (sx + 0.5) / amostras;
          const ay = py + (sy + 0.5) / amostras;

          // Coordenada dentro do viewBox 52×52 do símbolo.
          const vx = ((ax - margem) / lado) * 52;
          const vy = ((ay - margem) / lado) * 52;

          let cor = fundo;
          let alfa = fundo ? 255 : 0;

          if (vx >= 0 && vx <= 52 && vy >= 0 && vy <= 52 && dentroDoPoligono(vx, vy, QUADRO)) {
            cor = ehTintaEscura(vx, vy) ? CANVAS : VERDE;
            alfa = 255;
          }

          if (cor) {
            acumR += cor[0];
            acumG += cor[1];
            acumB += cor[2];
          }
          acumA += alfa;
        }
      }

      const total = amostras * amostras;
      const i = (py * tamanho + px) * 4;
      pixels[i] = Math.round(acumR / total);
      pixels[i + 1] = Math.round(acumG / total);
      pixels[i + 2] = Math.round(acumB / total);
      pixels[i + 3] = Math.round(acumA / total);
    }
  }

  return pixels;
}

/* ── Codificação PNG ───────────────────────────────────────── */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function codificarPng(pixels, tamanho) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtro padrão
  ihdr[12] = 0; // sem entrelace

  // Cada linha vai prefixada pelo tipo de filtro (0 = nenhum).
  const linhas = Buffer.alloc(tamanho * (tamanho * 4 + 1));
  for (let y = 0; y < tamanho; y++) {
    const destino = y * (tamanho * 4 + 1);
    linhas[destino] = 0;
    pixels.copy(linhas, destino + 1, y * tamanho * 4, (y + 1) * tamanho * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(linhas, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Saída ─────────────────────────────────────────────────── */

mkdirSync(SAIDA, { recursive: true });

const arquivos = [
  { nome: "icon-192.png", tamanho: 192, opcoes: {} },
  { nome: "icon-512.png", tamanho: 512, opcoes: {} },
  // Maskable: fundo cheio e símbolo a 60% — o Android recorta até 20% de cada lado.
  { nome: "icon-maskable-512.png", tamanho: 512, opcoes: { fundo: CANVAS, escala: 0.6 } },
  // iOS não respeita transparência: melhor entregar já com fundo.
  { nome: "apple-touch-icon.png", tamanho: 180, opcoes: { fundo: CANVAS, escala: 0.82 } },
];

for (const { nome, tamanho, opcoes } of arquivos) {
  const png = codificarPng(desenhar(tamanho, opcoes), tamanho);
  writeFileSync(join(SAIDA, nome), png);
  console.log(`${nome} — ${tamanho}×${tamanho}, ${(png.length / 1024).toFixed(1)} kB`);
}
