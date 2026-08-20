"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, Panel, SectionLabel } from "@/components/ui/primitives";
import { IconCheck, IconGoalkeeper } from "@/components/ui/icons";
import { BallLoader } from "@/components/ui/ball-loader";
import type { ListSection, ParseResult } from "@/domain/list-parser/types";
import { aplicarListaAction, interpretarListaAction, type ResolvedEntry } from "@/features/rounds/actions";

type Step = "paste" | "review";

interface Decision {
  playerId: string | null;
  section: ListSection;
  include: boolean;
  /** Nome que o organizador quer gravar (ou o do jogador já cadastrado). */
  name: string;
  rawName: string;
}

const SECTION_LABELS: Record<ListSection, string> = {
  confirmed: "Linha",
  goalkeepers: "Gol",
  waiting: "Espera",
};

const SECTION_ORDER: ListSection[] = ["goalkeepers", "confirmed", "waiting"];

export function ImportListFlow({
  roundId,
  backHref,
  capacity,
}: {
  roundId: string;
  backHref: string;
  capacity: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [error, setError] = useState<string | null>(null);
  const [parsing, startParsing] = useTransition();
  const [saving, startSaving] = useTransition();

  function handleParse() {
    setError(null);
    startParsing(async () => {
      try {
        const parsed = await interpretarListaAction(roundId, rawText);
        if (parsed.entries.length === 0) {
          setError("Não achei nenhum nome nessa lista. Confere o texto colado.");
          return;
        }
        setResult(parsed);
        setDecisions(
          Object.fromEntries(
            parsed.entries.map((entry) => [
              entry.index,
              {
                playerId: entry.matchedPlayerId,
                section: entry.section,
                include: true,
                name: entry.name,
                rawName: entry.name,
              } satisfies Decision,
            ]),
          ),
        );
        setStep("review");
      } catch {
        setError("Deu ruim ao interpretar. Tenta de novo.");
      }
    });
  }

  function update(index: number, patch: Partial<Decision>) {
    setDecisions((current) => ({ ...current, [index]: { ...current[index], ...patch } }));
  }

  const included = useMemo(
    () => Object.values(decisions).filter((decision) => decision.include),
    [decisions],
  );
  const counts = useMemo(
    () => ({
      confirmed: included.filter((d) => d.section !== "waiting").length,
      goalkeepers: included.filter((d) => d.section === "goalkeepers").length,
      waiting: included.filter((d) => d.section === "waiting").length,
      novos: included.filter((d) => d.playerId === null).length,
    }),
    [included],
  );

  function handleConfirm() {
    if (!result) return;
    setError(null);
    startSaving(async () => {
      try {
        const entries: ResolvedEntry[] = result.entries
          .map((entry) => decisions[entry.index])
          .filter((decision) => decision?.include)
          .map((decision) => ({
            name: decision.name,
            section: decision.section,
            playerId: decision.playerId,
            rawName: decision.rawName,
          }));

        const resultado = await aplicarListaAction({ roundId, entries });
        if (!resultado.ok) {
          setError(resultado.motivo);
          return;
        }
        router.push(backHref);
        router.refresh();
      } catch {
        setError("Não consegui salvar a lista. Tenta de novo.");
      }
    });
  }

  /* ── Passo 1: colar ──────────────────────────────────────── */

  if (step === "paste") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-h1 leading-none text-ink">Cole a lista</h1>
          <p className="mt-2 text-body text-ink-2 text-pretty">
            Copia direto do grupo e cola aqui. O Jogaê separa confirmados, goleiros e
            espera.
          </p>
        </div>

        <div className="relative">
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={"Goleiros🧤\n01-\n02-\n\n01-salles\n02-guilherme\n…\n\nLISTA DE ESPERA⏰\n01-Carlão"}
            className={cn(
              "w-full resize-y rounded-sm border border-line bg-surface p-4",
              "font-mono text-body-s leading-relaxed text-ink placeholder:text-ink-3/60",
              "focus:border-line-strong",
            )}
          />
          {rawText.length > 0 && (
            <span className="absolute bottom-3 right-3 text-caption tabular text-ink-3">
              {rawText.split("\n").filter(Boolean).length} linhas
            </span>
          )}
        </div>

        {error && <p className="text-body-s text-red">{error}</p>}

        {parsing ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <BallLoader size={72} label="Interpretando a lista" />
            <p className="text-body-s text-ink-2">Interpretando a lista…</p>
          </div>
        ) : (
          <Button size="lg" block disabled={!rawText.trim()} onClick={handleParse}>
            Interpretar lista
          </Button>
        )}
      </div>
    );
  }

  /* ── Passo 2: revisar ────────────────────────────────────── */

  const parsed = result!;
  const similarWarnings = parsed.warnings.filter(
    (warning) => warning.code === "SIMILAR_TO_KNOWN_PLAYER",
  );
  const duplicateWarnings = parsed.warnings.filter(
    (warning) => warning.code === "DUPLICATE_IN_LIST",
  );
  const ignoredWarnings = parsed.warnings.filter(
    (warning) => warning.code === "LINE_TOO_LONG" || warning.code === "LINE_NOT_A_NAME",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-h1 leading-none text-ink">Confere aí</h1>
        <p className="mt-2 text-body text-ink-2">
          {counts.confirmed} confirmados · {counts.goalkeepers} no gol · {counts.waiting} na
          espera
          {counts.novos > 0 && ` · ${counts.novos} ${counts.novos === 1 ? "novo" : "novos"}`}
        </p>
      </div>

      {counts.confirmed > capacity && (
        <Card className="border-yellow/40 bg-yellow/8 py-3">
          <p className="text-body-s text-yellow">
            {counts.confirmed} confirmados para {capacity} vagas. Manda o excedente pra
            espera se quiser.
          </p>
        </Card>
      )}

      {/* Dúvidas do parser: o organizador decide, o sistema nunca chuta. */}
      {similarWarnings.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Dois nomes parecidos</SectionLabel>
          {similarWarnings.map((warning) => {
            const index = warning.entryIndexes[0];
            const entry = parsed.entries[index];
            const decision = decisions[index];
            if (!decision) return null;
            const option = warning.options?.[0];
            if (!option) return null;

            return (
              <Card key={`${warning.code}-${index}`} className="flex flex-col gap-3 py-4">
                <p className="text-body text-ink">
                  <strong>“{entry.name}”</strong> pode ser{" "}
                  <strong>“{option.displayName}”</strong>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={decision.playerId === option.playerId ? "primary" : "secondary"}
                    onClick={() =>
                      update(index, {
                        playerId: option.playerId,
                        name: option.displayName,
                        rawName: entry.name,
                      })
                    }
                  >
                    <IconCheck size={15} />É a mesma pessoa
                  </Button>
                  <Button
                    size="sm"
                    variant={decision.playerId === null ? "primary" : "secondary"}
                    onClick={() => update(index, { playerId: null, name: entry.name })}
                  >
                    São diferentes
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {duplicateWarnings.length > 0 && (
        <Card className="border-red/40 bg-red/8 py-3">
          <ul className="flex flex-col gap-1">
            {duplicateWarnings.map((warning, i) => (
              <li key={i} className="text-body-s text-red">
                {warning.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {ignoredWarnings.length > 0 && (
        <Card className="border-yellow/40 bg-yellow/8 py-3">
          <ul className="flex flex-col gap-1">
            {ignoredWarnings.map((warning, index) => (
              <li key={index} className="text-body-s text-yellow">
                {warning.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {SECTION_ORDER.map((section) => {
        const entries = parsed.entries.filter(
          (entry) => decisions[entry.index]?.section === section,
        );
        if (entries.length === 0 && section !== "confirmed") return null;

        return (
          <section key={section}>
            <SectionLabel
              action={
                <span className="font-display text-[18px] tabular text-ink-2">
                  {entries.filter((e) => decisions[e.index].include).length}
                </span>
              }
            >
              {section === "goalkeepers"
                ? "Goleiros"
                : section === "waiting"
                  ? "Espera"
                  : "Confirmados"}
            </SectionLabel>

            <Panel className={cn(section === "waiting" && "border-dashed")}>
              <div className="divide-y divide-line/60">
                {entries.map((entry) => {
                  const decision = decisions[entry.index];
                  return (
                    <div
                      key={entry.index}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-4 py-3",
                        !decision.include && "opacity-40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-body font-medium text-ink">
                            {decision.name}
                          </span>
                          {section === "goalkeepers" && (
                            <IconGoalkeeper size={15} className="text-yellow" />
                          )}
                        </div>
                        {decision.playerId === null ? (
                          <span className="text-caption uppercase tracking-[0.06em] text-pink">
                            Novo no grupo
                          </span>
                        ) : decision.name !== entry.name ? (
                          <span className="text-caption text-ink-3">
                            veio como “{entry.name}”
                          </span>
                        ) : null}
                      </div>

                      <SectionSwitcher
                        value={decision.section}
                        onChange={(next) => update(entry.index, { section: next })}
                      />

                      <button
                        type="button"
                        aria-label={decision.include ? "Tirar da lista" : "Voltar pra lista"}
                        onClick={() => update(entry.index, { include: !decision.include })}
                        className="text-caption font-bold uppercase tracking-[0.06em] text-ink-3 transition-colors hover:text-red"
                      >
                        {decision.include ? "Tirar" : "Voltar"}
                      </button>
                    </div>
                  );
                })}

                {entries.length === 0 && (
                  <p className="px-4 py-5 text-body-s text-ink-3">Ninguém aqui ainda.</p>
                )}
              </div>
            </Panel>
          </section>
        );
      })}

      {error && <p className="text-body-s text-red">{error}</p>}

      <div className="sticky bottom-24 flex flex-col gap-2 lg:bottom-6 lg:flex-row">
        <Button
          size="lg"
          block
          disabled={saving || included.length === 0}
          onClick={handleConfirm}
          className="lg:flex-1"
        >
          {saving ? "Salvando…" : "Confirmar lista"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          block
          onClick={() => setStep("paste")}
          className="lg:w-40"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}

function SectionSwitcher({
  value,
  onChange,
}: {
  value: ListSection;
  onChange: (next: ListSection) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Seção do jogador"
      className="flex overflow-hidden rounded-pill border border-line"
    >
      {SECTION_ORDER.map((section) => (
        <button
          key={section}
          type="button"
          aria-pressed={value === section}
          onClick={() => onChange(section)}
          className={cn(
            "px-3 py-1.5 text-caption font-bold uppercase tracking-[0.06em] transition-colors duration-[120ms]",
            value === section
              ? section === "goalkeepers"
                ? "bg-yellow text-canvas"
                : section === "waiting"
                  ? "bg-elevated text-ink"
                  : "bg-green text-canvas"
              : "text-ink-3 hover:text-ink",
          )}
        >
          {SECTION_LABELS[section]}
        </button>
      ))}
    </div>
  );
}
