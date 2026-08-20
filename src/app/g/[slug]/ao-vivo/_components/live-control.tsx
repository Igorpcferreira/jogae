"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { teamTheme } from "@/lib/team-colors";
import { Button, MatchActionButton } from "@/components/ui/button";
import { Card, Chip, LiveBadge, SectionLabel } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/dialog";
import { Scoreboard } from "@/components/football/scoreboard";
import { IconAssist, IconGoal, IconUndo } from "@/components/ui/icons";
import {
  golRecenteDoMesmoTime,
  type GolRepetido,
  type LanceRegistrado,
} from "@/domain/live/gol-repetido";
import { celebracaoDoLance, type TipoDeCelebracao } from "@/domain/live/celebracao";
import {
  situacaoDaPartida,
  type RegrasDePartida,
} from "@/domain/live/fim-de-partida";
import { apitarFimUmaVez, desarmarApito } from "@/lib/apito";
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
  /** Qual time marcou — a checagem de gol repetido é por time. */
  teamId: string;
  /** Autor, quando houve. Gol sem autor não conta pra hat-trick. */
  playerId: string | null;
  /** Quando o lance entrou, pelo relógio do servidor (epoch ms). */
  registradoEm: number;
  /**
   * Id que este aparelho deu ao lance antes de mandar (fila offline). É o que
   * deixa o placar otimista reconciliar: gol local confirmado pelo servidor
   * para de contar em dobro.
   */
  clientEventId: string | null;
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
  golsDaRodada,
  matchRule,
  regras,
  agoraNoServidor,
}: {
  roundId: string;
  teams: LiveTeam[];
  match: LiveMatchState | null;
  events: LiveEvent[];
  /** Gols de cada jogador na rodada inteira, já confirmados pelo servidor. */
  golsDaRodada: Record<string, number>;
  matchRule?: string | null;
  /** Fim de partida do grupo: "até X gols ou Y minutos". */
  regras: RegrasDePartida;
  agoraNoServidor: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [goalFor, setGoalFor] = useState<string | null>(null);
  const [author, setAuthor] = useState<{ id: string; name: string } | null>(null);
  const [celebrate, setCelebrate] = useState<{
    tipo: TipoDeCelebracao;
    nome: string | null;
  } | null>(null);
  /**
   * Gols apontados neste aparelho. Entram na checagem de repetição e no placar
   * otimista **enquanto o servidor não confirma** — a reconciliação é por
   * `clientEventId`, então o mesmo lance nunca conta em dobro, nem quando a
   * action falha e a fila offline entrega por outro caminho.
   */
  const [golsLocais, setGolsLocais] = useState<Array<LanceRegistrado & { autorId: string | null }>>(
    [],
  );
  /**
   * Partida trocou → gol local da partida anterior não pode vazar pro placar
   * da nova (o mesmo time joga de novo na sequência). Ajuste de estado durante
   * o render, como a doc do React manda para "derivar do prop anterior".
   */
  const [partidaAnterior, setPartidaAnterior] = useState<string | null>(match?.id ?? null);
  if ((match?.id ?? null) !== partidaAnterior) {
    setPartidaAnterior(match?.id ?? null);
    setGolsLocais([]);
  }
  /** Gol suspeito de ser o mesmo que alguém já marcou — vira pergunta, não bloqueio. */
  const [suspeita, setSuspeita] = useState<{ teamId: string; repetido: GolRepetido } | null>(
    null,
  );

  /**
   * Diferença entre o relógio do servidor e o deste celular. Comparar carimbo
   * do banco com `Date.now()` daqui, sem corrigir, faria a checagem sumir em
   * silêncio no aparelho com a hora errada.
   */
  const desvioDoRelogio = useRef(0);
  useEffect(() => {
    desvioDoRelogio.current = agoraNoServidor - Date.now();
  }, [agoraNoServidor]);

  const agoraDoServidor = () => Date.now() + desvioDoRelogio.current;

  /**
   * O relógio da partida bate uma vez por segundo, sempre pelo relógio do
   * servidor corrigido — é ele que alimenta o cronômetro, a contagem
   * regressiva e a detecção de "deu o tempo". Uma fonte só: relógio da tela
   * discordando do apito seria pior que não ter apito.
   */
  const [tickAgora, setTickAgora] = useState(agoraNoServidor);
  const partidaAtiva = match?.startedAt ?? null;
  useEffect(() => {
    if (!partidaAtiva) return;
    const timer = setInterval(
      () => setTickAgora(Date.now() + desvioDoRelogio.current),
      1000,
    );
    return () => clearInterval(timer);
  }, [partidaAtiva]);

  const teamA = teams.find((team) => team.id === match?.teamAId);
  const teamB = teams.find((team) => team.id === match?.teamBId);

  // Reconciliação: gol local que o servidor já devolveu (mesmo clientEventId)
  // sai da conta. É o que impede placar em dobro quando a action falha mas a
  // fila offline entrega, e hat-trick comemorado no segundo gol.
  const confirmadosNoServidor = new Set(
    events.map((event) => event.clientEventId).filter((id): id is string => id !== null),
  );
  const golsPendentes = golsLocais.filter((gol) => !confirmadosNoServidor.has(gol.id));

  // Placar otimista (banco + pendentes) — o fim por gols precisa disparar no
  // toque do segundo gol, não quando o servidor responder.
  const placarA = match
    ? match.scoreA + golsPendentes.filter((gol) => gol.teamId === match.teamAId).length
    : 0;
  const placarB = match
    ? match.scoreB + golsPendentes.filter((gol) => gol.teamId === match.teamBId).length
    : 0;
  const decorridoSeg = partidaAtiva
    ? Math.max(0, Math.floor((tickAgora - new Date(partidaAtiva).getTime()) / 1000))
    : 0;
  const situacao = situacaoDaPartida({
    golsA: placarA,
    golsB: placarB,
    decorridoSeg,
    regras,
  });

  /**
   * O apito toca na **virada** pra "fim", uma vez por partida. A memória mora
   * no módulo do apito (não num ref): navegar pro ranking e voltar durante o
   * "mais um minutinho" remonta este componente, e re-apitar a cada visita
   * transformaria o aviso em buzina. Desfazer o gol do limite desarma — se o
   * time fizer outro depois, apita de novo.
   */
  const partidaId = match?.id ?? null;
  const fimAtivo = Boolean(match && situacao.fim);
  useEffect(() => {
    if (!partidaId) return;
    if (fimAtivo) apitarFimUmaVez(partidaId);
    else desarmarApito(partidaId);
  }, [fimAtivo, partidaId]);

  function closeSheet() {
    setGoalFor(null);
    setAuthor(null);
  }

  /**
   * O caminho de todo toque em "Gol".
   *
   * Com o link do grupo no ar, mais de um celular acompanha o mesmo jogo: sai o
   * gol e duas pessoas apertam o botão. O `clientEventId` da fila offline
   * resolve o reenvio do mesmo aparelho, não isso. Aqui a regra pergunta — o
   * lance sempre pode ser confirmado, porque gol legítimo recusado não tem
   * conserto e o cara que fez tá olhando.
   */
  function pedirGol(teamId: string) {
    const lances: LanceRegistrado[] = [
      ...events.map((event) => ({
        id: event.id,
        teamId: event.teamId,
        registradoEm: event.registradoEm,
        autor: event.playerName,
      })),
      // Só os pendentes: lance já confirmado está em `events` e entraria em
      // dobro na checagem de repetição.
      ...golsPendentes,
    ];

    const repetido = golRecenteDoMesmoTime(lances, teamId, agoraDoServidor());
    if (repetido) {
      setSuspeita({ teamId, repetido });
      return;
    }
    setGoalFor(teamId);
  }

  function saveGoal(assistPlayerId: string | null) {
    if (!match || !goalFor) return;
    const teamId = goalFor;
    const playerId = author?.id ?? null;
    const nomeDoAutor = author?.name ?? null;
    const startedAt = match.startedAt;
    closeSheet();

    // Gols do autor na rodada: os que o servidor já confirmou mais os deste
    // aparelho que **ainda não voltaram** — o confirmado já está nos dois
    // lados, e contá-lo em dobro faria o hat-trick sair no segundo gol.
    const golsAntes = playerId
      ? (golsDaRodada[playerId] ?? 0) +
        golsPendentes.filter((gol) => gol.autorId === playerId).length
      : null;
    setCelebrate({ tipo: celebracaoDoLance(golsAntes).tipo, nome: nomeDoAutor });

    // O lance vai pro IndexedDB antes de tentar a rede. Se o celular estiver
    // sem sinal no meio do campo, o gol não se perde (plano §40).
    const pendente: GolPendente = {
      id: novoId(),
      matchId: match.id,
      teamId,
      playerId,
      assistPlayerId,
      ownGoal: false,
      // Pelo relógio do servidor: celular 10 min atrasado gravaria todo gol
      // como "1'" — e o minuto do lance é permanente na timeline.
      minute: startedAt
        ? Math.max(
            1,
            Math.floor((agoraDoServidor() - new Date(startedAt).getTime()) / 60_000) + 1,
          )
        : null,
      criadoEm: Date.now(),
    };

    setGolsLocais((atual) => [
      ...atual,
      {
        id: pendente.id,
        teamId,
        registradoEm: agoraDoServidor(),
        autor: nomeDoAutor,
        autorId: playerId,
      },
    ]);

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
        // O refresh traz o lance com o clientEventId — a reconciliação tira o
        // gol local da conta sozinha, sem contador pra decrementar.
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
    // O hat-trick segura a tela mais tempo porque é o momento da noite; o gol
    // comum sai rápido pra não atrapalhar quem está apontando o próximo.
    const duracao = celebrate.tipo === "hat-trick" ? 1500 : 900;
    const timer = setTimeout(() => setCelebrate(null), duracao);
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
      {celebrate?.tipo === "gol" && (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          aria-hidden
        >
          <span className="animate-flash font-display text-[68px] leading-none text-green drop-shadow-[0_0_40px_rgba(53,232,120,0.4)]">
            Goool
          </span>
        </div>
      )}

      {celebrate?.tipo === "hat-trick" && <HatTrick nome={celebrate.nome} />}

      <div className="flex items-center justify-between gap-3">
        <LiveBadge />
        {match.startedAt && (
          <MatchClock
            decorridoSeg={decorridoSeg}
            restanteSeg={situacao.restanteSeg}
          />
        )}
      </div>

      {situacao.fim && (
        <Card
          role="status"
          className="flex flex-col gap-3 border-red/60 bg-red/10 py-4"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-pill bg-red animate-live-pulse"
              aria-hidden
            />
            <p className="text-body font-bold text-ink">
              {situacao.motivo === "gols"
                ? `${(placarA >= placarB ? teamA : teamB).name.replace("Time ", "")} chegou a ${regras.limiteGols} ${regras.limiteGols === 1 ? "gol" : "gols"}. Fim de jogo!`
                : `Deu ${regras.limiteMinutos} ${regras.limiteMinutos === 1 ? "minuto" : "minutos"}. Fim de jogo!`}
            </p>
          </div>
          <Button
            variant="danger"
            size="lg"
            block
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await encerrarPartidaAction(match.id);
                router.refresh();
              })
            }
          >
            Encerrar partida
          </Button>
        </Card>
      )}

      {/* Placar otimista: o que o banco confirmou + o que ainda está na fila. */}
      <Scoreboard
        live
        teamAName={teamA.name.replace("Time ", "")}
        teamAColor={teamA.color}
        scoreA={placarA}
        teamBName={teamB.name.replace("Time ", "")}
        teamBColor={teamB.color}
        scoreB={placarB}
      />

      <div className="grid grid-cols-2 gap-2">
        <GoalButton
          label={teamA.name.replace("Time ", "")}
          theme={themeA}
          onClick={() => pedirGol(teamA.id)}
          disabled={pending}
        />
        <GoalButton
          label={teamB.name.replace("Time ", "")}
          theme={themeB}
          onClick={() => pedirGol(teamB.id)}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MatchActionButton
          disabled={pending || events.length === 0}
          onClick={() =>
            startTransition(async () => {
              // Quem desfez já disse que aquilo não foi gol: o próximo toque no
              // mesmo time não pode ser tratado como repetição.
              setGolsLocais([]);
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

      {suspeita && (
        <ConfirmacaoDeGolRepetido
          teamName={(suspeita.teamId === teamA.id ? teamA : teamB).name.replace("Time ", "")}
          repetido={suspeita.repetido}
          onConfirmar={() => {
            setGoalFor(suspeita.teamId);
            setSuspeita(null);
          }}
          onFechar={() => setSuspeita(null)}
        />
      )}

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

/**
 * A comemoração de hat-trick (plano §27).
 *
 * A única animação do app que passa de meio segundo, e a única que ocupa a tela
 * inteira. Isso só se sustenta porque ela é rara: sai no gol que fecha os três
 * e não sai mais (`domain/live/celebracao.ts`).
 *
 * `aria-hidden` e `pointer-events-none`: quem está apontando o jogo não pode
 * ficar preso atrás de uma festa, e leitor de tela não tem o que fazer com
 * confete. O `prefers-reduced-motion` global já zera as duas animações.
 */
function HatTrick({ nome }: { nome: string | null }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden
    >
      {CONFETES.map((confete, index) => (
        <span
          key={index}
          className={cn(
            "animate-confete absolute top-0 size-2.5 rounded-[2px]",
            confete.cor,
          )}
          style={{ left: confete.esquerda, animationDelay: confete.atraso }}
        />
      ))}

      <div className="animate-hat-trick flex h-full flex-col items-center justify-center gap-2">
        <span className="font-display text-[64px] leading-none text-yellow drop-shadow-[0_0_48px_rgba(245,200,66,0.45)]">
          Hat-trick
        </span>
        {nome && (
          <span className="font-display text-[28px] leading-none text-ink">{nome}</span>
        )}
        <span className="text-caption font-bold uppercase tracking-[0.14em] text-ink-2">
          Três na mesma noite
        </span>
      </div>
    </div>
  );
}

/**
 * Posições fixas, não sorteadas: `Math.random()` na renderização faria o
 * servidor e o cliente desenharem confetes diferentes, e as quatro cores são as
 * do design system — confete não é lugar pra inventar cor.
 */
const CONFETES = [
  { esquerda: "8%", atraso: "0ms", cor: "bg-green" },
  { esquerda: "18%", atraso: "180ms", cor: "bg-yellow" },
  { esquerda: "29%", atraso: "60ms", cor: "bg-red" },
  { esquerda: "41%", atraso: "260ms", cor: "bg-pink" },
  { esquerda: "52%", atraso: "120ms", cor: "bg-yellow" },
  { esquerda: "63%", atraso: "320ms", cor: "bg-green" },
  { esquerda: "74%", atraso: "40ms", cor: "bg-pink" },
  { esquerda: "85%", atraso: "220ms", cor: "bg-red" },
  { esquerda: "93%", atraso: "140ms", cor: "bg-yellow" },
];

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

/**
 * "Já marcaram esse gol?" — a pergunta que evita placar fantasma.
 *
 * O botão de confirmar é o primário: o caso comum é ser gol mesmo, e quem tá
 * com o celular na mão não pode ficar brigando com o app. O que a tela precisa
 * dar é a informação que falta — de quem foi o gol anterior e há quantos
 * segundos —, porque é isso que deixa a pessoa decidir em um segundo.
 */
function ConfirmacaoDeGolRepetido({
  teamName,
  repetido,
  onConfirmar,
  onFechar,
}: {
  teamName: string;
  repetido: GolRepetido;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  const quem = repetido.autor ? `de ${repetido.autor}` : "sem autor definido";
  const quando =
    repetido.segundos <= 1 ? "agora mesmo" : `há ${repetido.segundos} segundos`;

  return (
    <Sheet
      titulo="Já marcaram esse gol?"
      onFechar={onFechar}
      acessorio={<Chip tone="yellow">{teamName}</Chip>}
      rodape={
        <>
          <Button size="lg" block onClick={onConfirmar}>
            É outro gol
          </Button>
          <Button variant="secondary" size="lg" block onClick={onFechar}>
            Já tinha marcado
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-2 text-pretty">
        Entrou um gol do {teamName} {quando}, {quem}. Se for o mesmo lance, é só
        deixar como está — o placar já contou.
      </p>
    </Sheet>
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

function formatarRelogio(segundos: number): string {
  const s = Math.max(0, segundos);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Cronômetro da partida: quanto já foi e, quando o grupo tem limite de tempo,
 * quanto falta. Quem conta o segundo é o pai (uma fonte de relógio só) — aqui
 * é apresentação. O "faltam" fica vermelho no último minuto: é quando quem tá
 * perdendo começa a olhar pro relógio.
 */
function MatchClock({
  decorridoSeg,
  restanteSeg,
}: {
  decorridoSeg: number;
  restanteSeg: number | null;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-display text-[26px] tabular leading-none text-ink-2">
        {formatarRelogio(decorridoSeg)}
      </span>
      {restanteSeg !== null && (
        <span
          className={cn(
            "text-caption font-bold uppercase tracking-[0.1em] tabular leading-none",
            restanteSeg <= 60 ? "text-red" : "text-ink-3",
          )}
        >
          {restanteSeg === 0 ? "Tempo esgotado" : `Faltam ${formatarRelogio(restanteSeg)}`}
        </span>
      )}
    </div>
  );
}
