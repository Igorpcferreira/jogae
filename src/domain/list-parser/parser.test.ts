import { describe, expect, it } from "vitest";
import { parseList } from "./parser";
import type { KnownPlayer } from "./types";

const known: KnownPlayer[] = [
  { id: "p1", displayName: "Salles", aliases: [] },
  { id: "p2", displayName: "Guilherme", aliases: [] },
  { id: "p3", displayName: "Marcos Manus", aliases: [] },
  { id: "p4", displayName: "Igor de Castro", nickname: "Igão", aliases: ["igao", "igor"] },
  { id: "p5", displayName: "Danilo", isGoalkeeper: true, aliases: [] },
];

const names = (entries: { name: string }[]) => entries.map((e) => e.name);

describe("parseList — lista canônica do WhatsApp", () => {
  const raw = `Fut da Quinta 12/09 20:30
Arena Farofa · Campo 03

Goleiros🧤
01-
02-

01-salles
02-guilherme
03-Marcos manus
04-Agnaldo

LISTA DE ESPERA⏰
01-Carlão
02-juliel`;

  const result = parseList(raw, { players: known });

  it("separa confirmados, goleiros e espera", () => {
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme", "Marcos Manus", "Agnaldo"]);
    expect(names(result.waiting)).toEqual(["Carlão", "Juliel"]);
    expect(result.goalkeepers).toHaveLength(0);
  });

  it("detecta o recomeço da numeração como fim da seção de goleiros", () => {
    // A seção de goleiros tinha 2 vagas vazias; a lista de linha reinicia em 01.
    expect(result.stats.emptySlots).toBe(2);
    expect(result.stats.confirmedCount).toBe(4);
  });

  it("extrai metadados", () => {
    expect(result.metadata.dateText).toBe("12/09");
    expect(result.metadata.timeText).toBe("20:30");
    expect(result.metadata.venue).toContain("Arena Farofa");
  });

  it("casa nomes conhecidos ignorando caixa e acento", () => {
    const salles = result.confirmed[0];
    expect(salles.matchedPlayerId).toBe("p1");
    expect(result.confirmed[2].matchedPlayerId).toBe("p3"); // "Marcos manus"
  });

  it("marca nome desconhecido como novo, sem inventar match", () => {
    const agnaldo = result.confirmed[3];
    expect(agnaldo.matchedPlayerId).toBeNull();
    expect(agnaldo.suggestions).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "NEW_PLAYER")).toBe(true);
  });

  it("avisa que não há goleiro confirmado", () => {
    expect(result.warnings.some((w) => w.code === "NO_GOALKEEPERS")).toBe(true);
  });
});

describe("parseList — variações de formatação", () => {
  it("aceita 1, 01, 001 e separadores diferentes", () => {
    const result = parseList(`1 - Salles
01. Guilherme
001) Danilo
- Carlão
• Juliel`);
    expect(names(result.confirmed)).toEqual([
      "Salles",
      "Guilherme",
      "Danilo",
      "Carlão",
      "Juliel",
    ]);
  });

  it("remove emojis e espaços exóticos", () => {
    const result = parseList("01- Salles ⚽🔥\n02- Guilherme");
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });

  it("normaliza traço unicode e caixa alta", () => {
    const result = parseList("01–SALLES\n02—guilherme");
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });

  it("preserva capitalização mista intencional", () => {
    const result = parseList("01-McSalles");
    expect(result.confirmed[0].name).toBe("McSalles");
  });

  it("ignora texto antes e depois da lista", () => {
    const result = parseList(`Bora galera, lista aberta!
https://maps.app.goo.gl/xyz

01-Salles
02-Guilherme

Pix na chave do sempre`);
    expect(result.stats.confirmedCount).toBeGreaterThanOrEqual(2);
    expect(names(result.confirmed)).toContain("Salles");
    expect(result.metadata.venueUrl).toContain("maps.app.goo.gl");
  });

  it("ignora aviso longo que aparece no meio da lista", () => {
    const aviso = "A lista fecha com 20 jogadores e quem confirmar depois disso entra automaticamente na espera";
    const result = parseList(`01-Salles\n02-Guilherme\n${aviso}\n03-Danilo`);

    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme", "Danilo"]);
    expect(result.warnings.some((warning) => warning.code === "LINE_TOO_LONG")).toBe(true);
  });

  it("limpa prefixo de export do WhatsApp", () => {
    const result = parseList(`[12/09/2025 20:31] Salles: 01-Salles
[12/09/2025 20:32] Guilherme: 02-Guilherme`);
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });
});

