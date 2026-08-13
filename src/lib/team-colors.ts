/**
 * As quatro cores do design system também identificam os quatro primeiros
 * times (plano §42). Classes são literais porque o Tailwind não resolve
 * nome de classe montado em runtime.
 */

export interface TeamTheme {
  key: string;
  label: string;
  emoji: string;
  hex: string;
  /** Fundo sólido na cor — texto sempre no ink escuro. */
  solid: string;
  text: string;
  border: string;
  ring: string;
  /** Faixa lateral de 4px. */
  stripe: string;
  /** Fundo tênue para linhas e badges. */
  tint: string;
}

export const TEAM_THEMES: Record<string, TeamTheme> = {
  green: {
    key: "green",
    label: "Verde",
    emoji: "🟢",
    hex: "#35E878",
    solid: "bg-green text-canvas",
    text: "text-green",
    border: "border-green",
    ring: "ring-green",
    stripe: "bg-green",
    tint: "bg-green/10",
  },
  yellow: {
    key: "yellow",
    label: "Amarelo",
    emoji: "🟡",
    hex: "#FFD84A",
    solid: "bg-yellow text-canvas",
    text: "text-yellow",
    border: "border-yellow",
    ring: "ring-yellow",
    stripe: "bg-yellow",
    tint: "bg-yellow/10",
  },
  red: {
    key: "red",
    label: "Vermelho",
    emoji: "🔴",
    hex: "#FF4D4D",
    solid: "bg-red text-canvas",
    text: "text-red",
    border: "border-red",
    ring: "ring-red",
    stripe: "bg-red",
    tint: "bg-red/10",
  },
  pink: {
    key: "pink",
    label: "Rosa",
    emoji: "🩷",
    hex: "#FF4FA3",
    solid: "bg-pink text-canvas",
    text: "text-pink",
    border: "border-pink",
    ring: "ring-pink",
    stripe: "bg-pink",
    tint: "bg-pink/10",
  },
};

const FALLBACK: TeamTheme = {
  key: "neutral",
  label: "Time",
  emoji: "⚽",
  hex: "#A7AEB9",
  solid: "bg-ink-2 text-canvas",
  text: "text-ink-2",
  border: "border-line-strong",
  ring: "ring-line-strong",
  stripe: "bg-ink-2",
  tint: "bg-elevated",
};

export const TEAM_COLOR_ORDER = ["green", "yellow", "red", "pink"] as const;

export function teamTheme(color: string | null | undefined): TeamTheme {
  if (!color) return FALLBACK;
  return TEAM_THEMES[color] ?? FALLBACK;
}

/** Presets usados ao criar os times de uma rodada. */
export function teamPreset(index: number) {
  const color = TEAM_COLOR_ORDER[index % TEAM_COLOR_ORDER.length];
  const theme = TEAM_THEMES[color];
  // A partir do 5º time o nome ganha número para não repetir cor sem aviso.
  const suffix = index >= TEAM_COLOR_ORDER.length ? ` ${Math.floor(index / 4) + 1}` : "";
  return { name: `Time ${theme.label}${suffix}`, color };
}
