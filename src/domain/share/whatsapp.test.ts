import { describe, expect, it } from "vitest";
import { buildResultMessage, buildRoundCallMessage, buildTeamsMessage } from "./whatsapp";

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
