"use client";

import { useActionState, useState } from "react";
import type { EstadoFormulario } from "@/features/groups/actions";
import {
  capacidadeDoFormato,
  DICA_MODO_GOLEIRO,
  PADRAO_POR_MODALIDADE,
  ROTULO_MODALIDADE,
  ROTULO_MODO_GOLEIRO,
  type Modalidade,
  type ModoGoleiro,
} from "@/domain/groups/setup";
import { Button } from "@/components/ui/button";
import { ChipRadioGroup, Field, Input, Stepper } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { IconCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const INICIAL: EstadoFormulario = { status: "inicial" };

/** Valores que a tela de config já tem e o onboarding não. */
export interface ValoresDoGrupo {
  name: string;
  sportType: Modalidade;
  teamCount: number;
  fieldPlayersPerTeam: number;
  goalkeepersPerTeam: number;
  goalkeeperMode: ModoGoleiro;
  defaultDurationMin: number;
  recurringWeekdays: number[];
  defaultStartTime: string | null;
  defaultVenue: string | null;
  defaultVenueUrl: string | null;
}

const MODALIDADES: Modalidade[] = ["SOCIETY", "FUTSAL", "CAMPO", "CUSTOM"];
const MODOS_GOLEIRO: ModoGoleiro[] = ["FIXED_PER_TEAM", "POOL", "ROTATING", "BORROWED"];

const DIAS = [
  { valor: 0, curto: "Dom" },
  { valor: 1, curto: "Seg" },
  { valor: 2, curto: "Ter" },
  { valor: 3, curto: "Qua" },
  { valor: 4, curto: "Qui" },
  { valor: 5, curto: "Sex" },
  { valor: 6, curto: "Sáb" },
];

/**
 * Um formulário só para criar e para editar o grupo: as perguntas são as
 * mesmas, muda o verbo do botão e de onde vêm os valores iniciais.
 */
export function GrupoForm({
  acao,
  inicial,
  rotuloEnvio,
  rotuloEnviando,
  sucesso,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  inicial?: ValoresDoGrupo;
  rotuloEnvio: string;
  rotuloEnviando: string;
  sucesso?: string;
}) {
  const [estado, enviar, enviando] = useActionState(acao, INICIAL);

  const [modalidade, setModalidade] = useState<Modalidade>(inicial?.sportType ?? "SOCIETY");
  const [formato, setFormato] = useState(
    inicial
      ? {
          teamCount: inicial.teamCount,
          fieldPlayersPerTeam: inicial.fieldPlayersPerTeam,
          goalkeepersPerTeam: inicial.goalkeepersPerTeam,
          goalkeeperMode: inicial.goalkeeperMode,
          defaultDurationMin: inicial.defaultDurationMin,
        }
      : PADRAO_POR_MODALIDADE.SOCIETY,
  );
  const [dias, setDias] = useState<number[]>(inicial?.recurringWeekdays ?? [4]);

  /** Trocar de modalidade recarrega os defaults — é o atalho, não uma trava. */
  function escolherModalidade(nova: Modalidade) {
    setModalidade(nova);
    setFormato(PADRAO_POR_MODALIDADE[nova]);
  }

  const semGoleiroDedicado = formato.goalkeeperMode === "ROTATING";
  const capacidade = capacidadeDoFormato({
    ...formato,
    goalkeepersPerTeam: semGoleiroDedicado ? 0 : formato.goalkeepersPerTeam,
  });

  const erroDe = (campo: string) =>
    estado.status === "erro" && estado.campo === campo ? estado.mensagem : undefined;

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5">
        <Field label="Como chama o fut?" htmlFor="name" error={erroDe("name")}>
          <Input
            id="name"
            name="name"
            required
            maxLength={60}
            autoFocus={!inicial}
            defaultValue={inicial?.name}
            placeholder="Fut da Quinta"
            aria-invalid={erroDe("name") ? true : undefined}
          />
        </Field>

        <ChipRadioGroup
          name="sportType"
          label="Onde vocês jogam"
          value={modalidade}
          onChange={escolherModalidade}
          options={MODALIDADES.map((valor) => ({
            value: valor,
            label: ROTULO_MODALIDADE[valor],
          }))}
        />
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-h3 font-bold uppercase tracking-[0.14em] text-ink-3">
            O formato
          </h2>
          <span className="text-body-s text-ink-2">
            cabem <strong className="font-display text-[20px] tabular text-green">{capacidade}</strong>
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stepper
            label="Times"
            value={formato.teamCount}
            min={2}
            max={8}
            onChange={(valor) => setFormato({ ...formato, teamCount: valor })}
          />
          <Stepper
            label="Na linha, por time"
            value={formato.fieldPlayersPerTeam}
            min={2}
            max={11}
            onChange={(valor) => setFormato({ ...formato, fieldPlayersPerTeam: valor })}
          />
        </div>

        <ChipRadioGroup
          name="goalkeeperMode"
          label="Como funciona o goleiro"
          columns={1}
          value={formato.goalkeeperMode}
          onChange={(valor) => setFormato({ ...formato, goalkeeperMode: valor })}
          options={MODOS_GOLEIRO.map((valor) => ({
            value: valor,
            label: ROTULO_MODO_GOLEIRO[valor],
            hint: DICA_MODO_GOLEIRO[valor],
          }))}
        />

        {!semGoleiroDedicado && (
          <Stepper
            label="Goleiros por time"
            value={formato.goalkeepersPerTeam}
            min={0}
            max={2}
            onChange={(valor) => setFormato({ ...formato, goalkeepersPerTeam: valor })}
          />
        )}

        <input type="hidden" name="teamCount" value={formato.teamCount} />
        <input
          type="hidden"
          name="fieldPlayersPerTeam"
          value={formato.fieldPlayersPerTeam}
        />
        <input
          type="hidden"
          name="goalkeepersPerTeam"
          value={semGoleiroDedicado ? 0 : formato.goalkeepersPerTeam}
        />
        <input
          type="hidden"
          name="defaultDurationMin"
          value={formato.defaultDurationMin}
        />
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="text-h3 font-bold uppercase tracking-[0.14em] text-ink-3">
          Quando e onde
        </h2>

        <fieldset>
          <legend className="mb-2 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
            Dias da semana
          </legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((dia) => {
              const ativo = dias.includes(dia.valor);
              return (
                <label
                  key={dia.valor}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center rounded-pill border px-4",
                    "text-caption font-bold uppercase tracking-[0.06em] transition-colors duration-[120ms]",
                    ativo
                      ? "border-green/60 bg-green/12 text-green"
                      : "border-line bg-surface text-ink-3 hover:border-line-strong",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
                    "has-[:focus-visible]:outline-yellow has-[:focus-visible]:outline-offset-2",
                  )}
                >
                  <input
                    type="checkbox"
                    name="recurringWeekdays"
                    value={dia.valor}
                    checked={ativo}
                    onChange={() =>
                      setDias((atual) =>
                        atual.includes(dia.valor)
                          ? atual.filter((d) => d !== dia.valor)
                          : [...atual, dia.valor],
                      )
                    }
                    className="sr-only"
                  />
                  {dia.curto}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-body-s text-ink-3">
            {dias.length === 0
              ? "Sem dia fixo? Tudo bem — você marca cada rodada na mão."
              : "A gente já deixa a próxima rodada criada nesse dia."}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Que horas" htmlFor="defaultStartTime" error={erroDe("defaultStartTime")}>
            <Input
              id="defaultStartTime"
              name="defaultStartTime"
              type="time"
              defaultValue={inicial?.defaultStartTime ?? "20:30"}
            />
          </Field>
          <Field label="Duração (min)" htmlFor="defaultDurationMinVisivel">
            <Input
              id="defaultDurationMinVisivel"
              type="number"
              min={20}
              max={240}
              step={5}
              value={formato.defaultDurationMin}
              onChange={(evento) =>
                setFormato({
                  ...formato,
                  defaultDurationMin: Number(evento.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <Field label="Onde" htmlFor="defaultVenue" hint="Nome da quadra, campo ou arena.">
          <Input
            id="defaultVenue"
            name="defaultVenue"
            maxLength={120}
            defaultValue={inicial?.defaultVenue ?? ""}
            placeholder="Arena Farofa · Campo 03"
          />
        </Field>

        <Field
          label="Link do mapa"
          htmlFor="defaultVenueUrl"
          hint="Opcional — cola o link do Google Maps."
          error={erroDe("defaultVenueUrl")}
        >
          <Input
            id="defaultVenueUrl"
            name="defaultVenueUrl"
            type="url"
            inputMode="url"
            defaultValue={inicial?.defaultVenueUrl ?? ""}
            placeholder="https://maps.google.com/?q=…"
          />
        </Field>
      </Card>

      {estado.status === "erro" && !estado.campo && (
        <p className="text-body-s text-red">{estado.mensagem}</p>
      )}

      {estado.status === "salvo" && sucesso && (
        <p className="inline-flex items-center gap-2 text-body-s text-green">
          <IconCheck size={16} />
          {sucesso}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={enviando}>
        {enviando ? rotuloEnviando : rotuloEnvio}
      </Button>
    </form>
  );
}
