import { describe, expect, it } from "vitest";
import { GOLS_DO_HAT_TRICK } from "@/domain/badges/conquistas";
import { celebracaoDoLance } from "./celebracao";

describe("celebracaoDoLance", () => {
  it("gol comum é comemoração comum", () => {
    expect(celebracaoDoLance(0)).toEqual({ tipo: "gol", gols: 1 });
    expect(celebracaoDoLance(1)).toEqual({ tipo: "gol", gols: 2 });
  });

  it("o gol que fecha o hat-trick ganha a comemoração especial", () => {
    expect(celebracaoDoLance(GOLS_DO_HAT_TRICK - 1)).toEqual({
      tipo: "hat-trick",
      gols: GOLS_DO_HAT_TRICK,
    });
  });

  it("o quarto gol volta a ser gol — senão a animação deixa de ser rara", () => {
    expect(celebracaoDoLance(GOLS_DO_HAT_TRICK).tipo).toBe("gol");
    expect(celebracaoDoLance(GOLS_DO_HAT_TRICK + 1).tipo).toBe("gol");
  });

  it("gol sem autor definido nunca é hat-trick", () => {
    expect(celebracaoDoLance(null)).toEqual({ tipo: "gol", gols: 0 });
  });
});