describe("parseList — seções", () => {
  it("reconhece cabeçalhos escritos de formas diferentes", () => {
    const result = parseList(`*GOLEIROS*
01-Danilo

CONFIRMADOS
01-Salles

Reservas
01-Carlão`);
    expect(names(result.goalkeepers)).toEqual(["Danilo"]);
    expect(names(result.confirmed)).toEqual(["Salles"]);
    expect(names(result.waiting)).toEqual(["Carlão"]);
  });

  it("não confunde jogador numerado com cabeçalho", () => {
    const result = parseList("01-Goleiro Danilo\n02-Salles");
    expect(result.goalkeepers).toHaveLength(0);
    expect(result.stats.confirmedCount).toBe(2);
  });

  it("avisa quando nenhuma seção foi detectada", () => {
    const result = parseList("01-Salles\n02-Guilherme");
    expect(result.warnings.some((w) => w.code === "NO_SECTION_DETECTED")).toBe(true);
  });
});

describe("parseList — aliases e duplicatas", () => {
  it("resolve alias aprendido pelo grupo", () => {
    const result = parseList("01-Igão\n02-Igao", { players: known });
    expect(result.confirmed[0].matchedPlayerId).toBe("p4");
    expect(result.confirmed[1].matchedPlayerId).toBe("p4");
  });

  it("acusa duplicata quando dois nomes viram o mesmo jogador", () => {
    const result = parseList("01-Igão\n02-Igor de Castro", { players: known });
    expect(result.warnings.some((w) => w.code === "DUPLICATE_IN_LIST")).toBe(true);
  });

  it("sugere sem decidir quando o nome é apenas parecido", () => {
    const result = parseList("01-Guilerme", { players: known });
    const entry = result.confirmed[0];
    expect(entry.matchedPlayerId).toBeNull();
    expect(entry.suggestions[0].playerId).toBe("p2");
    const warning = result.warnings.find((w) => w.code === "SIMILAR_TO_KNOWN_PLAYER");
    expect(warning?.options?.[0].displayName).toBe("Guilherme");
  });

  it("acusa nome repetido literalmente", () => {
    const result = parseList("01-Salles\n02-salles");
    const warning = result.warnings.find((w) => w.code === "DUPLICATE_IN_LIST");
    expect(warning?.entryIndexes).toEqual([0, 1]);
  });
});

describe("parseList — capacidade e vagas", () => {
  it("avisa quando estoura a capacidade do grupo", () => {
    const raw = Array.from({ length: 22 }, (_, i) => `${i + 1}-Jogador ${i + 1}`).join("\n");
    const result = parseList(raw, { players: [], capacity: 20 });
    expect(result.warnings.some((w) => w.code === "OVER_CAPACITY")).toBe(true);
  });

  it("conta vagas em branco sem criar jogador", () => {
    const result = parseList("01-Salles\n02-\n03-\n04-Guilherme");
    expect(result.stats.emptySlots).toBe(2);
    expect(result.stats.confirmedCount).toBe(2);
  });

  it("devolve resultado vazio e estável para texto vazio", () => {
    const result = parseList("   \n\n  ");
    expect(result.entries).toHaveLength(0);
    expect(result.stats.confirmedCount).toBe(0);
  });
});
