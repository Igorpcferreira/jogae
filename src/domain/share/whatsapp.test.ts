import { describe, expect, it } from "vitest";
import {
  buildCardDoJogadorMessage,
  buildConquistaMessage,
  buildConquistasMessage,
  buildLinkDoGrupoMessage,
  buildRetrospectivaMessage,
  buildLinkPessoalMessage,
  buildResultMessage,
  buildRoundCallMessage,
  buildTeamsMessage,
} from "./whatsapp";

const teams = [
  {
    name: "Time Verde",
    color: "green",
    goalkeepers: ["Guilherme"],
    players: ["Salles", "Deivão"],
  },
  { name: "Time Rosa", color: "pink", goalkeepers: [], players: ["Pedrão", "Lucas"] },
];

describe("buildTeamsMessage", () => {
  const message = buildTeamsMessage({
    teams,
    venue: "Arena Farofa · Campo 03",
    time: "20:30",
    waiting: ["Carlão"],
    publicUrl: "https://jogae.app/r/abc",
  });

  it("abre com o cabeçalho e usa o emoji da cor do time", () => {
    expect(message.startsWith("⚽ TIMES DE HOJE")).toBe(true);
    expect(message).toContain("🟢 TIME VERDE");
    expect(message).toContain("🩷 TIME ROSA");
  });

  it("numera continuamente e marca o goleiro", () => {
    expect(message).toContain("1. Guilherme 🧤");
    expect(message).toContain("2. Salles");
    expect(message).toContain("3. Deivão");
  });

  it("inclui local, horário, espera e link", () => {
    expect(message).toContain("📍 Arena Farofa · Campo 03");
    expect(message).toContain("🕣 20:30");
    expect(message).toContain("⏰ ESPERA: Carlão");
    expect(message).toContain("https://jogae.app/r/abc");
    expect(message.endsWith("Times montados no Jogaê.")).toBe(true);
  });

  it("omite blocos vazios sem deixar linha sobrando", () => {
    const minimal = buildTeamsMessage({ teams });
    expect(minimal).not.toContain("📍");
    expect(minimal).not.toContain("ESPERA");
    expect(minimal).not.toMatch(/\n{3,}/);
  });

  it("cai num emoji genérico para cor desconhecida", () => {
    const custom = buildTeamsMessage({
      teams: [{ name: "Time Cinza", color: "cinza", goalkeepers: [], players: ["X"] }],
    });
    expect(custom).toContain("⚽ TIME CINZA");
  });
});

describe("buildResultMessage", () => {
  it("monta o resumo com placares e artilharia", () => {
    const message = buildResultMessage({
      groupName: "Fut da Quinta",
      dateText: "12/09",
      matches: [{ teamA: "Verde", teamB: "Rosa", scoreA: 2, scoreB: 1 }],
      topScorers: [{ name: "Pedrão", goals: 3 }],
    });
    expect(message).toContain("Verde ✅ 2 × 1 Rosa");
    expect(message).toContain("1. Pedrão — 3");
    expect(message).toContain("Registrado no Jogaê.");
  });

  it("não marca vencedor no empate", () => {
    const message = buildResultMessage({
      groupName: "Fut",
      dateText: "12/09",
      matches: [{ teamA: "Verde", teamB: "Rosa", scoreA: 1, scoreB: 1 }],
    });
    expect(message).not.toContain("✅");
  });
});

describe("buildRoundCallMessage", () => {
  it("usa microcopy natural conforme as vagas restantes", () => {
    const base = { groupName: "Fut da Quinta", dateText: "Quinta", capacity: 20 };
    expect(buildRoundCallMessage({ ...base, confirmed: 20 })).toContain(
      "20 confirmados. Fechou.",
    );
    expect(buildRoundCallMessage({ ...base, confirmed: 19 })).toContain(
      "Falta 1 pra fechar.",
    );
    expect(buildRoundCallMessage({ ...base, confirmed: 18 })).toContain(
      "Faltam 2 pra fechar.",
    );
  });

  it("não exibe número negativo quando a lista estoura", () => {
    const message = buildRoundCallMessage({
      groupName: "Fut",
      dateText: "Quinta",
      capacity: 20,
      confirmed: 23,
    });
    expect(message).toContain("23 confirmados. Fechou.");
    expect(message).not.toContain("-");
  });
});

describe("buildLinkPessoalMessage", () => {
  const base = {
    nome: "Igão",
    groupName: "Fut da Quinta",
    url: "https://jogae.app/p/8f14e45f-ceea-4d15-9b0f-9a2c1e4b7d3a",
  };

  it("chama a pessoa pelo nome e entrega o link inteiro", () => {
    const mensagem = buildLinkPessoalMessage(base);
    expect(mensagem).toContain("Fala, Igão!");
    expect(mensagem).toContain(base.url);
  });

  it("avisa que o link é pessoal — é o que evita ele virar link de grupo", () => {
    expect(buildLinkPessoalMessage(base)).toMatch(/não repassa/i);
  });

  it("só cita a rodada quando sabe quando é", () => {
    expect(buildLinkPessoalMessage(base)).not.toContain("Próxima rodada");
    expect(
      buildLinkPessoalMessage({ ...base, dateText: "Quinta, 20:30", venue: "Arena Farofa" }),
    ).toContain("Próxima rodada: Quinta, 20:30 · Arena Farofa.");
  });
});

