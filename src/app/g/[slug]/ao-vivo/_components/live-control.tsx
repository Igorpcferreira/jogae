"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { teamTheme } from "@/lib/team-colors";
import { Button, MatchActionButton } from "@/components/ui/button";
import { Card, Chip, LiveBadge, SectionLabel } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/dialog";
import { Scoreboard } from "@/components/football/scoreboard";
import { IconAssist, IconGoal, IconUndo } from "@/components/ui/icons";
import {
  encerrarPartidaAction,
  encerrarRodadaAction,
  registrarGolAction,
  iniciarPartidaAction,
  desfazerUltimoLanceAction,
} from "@/features/live/actions";
import {
  enfileirarGol,
  novoId,
  removerPendentes,
  type GolPendente,
} from "@/lib/fila-offline";

export interface LiveTeam {
  id: string;
  name: string;
  color: string;
  players: Array<{ id: string; name: string; isGoalkeeper: boolean }>;
}

export interface LiveEvent {
  id: string;
  minute: number | null;
  teamColor: string;
  playerName: string | null;
  assistName: string | null;
  type: "GOAL" | "OWN_GOAL";
}

export interface LiveMatchState {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  startedAt: string | null;
}

export function LiveControl({
  roundId,
  teams,
  match,
  events,
  matchRule,
}: {
  roundId: string;
  teams: LiveTeam[];
  match: LiveMatchState | null;
  events: LiveEvent[];
  matchRule?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [goalFor, setGoalFor] = useState<string | null>(null);
  const [author, setAuthor] = useState<{ id: string; name: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  /**
   * Gols que ainda não voltaram do servidor, por time. O placar do banco não
   * mudou ainda, mas o organizador precisa ver o número subir na hora.
   */
  const [naFila, setNaFila] = useState<Record<string, number>>({});

  const teamA = teams.find((team) => team.id === match?.teamAId);
  const teamB = teams.find((team) => team.id === match?.teamBId);

  function closeSheet() {
    setGoalFor(null);
    setAuthor(null);
  }

  function saveGoal(assistPlayerId: string | null) {
    if (!match || !goalFor) return;
    const teamId = goalFor;
    const playerId = author?.id ?? null;
    const startedAt = match.startedAt;
    closeSheet();
    setCelebrate(true);

    // O lance vai pro IndexedDB antes de tentar a rede. Se o celular estiver
    // sem sinal no meio do campo, o gol não se perde (plano §40).
    const pendente: GolPendente = {
      id: novoId(),
      matchId: match.id,
      teamId,
      playerId,
      assistPlayerId,
      ownGoal: false,
      minute: startedAt
        ? Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000) + 1)
        : null,
      criadoEm: Date.now(),
    };

    setNaFila((atual) => ({ ...atual, [teamId]: (atual[teamId] ?? 0) + 1 }));

    startTransition(async () => {
      await enfileirarGol(pendente);
      window.dispatchEvent(new Event("jogae:fila-mudou"));

      try {
        await registrarGolAction({
          matchId: match.id,
          teamId,
          playerId,
          assistPlayerId,
          minute: pendente.minute,
          clientEventId: pendente.id,
        });
        await removerPendentes([pendente.id]);
        setNaFila((atual) => ({ ...atual, [teamId]: Math.max(0, (atual[teamId] ?? 1) - 1) }));
        router.refresh();
      } catch {
        // Continua na fila; o indicador de sincronização assume daqui.
      } finally {
        window.dispatchEvent(new Event("jogae:fila-mudou"));
      }
    });
  }

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(timer);
  }, [celebrate]);

  /* ── Sem partida: escolher confronto ─────────────────────── */

  if (!match || !teamA || !teamB) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-h1 leading-none text-ink">
            Times prontos? Comece o primeiro jogo.
          </h1>
          {matchRule && <p className="mt-2 text-body text-ink-2">{matchRule}</p>}
        </div>
        <FixturePicker teams={teams} roundId={roundId} disabled={pending} />
      </div>
    );
  }

  const themeA = teamTheme(teamA.color);
  const themeB = teamTheme(teamB.color);

  return (
    <div className="flex flex-col gap-5">
      {celebrate && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          aria-hidden
        >
          <span className="animate-flash font-display text-[68px] leading-none text-green drop-shadow-[0_0_40px_rgba(53,232,120,0.4)]">
            Goool
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <LiveBadge />
        <MatchClock startedAt={match.startedAt} />
      </div>

      {/* Placar otimista: o que o banco confirmou + o que ainda está na fila. */}
      <Scoreboard
        live
        teamAName={teamA.name.replace("Time ", "")}
        teamAColor={teamA.color}
        scoreA={match.scoreA + (naFila[teamA.id] ?? 0)}
        teamBName={teamB.name.replace("Time ", "")}
        teamBColor={teamB.color}
        scoreB={match.scoreB + (naFila[teamB.id] ?? 0)}
      />

      <div className="grid grid-cols-2 gap-2">
        <GoalButton
          label={teamA.name.replace("Time ", "")}
          theme={themeA}
          onClick={() => setGoalFor(teamA.id)}
          disabled={pending}
        />
        <GoalButton
          label={teamB.name.replace("Time ", "")}
          theme={themeB}
          onClick={() => setGoalFor(teamB.id)}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MatchActionButton
          disabled={pending || events.length === 0}
          onClick={() =>
            startTransition(async () => {
              await desfazerUltimoLanceAction(match.id);
              router.refresh();
            })
          }
        >
          <IconUndo size={17} />
          Desfazer lance
        </MatchActionButton>
        <MatchActionButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await encerrarPartidaAction(match.id);
              router.refresh();
            })
          }
        >
          Encerrar
        </MatchActionButton>
      </div>

      <section>
        <SectionLabel>Últimos lances</SectionLabel>
        {events.length === 0 ? (
          <Card className="py-4">
            <p className="text-body-s text-ink-3">Nenhum gol ainda. Bola rolando.</p>
          </Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line/60">
              {events.slice(0, 8).map((event) => {
                const theme = teamTheme(event.teamColor);
                return (
                  <li key={event.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-8 shrink-0 font-display text-[15px] tabular text-ink-3">
                      {event.minute ? `${event.minute}'` : "—"}
                    </span>
                    <span className={cn("h-6 w-[3px] rounded-pill", theme.stripe)} aria-hidden />
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-red text-canvas">
                      <IconGoal size={13} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-s">
                      <strong className="font-bold text-ink">
                        {event.playerName ?? "Sem autor"}
                      </strong>
                      <span className="text-ink-3">
                        {" "}
                        · {event.type === "OWN_GOAL" ? "contra" : "gol"}
                      </span>
                    </span>
                    {event.assistName && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-caption text-yellow">
                        <IconAssist size={13} />
                        {event.assistName}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionLabel>A seguir</SectionLabel>
        <FixturePicker teams={teams} roundId={roundId} disabled={pending} compact />
      </section>

      <Button
        variant="ghost"
        size="md"
        block
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await encerrarRodadaAction(roundId);
            router.refresh();
          })
        }
      >
        Encerrar rodada
      </Button>

      {/* Gol de quem? → Teve assistência? — dois toques. */}
      {goalFor && (
        <GoalSheet
          team={goalFor === teamA.id ? teamA : teamB}
          author={author}
          onPickAuthor={setAuthor}
          onSave={saveGoal}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

function GoalButton({
  label,
  theme,
  onClick,
  disabled,
}: {
  label: string;
  theme: ReturnType<typeof teamTheme>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-16 items-center justify-center gap-2 rounded-md",
        "font-display text-[20px] leading-none transition-all duration-[120ms]",
        "active:translate-y-px disabled:opacity-40",
        theme.solid,
      )}
    >
      <IconGoal size={20} />
      Gol {label}
    </button>
  );
}

function GoalSheet({
  team,
  author,
  onPickAuthor,
  onSave,
  onClose,
}: {
  team: LiveTeam;
  author: { id: string; name: string } | null;
  onPickAuthor: (player: { id: string; name: string }) => void;
  onSave: (assistPlayerId: string | null) => void;
  onClose: () => void;
}) {
  const step = author ? "assist" : "author";
  const options = author
    ? team.players.filter((player) => player.id !== author.id)
    : team.players;

  return (
    <Sheet
      titulo={step === "author" ? "Gol de quem?" : "Teve assistência?"}
      onFechar={onClose}
      acessorio={<Chip tone="neutral">{team.name.replace("Time ", "")}</Chip>}
      corpoClassName="max-h-[46vh] gap-0 px-3 py-3"
      rodape={
        <>
          {step === "author" ? (
            <Button variant="secondary" size="lg" block onClick={() => onSave(null)}>
              Sem autor definido
            </Button>
          ) : (
            <Button size="lg" block onClick={() => onSave(null)}>
              Sem assistência
            </Button>
          )}
          <Button variant="ghost" size="md" block onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {options.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() =>
              step === "author"
                ? onPickAuthor({ id: player.id, name: player.name })
                : onSave(player.id)
            }
            className={cn(
              "flex h-14 items-center justify-center rounded-md border border-line bg-surface px-3",
              "text-body font-medium text-ink transition-colors duration-[120ms]",
              "hover:border-line-strong active:bg-elevated",
            )}
          >
            <span className="truncate">{player.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function FixturePicker({
  teams,
  roundId,
  disabled,
  compact,
}: {
  teams: LiveTeam[];
  roundId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [teamAId, setTeamAId] = useState<string | null>(null);

  function start(teamBId: string) {
    if (!teamAId) return;
    const a = teamAId;
    setTeamAId(null);
    startTransition(async () => {
      await iniciarPartidaAction(roundId, a, teamBId);
      router.refresh();
    });
  }

  if (teams.length < 2) {
    return (
      <Card className="py-4">
        <p className="text-body-s text-ink-3">
          Monte os times da rodada antes de começar o jogo.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <p className="text-body-s text-ink-3">
          {teamAId ? "Contra quem?" : "Escolhe os dois times do próximo jogo."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => {
          const theme = teamTheme(team.color);
          const isFirst = teamAId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              disabled={disabled || pending}
              onClick={() => (teamAId ? start(team.id) : setTeamAId(team.id))}
              className={cn(
                "flex h-14 items-center gap-2.5 rounded-md border px-4 text-left transition-all duration-[120ms]",
                "disabled:opacity-40",
                isFirst
                  ? `${theme.solid} border-transparent`
                  : "border-line bg-surface text-ink hover:border-line-strong",
              )}
            >
              <span
                className={cn("h-6 w-1 rounded-pill", isFirst ? "bg-canvas/40" : theme.stripe)}
                aria-hidden
              />
              <span className="truncate font-display text-[17px] leading-none">
                {team.name.replace("Time ", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchClock({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return null;

  return (
    <span className="font-display text-[26px] tabular leading-none text-ink-2">{elapsed}</span>
  );
}
