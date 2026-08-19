import type { SVGProps } from "react";

/**
 * Iconografia do design system: outline 1,75 em grid 24, cantos arredondados,
 * sem preenchimento. Os paths vieram direto do arquivo de protótipo.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconBall = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.2l4.4 3.2-1.7 5.2H9.3l-1.7-5.2z" />
    <path d="M12 3v4.2M20.6 10.4l-4 0M16.7 19.6l-2-4M7.3 19.6l2-4M3.4 10.4l4 0" />
  </Icon>
);

export const IconGoal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 19V7h20v12" />
    <path d="M6 19V11h12v8M2 19h20M10 11v8M14 11v8M6 15h12" />
  </Icon>
);

export const IconGoalkeeper = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 21v-9a1.9 1.9 0 0 1 3.8 0V7.5a1.6 1.6 0 0 1 3.2 0v5.2l2.6 1.5A3 3 0 0 1 18 16.8V21z" />
    <path d="M7 17h11" />
  </Icon>
);

export const IconWhistle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8.5" cy="13.5" r="4.5" />
    <path d="M13 11.8h8v3.4h-8M17 8.6l-3.6 2" />
  </Icon>
);

export const IconScoreboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="12" rx="2" />
    <path d="M12 5v12M6 10v2M17 10v2M8 20h8" />
  </Icon>
);

export const IconTrophy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3.5h8v5a4 4 0 0 1-8 0z" />
    <path d="M12 12.5V16M8.5 20h7M8 4.5H5.5v2A3.5 3.5 0 0 0 8.6 10M16 4.5h2.5v2A3.5 3.5 0 0 1 15.4 10" />
  </Icon>
);

/** Estreia — primeira vez em campo. */
export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
  </Icon>
);

/** Sequência de presença — corrente que não arrebenta. */
export const IconStreak = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 14.5l-1.9 1.9a3.4 3.4 0 0 1-4.8-4.8l1.9-1.9" />
    <path d="M14.5 9.5l1.9-1.9a3.4 3.4 0 0 1 4.8 4.8l-1.9 1.9" />
    <path d="M9.2 14.8l5.6-5.6" />
  </Icon>
);

export const IconAssist = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 18.5C8 18.5 10 7.5 20.5 5.5" strokeDasharray="3 3" />
    <circle cx="4" cy="18.5" r="2" />
    <path d="M20.5 5.5l-4 .3M20.5 5.5l-.3 4" />
  </Icon>
);

export const IconPlayers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2M17.5 14h.5a3.5 3.5 0 0 1 3.5 3.5V20" />
  </Icon>
);

export const IconFormation = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3.5" width="18" height="17" rx="2" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    <circle cx="16" cy="8" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="8" cy="16" r="1.4" fill="currentColor" />
    <circle cx="16" cy="16" r="1.4" fill="currentColor" />
  </Icon>
);

export const IconDraw = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6.5h4l10 11h4M3 17.5h4l3-3.2M14 9.7l3-3.2h4" />
    <path d="M18.5 4l2.5 2.5-2.5 2.5M18.5 15l2.5 2.5-2.5 2.5" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="15" rx="2" />
    <path d="M3 10h18M8 3.5v4M16 3.5v4" />
  </Icon>
);

export const IconPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </Icon>
);

export const IconShare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="18" cy="6" r="2.8" />
    <circle cx="6" cy="12" r="2.8" />
    <circle cx="18" cy="18" r="2.8" />
    <path d="M8.5 10.7l7-3.4M8.5 13.3l7 3.4" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 5.5H5.5a2 2 0 0 0-2 2v10" />
  </Icon>
);

export const IconUndo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h11a5 5 0 0 1 0 10H9" />
    <path d="M8 4.5L3.5 9 8 13.5" />
  </Icon>
);

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l11-11-4-4L4 16z" />
    <path d="M13.5 5.5l4 4" />
  </Icon>
);

export const IconRanking = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V13M10 20V8M16 20V15M22 20H2" />
    <path d="M20 20V4" />
  </Icon>
);

export const IconHistory = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" />
    <path d="M3.5 18.5V13H9" />
    <path d="M12 8v4.3l3 1.8" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.4l2.8 2.8L16.5 9.5" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const IconArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 10.5L12 4l8.5 6.5V20H3.5z" />
    <path d="M9.5 20v-6h5v6" />
  </Icon>
);

export const IconMore = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M15.8 15.8L20.5 20.5" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16M9.5 6.5V4h5v2.5" />
    <path d="M6.5 6.5l1 13h9l1-13M10.5 10v6M13.5 10v6" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
    <path d="M16.5 8.5L20.5 12l-4 3.5M20 12H10" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1L5.3 5.3" />
  </Icon>
);

/** Nuvem cortada — usada no indicador de "sem conexão, guardado aqui". */
export const IconOffline = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .8-7.5 5.5 5.5 0 0 0-9-3.3" />
    <path d="M7.5 18.5a3.5 3.5 0 0 1-.4-7" />
    <path d="M3 3l18 18" />
  </Icon>
);

export const IconSync = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 12a8.5 8.5 0 0 1-14.4 6.1" />
    <path d="M3.5 12a8.5 8.5 0 0 1 14.4-6.1" />
    <path d="M18 2.5V6h-3.5M6 21.5V18h3.5" />
  </Icon>
);

/** Símbolo da marca: bola parada e trajetória saindo do quadro chanfrado. */
export function JogaeMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      className={className}
      aria-label="Jogaê"
      role="img"
    >
      <path d="M0 10 L10 0 H52 V42 L42 52 H0 Z" fill="#35E878" />
      <circle cx="16" cy="38" r="6" fill="#090A0C" />
      <path d="M16 38 C31 38 37 25 37 12" stroke="#090A0C" strokeWidth="5" strokeLinecap="round" />
      <path d="M31 12 H43" stroke="#090A0C" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