describe("buildLinkDoGrupoMessage", () => {
  const base = {
    groupName: "Fut da Quinta",
    url: "https://jogae.app/e/8f14e45f-ceea-4d15-9b0f-9a2c1e4b7d3a",
  };

  it("abre com o nome do grupo e entrega o link inteiro", () => {
    const mensagem = buildLinkDoGrupoMessage(base);
    expect(mensagem.startsWith("⚽ FUT DA QUINTA")).toBe(true);
    expect(mensagem).toContain(base.url);
  });

  it("explica que é só tocar no nome — a lista de nomes é a novidade", () => {
    expect(buildLinkDoGrupoMessage(base)).toMatch(/toca no seu nome/i);
  });

  it("derruba as três objeções: conta, instalação e repetir o processo", () => {
    const mensagem = buildLinkDoGrupoMessage(base);
    expect(mensagem).toMatch(/não precisa criar conta/i);
    expect(mensagem).toMatch(/instalar nada/i);
    expect(mensagem).toMatch(/direto na sua página/i);
  });

  it("não manda guardar segredo: este link é do grupo, ao contrário do pessoal", () => {
    expect(buildLinkDoGrupoMessage(base)).not.toMatch(/não repassa/i);
  });

  it("só cita a rodada quando sabe quando é", () => {
    expect(buildLinkDoGrupoMessage(base)).not.toContain("Próxima rodada");
    expect(
      buildLinkDoGrupoMessage({ ...base, dateText: "Quinta, 20:30", venue: "Arena Farofa" }),
    ).toContain("Próxima rodada: Quinta, 20:30 · Arena Farofa.");
  });
});

describe("buildConquistaMessage", () => {
  const base = {
    groupName: "Fut da Quinta",
    conquista: "Artilheiro do mês",
    emoji: "⚽",
    nome: "Igão",
    detalhe: "9 gols",
  };

  it("põe a conquista no topo e o nome logo abaixo", () => {
    const mensagem = buildConquistaMessage(base);
    expect(mensagem.startsWith("⚽ ARTILHEIRO DO MÊS")).toBe(true);
    expect(mensagem).toContain("Igão — 9 gols");
  });

  it("só inclui link quando tem link", () => {
    expect(buildConquistaMessage(base)).not.toContain("http");
    expect(
      buildConquistaMessage({ ...base, publicUrl: "https://jogae.app/r/abc" }),
    ).toContain("https://jogae.app/r/abc");
  });
});

describe("buildCardDoJogadorMessage", () => {
  const base = {
    groupName: "Fut da Quinta",
    nome: "Igão",
    rodadas: 12,
    gols: 9,
    assistencias: 1,
    vitorias: 14,
    aproveitamento: 0.58,
  };

  it("resume a temporada em linhas curtas", () => {
    const mensagem = buildCardDoJogadorMessage(base);
    expect(mensagem).toContain("⚽ 9 gols");
    expect(mensagem).toContain("👟 1 assistência");
    expect(mensagem).toContain("58% de aproveitamento");
  });

  it("concorda em número no singular", () => {
    const mensagem = buildCardDoJogadorMessage({
      ...base,
      gols: 1,
      rodadas: 1,
      vitorias: 1,
    });
    expect(mensagem).toContain("⚽ 1 gol");
    expect(mensagem).toContain("1 rodada");
    expect(mensagem).toContain("1 vitória");
  });

  it("nunca menciona nível técnico (plano §13)", () => {
    expect(buildCardDoJogadorMessage(base)).not.toMatch(/n[íi]vel/i);
  });
});

describe("buildRetrospectivaMessage", () => {
  const base = {
    groupName: "Fut da Quinta",
    periodo: "Janeiro de 2026",
    rodadas: 4,
    partidas: 24,
    gols: 96,
    jogadores: 26,
    artilheiros: { nomes: ["Igão"], valor: 12 },
    garcons: { nomes: ["Salles", "Deivão"], valor: 6 },
    presencas: { nomes: ["Marcos"], valor: 4 },
  };

  it("abre com grupo e período e traz os números do mês", () => {
    const mensagem = buildRetrospectivaMessage(base);
    expect(mensagem.startsWith("📅 FUT DA QUINTA · JANEIRO DE 2026")).toBe(true);
    expect(mensagem).toContain("4 rodadas · 24 jogos · 96 gols");
  });

  it("junta empatados com 'e'", () => {
    expect(buildRetrospectivaMessage(base)).toContain("Salles e Deivão");
  });

  it("omite destaque vazio em vez de dizer que ninguém se destacou", () => {
    const mensagem = buildRetrospectivaMessage({
      ...base,
      artilheiros: { nomes: [], valor: 0 },
    });
    expect(mensagem).not.toContain("Artilharia");
    expect(mensagem).toContain("Garçom");
  });

  it("inclui a dupla do período quando existe", () => {
    const mensagem = buildRetrospectivaMessage({
      ...base,
      dupla: { nomes: ["Igão", "Salles"], jogosJuntos: 14 },
    });
    expect(mensagem).toContain("🤝 Dupla: Igão e Salles (14 jogos juntos)");
  });
});

describe("buildConquistasMessage", () => {
  const base = {
    groupName: "Fut da Quinta",
    recorte: "do mês",
    conquistas: [
      { emoji: "⚽", rotulo: "Artilheiro do mês", nome: "Igão", detalhe: "9 gols" },
      { emoji: "🧤", rotulo: "Garçom do mês", nome: "Salles", detalhe: "5 assistências" },
    ],
  };

  it("junta tudo numa mensagem só, com o recorte no cabeçalho", () => {
    const mensagem = buildConquistasMessage(base);
    expect(mensagem.startsWith("🏅 CONQUISTAS DO MÊS")).toBe(true);
    expect(mensagem).toContain("⚽ Artilheiro do mês: Igão — 9 gols");
    expect(mensagem).toContain("🧤 Garçom do mês: Salles — 5 assistências");
  });

  it("sem conquista não gera mensagem vazia com cabeçalho", () => {
    expect(buildConquistasMessage({ ...base, conquistas: [] })).toBe("");
  });
});
