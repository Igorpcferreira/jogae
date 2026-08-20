import { requireGrupoPorSlug } from "@/features/groups/access";
import { atualizarGrupoAction } from "@/features/groups/actions";
import { getResumoDaProximaRodada } from "@/features/groups/queries";
import { formatRoundSchedule } from "@/lib/dates";
import { urlBase } from "@/lib/base-url";
import { lerRegrasDePartida } from "@/domain/live/fim-de-partida";
import { LinkDoGrupo } from "./_components/link-do-grupo";
import { RegrasDaPartida } from "./_components/regras-da-partida";
import { GrupoForm, type ValoresDoGrupo } from "@/components/football/grupo-form";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import type { Modalidade, ModoGoleiro } from "@/domain/groups/setup";

export const metadata = { title: "Configuração" };

export default async function ConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, pode } = await requireGrupoPorSlug(slug);

  if (!pode("grupo:editar")) {
    return (
      <EmptyState
        title="Configuração do grupo é coisa de organizador."
        action={
          <ButtonLink href={`/g/${slug}`} variant="secondary">
            Voltar pro início
          </ButtonLink>
        }
      />
    );
  }

  const [base, proxima] = await Promise.all([
    urlBase(),
    getResumoDaProximaRodada(group.id),
  ]);

  const inicial: ValoresDoGrupo = {
    name: group.name,
    sportType: group.sportType as Modalidade,
    teamCount: group.teamCount,
    fieldPlayersPerTeam: group.fieldPlayersPerTeam,
    goalkeepersPerTeam: group.goalkeepersPerTeam,
    goalkeeperMode: group.goalkeeperMode as ModoGoleiro,
    defaultDurationMin: group.defaultDurationMin,
    recurringWeekdays: group.recurringWeekdays,
    defaultStartTime: group.defaultStartTime,
    defaultVenue: group.defaultVenue,
    defaultVenueUrl: group.defaultVenueUrl,
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h1 leading-none text-ink">Configuração</h1>
        <p className="mt-2 text-body-s text-ink-2 text-pretty">
          Mudar o formato vale da próxima rodada em diante — rodada já criada
          guarda o formato que tinha no dia.
        </p>
      </header>

      <LinkDoGrupo
        groupId={group.id}
        groupName={group.name}
        base={base}
        tokenInicial={group.publicToken}
        dateText={proxima ? formatRoundSchedule(proxima.date, proxima.startsAt) : null}
        venue={proxima?.venue ?? group.defaultVenue}
      />

      <RegrasDaPartida groupId={group.id} inicial={lerRegrasDePartida(group.settings)} />

      <GrupoForm
        acao={atualizarGrupoAction.bind(null, group.id)}
        inicial={inicial}
        rotuloEnvio="Salvar alterações"
        rotuloEnviando="Salvando…"
        sucesso="Pronto, salvo."
      />
    </div>
  );
}
