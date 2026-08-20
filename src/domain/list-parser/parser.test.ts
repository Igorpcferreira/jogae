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

describe("parseList — cabeçalho de lista real não vira jogador", () => {
  // A mensagem real que criou quatro "jogadores" fantasmas em produção:
  // "Toda Quinta 20:30 Às 22:00", "Local Campo 03 - Farofa",
  // "Localização: https://..." e "Lista Fecha Com 20". O gatilho era a
  // primeira linha: "CAMPO CONFIRMADO!" liga a seção explícita e o filtro
  // antigo de "parece nome" parava de rodar.
  const mensagemReal = `✅ CAMPO CONFIRMADO!
Toda QUINTA 20:30 às 22:00
Local📍Campo 03 - Farofa
Localização:  https://g.co/kgs/2sVgTvg ⚽

🚨ATENÇÃO: Precisamos iniciar às 20:30 em ponto, assim não perdemos minutos no horário.

Goleiros🧤
01-
02-
.
.
01-daniel
02-guilherme
03-Marcos manus
04-deivao
05 - Juan
06- pablo
07- alexandre
08-Igão
09-Pedrão
10-jorge
❗️LISTA FECHA COM 20❗️

LISTA DE ESPERA⏰
01-
02-
03 -
04-`;

  it("importa só gente: cabeçalho, local, link e aviso ficam de fora", () => {
    const result = parseList(mensagemReal, { players: known });

    expect(names(result.confirmed)).toEqual([
      "Daniel",
      "Guilherme",
      "Marcos Manus",
      "Deivao",
      "Juan",
      "Pablo",
      "Alexandre",
      "Igão",
      "Pedrão",
      "Jorge",
    ]);
    expect(result.goalkeepers).toHaveLength(0);
    expect(result.waiting).toHaveLength(0);
    // 2 vagas de goleiro + 4 da espera.
    expect(result.stats.emptySlots).toBe(6);

    const ignoradas = result.warnings.filter(
      (warning) => warning.code === "LINE_NOT_A_NAME" || warning.code === "LINE_TOO_LONG",
    );
    // Horário, local, link e "lista fecha" — o aviso longo de ATENÇÃO cai em
    // qualquer um dos dois códigos, o que importa é não virar jogador.
    expect(ignoradas.length).toBeGreaterThanOrEqual(4);
  });

  it("aproveita o cabeçalho como metadado em vez de jogá-lo fora", () => {
    const result = parseList(mensagemReal, { players: known });
    expect(result.metadata.venueUrl).toBe("https://g.co/kgs/2sVgTvg");
    expect(result.metadata.timeText).toBe("20:30–22:00");
    expect(result.metadata.venue).toContain("Campo 03");
  });

  it("apelido curto com número passa; frase com número não", () => {
    const result = parseList(`01-CR7\n02-Lista fecha com 20\n03-Campo 03 - Farofa`);
    expect(names(result.confirmed)).toEqual(["Cr7"]);
    expect(
      result.warnings.filter((warning) => warning.code === "LINE_NOT_A_NAME"),
    ).toHaveLength(2);
  });

  it("nome que o organizador já cadastrou passa mesmo parecendo estranho", () => {
    const cadastrado: KnownPlayer[] = [
      { id: "z1", displayName: "Zé 10", aliases: [] },
    ];
    const result = parseList("01-Zé 10", { players: cadastrado });
    expect(names(result.confirmed)).toEqual(["Zé 10"]);
    expect(result.confirmed[0].matchedPlayerId).toBe("z1");
  });

  it("linha com dois-pontos é recado, não jogador", () => {
    const result = parseList(`01-Salles\nObs: quem furar paga a rodada\n02-Guilherme`);
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });
});

describe("parseList — ataques da revisão adversária (20/08)", () => {
  it('recado que começa com horário não vira "30 Em Ponto" no slot 20', () => {
    const result = parseList("FUT QUINTA\n⏰ 20:30 em ponto\n01-Salles\n02-Guilherme");
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });

  it('"Goleiro: Danilo" põe o Danilo no gol e devolve a numeração pra linha', () => {
    const result = parseList("Goleiro: Danilo\n01-Salles\n02-Guilherme");
    expect(names(result.goalkeepers)).toEqual(["Danilo"]);
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });

  it("anotação ao lado de nome conhecido é presença do conhecido, não recado", () => {
    const elenco: KnownPlayer[] = [
      { id: "c1", displayName: "Carlão", aliases: [] },
      { id: "r1", displayName: "Rafa", aliases: [] },
    ];
    const result = parseList("01-Carlão pix ✔️\n02-Rafa chega 21h15\n03-Salles", {
      players: elenco,
    });
    expect(result.confirmed).toHaveLength(3);
    expect(result.confirmed[0].matchedPlayerId).toBe("c1");
    expect(result.confirmed[1].matchedPlayerId).toBe("r1");
  });

  it("prefixo ambíguo não decide por ninguém: vira aviso, não jogador", () => {
    const elenco: KnownPlayer[] = [
      { id: "r1", displayName: "Rafa Souza", nickname: "Rafa", aliases: [] },
      { id: "r2", displayName: "Rafa Lima", aliases: ["rafa"] },
    ];
    const result = parseList("01-Rafa chega 21h15", { players: elenco });
    expect(result.confirmed).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "LINE_NOT_A_NAME")).toBe(true);
  });

  it("dia da semana sem número também é cabeçalho, não jogador", () => {
    const result = parseList(
      "⚽ FUT DOS PARÇAS ⚽\nToda quinta-feira\nArena Farofa - Campo 03\n\n01-Salles\n02-Guilherme",
    );
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
  });

  it("recado curto de lista (levar colete, quem furar paga) não vira jogador", () => {
    const result = parseList(
      "01-Salles\n02-Guilherme\nLevar colete e bola\nQuem furar paga a próxima\nProibido chuteira de trava",
    );
    expect(names(result.confirmed)).toEqual(["Salles", "Guilherme"]);
    expect(
      result.warnings.filter((w) => w.code === "LINE_NOT_A_NAME").length,
    ).toBeGreaterThanOrEqual(3);
  });
});
