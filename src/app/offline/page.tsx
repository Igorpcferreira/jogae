import { JogaeMark } from "@/components/ui/icons";
import { TeamStripe } from "@/components/football/team-card";

export const metadata = { title: "Sem conexão" };

/**
 * Fallback do service worker. Precisa ser estática e não depender de sessão:
 * ela é servida do cache exatamente quando não há rede pra checar nada.
 */
export default function OfflinePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="texture-grid-lg absolute inset-0 opacity-70" aria-hidden />

      <div className="relative flex max-w-sm flex-col items-center gap-6">
        <JogaeMark size={52} />
        <h1 className="font-display text-h1 leading-none text-ink text-balance">
          Sem sinal aí no campo
        </h1>
        <p className="text-body text-ink-2 text-pretty">
          Sem internet a gente não consegue carregar essa tela. Os gols que você
          registrou continuam guardados no celular e sobem sozinhos quando a
          conexão voltar.
        </p>
        <TeamStripe className="w-28" />
      </div>
    </div>
  );
}
