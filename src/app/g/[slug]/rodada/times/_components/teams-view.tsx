"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { TEAM_COLOR_ORDER, TEAM_THEMES } from "@/lib/team-colors";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Sheet } from "@/components/ui/dialog";
import { Card, Chip, EmptyState, SectionLabel } from "@/components/ui/primitives";
import { TeamCard } from "@/components/football/team-card";
import { IconCopy, IconDraw, IconShare } from "@/components/ui/icons";
import {
  atualizarTimeAction,
  sortearTimesAction,
  trocarJogadoresAction,
} from "@/features/rounds/actions";
import { DrawOverlay } from "./draw-overlay";

export interface TeamsViewTeam {
  id: string;
  name: string;
  color: string;
  order: number;
  strength: number;
  players: Array<{ id: string; name: string; isGoalkeeper: boolean }>;
}

export function TeamsView({
  roundId,
  slug,
  teams,
  confirmedCount,
  drawMode,
  drawSeed,
  drawnAtLabel,
  manualEdits,
  shareText,
  publicUrl,
  imagemUrl,
  liveHref,
  podeSortear = true,
}: {
  roundId: string;
  slug: string;
  teams: TeamsViewTeam[];
  confirmedCount: number;
  drawMode: string | null;
  drawSeed: string | null;
  drawnAtLabel: string | null;
  manualEdits: number;
  shareText: string;
  publicUrl: string;
  imagemUrl: string;
  liveHref: string;
  /** Assistente vê os times pra apitar, mas não sorteia, não troca, não renomeia. */
  podeSortear?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"RANDOM" | "BALANCED">(
    drawMode === "RANDOM" ? "RANDOM" : "BALANCED",
  );
  const [drawing, setDrawing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editandoTime, setEditandoTime] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const timeEmEdicao = teams.find((team) => team.id === editandoTime);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function handleDraw() {
    const started = Date.now();
    if (!reducedMotion) setDrawing(true);

    startTransition(async () => {
      await sortearTimesAction(roundId, mode);
      // A animação nunca atrasa o dado: só completa o tempo que já passou.
      const elapsed = Date.now() - started;
      if (!reducedMotion && elapsed < 1400) {
        await new Promise((resolve) => setTimeout(resolve, 1400 - elapsed));
      }
      setDrawing(false);
      router.refresh();
    });
  }

  function handlePlayerClick(playerId: string) {
    if (selected === null) {
      setSelected(playerId);
      return;
    }
    if (selected === playerId) {
      setSelected(null);
      return;
    }
    const target = playerId;
    const source = selected;
    setSelected(null);
    startTransition(async () => {
      await trocarJogadoresAction(roundId, source, target);
      router.refresh();
    });
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {drawing && <DrawOverlay onSkip={() => setDrawing(false)} />}

      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-h1 leading-none text-ink">
              {teams.length > 0
                ? "Times prontos"
                : podeSortear
                  ? "Bora montar os times?"
                  : "Times ainda não saíram"}
            </h1>
            <p className="mt-2 text-body text-ink-2">
              {confirmedCount} confirmados
              {teams.length > 0 && ` · ${teams.length} times`}
            </p>
          </div>
        </div>

        {podeSortear && (
          <div className="flex flex-wrap items-center gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
            <Button size="md" onClick={handleDraw} disabled={pending || confirmedCount === 0}>
              <IconDraw size={17} />
              {teams.length > 0 ? "Sortear de novo" : "Montar times"}
            </Button>
          </div>
        )}
      </header>

      {teams.length === 0 ? (
        <EmptyState
          title={
            !podeSortear
              ? "O organizador ainda não sorteou. Assim que sair, aparece aqui."
              : confirmedCount === 0
                ? "Sem confirmados ainda. Cole a lista do grupo primeiro."
                : "Escolhe o modo e manda montar. Dá pra sortear de novo quantas vezes quiser."
          }
          action={
            confirmedCount === 0 && podeSortear ? (
              <ButtonLink href={`/g/${slug}/rodada/importar`} size="lg">
                Importar lista
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Transparência do sorteio (plano §35) */}
          {drawnAtLabel && (
            <Card className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <Chip tone={drawMode === "RANDOM" ? "neutral" : "green"}>
                {drawMode === "RANDOM"
                  ? "Aleatório"
                  : drawMode === "MANUAL"
                    ? "Ajuste manual"
                    : "Equilibrado"}
              </Chip>
              <span className="text-body-s text-ink-2">
                Gerado às {drawnAtLabel}
                {drawSeed && ` · seed ${drawSeed}`}
                {manualEdits > 0 &&
                  ` · ${manualEdits} ${manualEdits === 1 ? "troca manual" : "trocas manuais"}`}
              </span>
            </Card>
          )}

          {podeSortear && (
            <p className="text-body-s text-ink-3">
              {selected
                ? "Toca em outro jogador pra trocar de time."
                : "Toca em dois jogadores pra trocar de time. No nome do time, pra renomear."}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((team, index) => (
              <TeamCard
                key={team.id}
                name={team.name}
                color={team.color}
                order={team.order}
                strength={team.strength}
                players={team.players.map((player) => ({
                  ...player,
                  name:
                    selected === player.id ? `${player.name}  ⇄` : player.name,
                }))}
                onPlayerClick={podeSortear ? handlePlayerClick : undefined}
                onEditar={podeSortear ? () => setEditandoTime(team.id) : undefined}
                className={cn(pending && "opacity-70")}
                style={{ animationDelay: `${index * 40}ms` }}
              />
            ))}
          </div>

          <section className="flex flex-col gap-3">
            <SectionLabel>Manda no grupo</SectionLabel>
            <div className="flex flex-col gap-2">
              <Button size="lg" block onClick={() => copy(shareText, "times")}>
                <IconCopy size={17} />
                {copied === "times" ? "Copiado!" : "Copiar pro WhatsApp"}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                block
                onClick={() => copy(publicUrl, "link")}
              >
                <IconShare size={17} />
                {copied === "link" ? "Link copiado!" : "Copiar link da rodada"}
              </Button>
              <ButtonLink
                href={imagemUrl}
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="lg"
                block
              >
                <IconShare size={17} />
                Abrir imagem dos times
              </ButtonLink>
              <ButtonLink href={liveHref} variant="danger" size="lg" block>
                Começar jogo
              </ButtonLink>
            </div>
          </section>
        </>
      )}

      {timeEmEdicao && (
        <FichaDoTime
          key={timeEmEdicao.id}
          time={timeEmEdicao}
          onFechar={() => setEditandoTime(null)}
        />
      )}
    </div>
  );
}

/** Renomear e trocar a cor. As quatro cores continuam sendo as do sistema. */
function FichaDoTime({
  time,
  onFechar,
}: {
  time: TeamsViewTeam;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, iniciarSalvamento] = useTransition();
  const [nome, setNome] = useState(time.name);
  const [cor, setCor] = useState(time.color);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    iniciarSalvamento(async () => {
      const resultado = await atualizarTimeAction(time.id, { name: nome, color: cor });
      if (!resultado.ok) {
        setErro(resultado.motivo);
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  return (
    <Sheet
      titulo="Editar time"
      onFechar={onFechar}
      rodape={
        <Button size="lg" block onClick={salvar} disabled={salvando || !nome.trim()}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      }
    >
      <Field label="Nome" htmlFor="nome-do-time" error={erro ?? undefined}>
        <Input
          id="nome-do-time"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          data-foco-inicial
          maxLength={24}
          placeholder="Coletes"
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
          Cor
        </legend>
        <div className="flex gap-2">
          {TEAM_COLOR_ORDER.map((chave) => {
            const tema = TEAM_THEMES[chave];
            const ativa = chave === cor;
            return (
              <button
                key={chave}
                type="button"
                aria-pressed={ativa}
                onClick={() => setCor(chave)}
                className={cn(
                  "flex h-12 flex-1 items-center justify-center gap-2 rounded-sm border",
                  "text-caption font-bold uppercase tracking-[0.06em] transition-colors duration-[120ms]",
                  ativa
                    ? `${tema.border} ${tema.tint} ${tema.text}`
                    : "border-line bg-surface text-ink-3 hover:border-line-strong",
                )}
              >
                <span className={cn("size-3 rounded-pill", tema.stripe)} aria-hidden />
                {ativa && tema.label}
              </button>
            );
          })}
        </div>
        <p className="text-body-s text-ink-3">
          A cor identifica o time no placar, no ao vivo e no link público.
        </p>
      </fieldset>
    </Sheet>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "RANDOM" | "BALANCED";
  onChange: (next: "RANDOM" | "BALANCED") => void;
}) {
  const options = [
    { value: "RANDOM" as const, label: "Aleatório" },
    { value: "BALANCED" as const, label: "Equilibrado" },
  ];

  return (
    <div
      role="group"
      aria-label="Modo do sorteio"
      className="flex overflow-hidden rounded-pill border border-line"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-11 px-4 text-caption font-bold uppercase tracking-[0.06em] transition-colors duration-[120ms]",
            mode === option.value ? "bg-elevated text-ink" : "text-ink-3 hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
