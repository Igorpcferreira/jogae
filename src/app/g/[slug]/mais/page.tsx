import Link from "next/link";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { getJogadoresDoGrupo, groupCapacity } from "@/features/groups/queries";
import { getRoundHistory } from "@/features/rounds/queries";
import { getMembrosDoGrupo } from "@/features/members/queries";
import { getUsuarioAtual } from "@/features/auth/queries";
import { sairAction } from "@/features/auth/actions";
import { ROLE_LABELS } from "@/domain/access/permissions";
import { Card, Chip, SectionLabel } from "@/components/ui/primitives";
import { PlayerRow } from "@/components/football/player-row";
import {
  IconChevronRight,
  IconLogout,
  IconPlayers,
  IconSettings,
  IconTrophy,
} from "@/components/ui/icons";
import { formatLongDate, nomeDoDiaDaSemana } from "@/lib/dates";

export const metadata = { title: "Mais" };

export default async function MorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, role, pode } = await requireGrupoPorSlug(slug);

  const [players, history, usuario, membros] = await Promise.all([
    getJogadoresDoGrupo(group.id),
    getRoundHistory(group.id, 6),
    getUsuarioAtual(),
    pode("membros:gerenciar")
      ? getMembrosDoGrupo(group.id).then((lista) => lista.length)
      : Promise.resolve(0),
  ]);

  const goalkeepers = players.filter((player) => player.isGoalkeeper);
  const podeEditarElenco = pode("elenco:editar");

  return (
    <div className="flex flex-col gap-7">
      <h1 className="font-display text-h1 leading-none text-ink">Mais</h1>

      <section className="flex flex-col gap-3">
        <SectionLabel
          action={
            pode("grupo:editar") ? (
              <Link
                href={`/g/${slug}/config`}
                className="inline-flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.06em] text-ink-3 transition-colors hover:text-ink"
              >
                <IconSettings size={14} />
                Editar
              </Link>
            ) : undefined
          }
        >
          O grupo
        </SectionLabel>
        <Card className="flex flex-col gap-3">
          <div className="font-display text-[24px] leading-none text-ink">{group.name}</div>
          {group.description && <p className="text-body-s text-ink-2">{group.description}</p>}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-s">
            <Field label="Modalidade" value={sportLabel(group.sportType)} />
            <Field label="Times" value={String(group.teamCount)} />
            <Field
              label="Formato"
              value={`${group.fieldPlayersPerTeam} na linha + ${group.goalkeepersPerTeam} no gol`}
            />
            <Field label="Capacidade" value={`${groupCapacity(group)} jogadores`} />
            <Field label="Goleiro" value={goalkeeperLabel(group.goalkeeperMode)} />
            <Field
              label="Recorrência"
              value={
                group.recurringWeekdays.length > 0
                  ? `${group.recurringWeekdays
                      .map((day) => nomeDoDiaDaSemana(day))
                      .join(", ")} · ${group.defaultStartTime ?? ""}`
                  : "Sem recorrência"
              }
            />
          </dl>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel
          action={
            podeEditarElenco ? (
              <Link
                href={`/g/${slug}/elenco`}
                className="inline-flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.06em] text-ink-3 transition-colors hover:text-ink"
              >
                <IconPlayers size={14} />
                Gerenciar
              </Link>
            ) : (
              <span className="text-caption tabular text-ink-3">
                {players.length} · {goalkeepers.length} goleiros
              </span>
            )
          }
        >
          Jogadores
        </SectionLabel>
        <Card className="p-0">
          <div className="divide-y divide-line/60">
            {players.slice(0, 8).map((player) => (
              <PlayerRow
                key={player.id}
                name={player.displayName}
                isGoalkeeper={player.isGoalkeeper}
                meta={
                  player.nickname
                    ? `${player.nickname}${player.aliases.length > 0 ? ` · ${player.aliases.length} apelidos` : ""}`
                    : player.aliases.length > 0
                      ? `${player.aliases.length} apelidos`
                      : roleLabel(player.preferredRole)
                }
                right={!player.active ? <Chip tone="outline">Inativo</Chip> : undefined}
              />
            ))}
          </div>
          {players.length > 8 && podeEditarElenco && (
            <Link
              href={`/g/${slug}/elenco`}
              className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-body-s text-ink-2 transition-colors hover:bg-elevated/50 hover:text-ink"
            >
              Ver os {players.length} jogadores
              <IconChevronRight size={16} className="text-ink-3" />
            </Link>
          )}
        </Card>
      </section>

      {pode("membros:gerenciar") && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Quem ajuda</SectionLabel>
          <Card className="p-0">
            <Link
              href={`/g/${slug}/membros`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/50"
            >
              <IconPlayers size={18} className="text-ink-3" />
              <div className="min-w-0 flex-1">
                <div className="text-body text-ink">Membros e papéis</div>
                <div className="text-caption text-ink-3">
                  {membros === 1
                    ? "Só você por enquanto — chame alguém pra apitar"
                    : `${membros} pessoas com acesso`}
                </div>
              </div>
              <IconChevronRight size={16} className="text-ink-3" />
            </Link>
          </Card>
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Histórico</SectionLabel>
          <Card className="p-0">
            <ul className="divide-y divide-line/60">
              {history.map((round) => (
                <li key={round.id}>
                  <Link
                    href={`/r/${round.publicToken}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-body text-ink">{formatLongDate(round.date)}</div>
                      <div className="text-caption text-ink-3">
                        {round._count.attendances} jogadores · {round.matches.length} partidas
                      </div>
                      {round.craque && (
                        <div className="mt-1 flex items-center gap-1.5 text-caption text-pink">
                          <IconTrophy size={13} />
                          <span className="truncate">
                            Craque: {round.craque.nome}
                          </span>
                        </div>
                      )}
                    </div>
                    <IconChevronRight size={16} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {usuario && (
        <section className="flex flex-col gap-3">
          <SectionLabel>Sua conta</SectionLabel>
          <Card className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-body font-medium text-ink">{usuario.name}</div>
              <div className="truncate text-body-s text-ink-3">{usuario.email}</div>
              <div className="mt-1.5 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
                {ROLE_LABELS[role]} deste grupo
              </div>
            </div>
            <form action={sairAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-caption font-bold uppercase tracking-[0.1em] text-ink-2 transition-colors hover:border-red/50 hover:text-red"
              >
                <IconLogout size={15} />
                Sair
              </button>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-[0.06em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function sportLabel(sport: string) {
  return (
    { SOCIETY: "Society", FUTSAL: "Futsal", CAMPO: "Campo", CUSTOM: "Personalizada" }[sport] ??
    sport
  );
}

function goalkeeperLabel(mode: string) {
  return (
    {
      FIXED_PER_TEAM: "Fixo por time",
      POOL: "Pool de goleiros",
      ROTATING: "Revezamento",
      BORROWED: "Emprestado de quem descansa",
    }[mode] ?? mode
  );
}

function roleLabel(role: string) {
  return (
    {
      GOALKEEPER: "Goleiro",
      DEFENDER: "Defesa",
      MIDFIELDER: "Meio",
      FORWARD: "Ataque",
      VERSATILE: "Versátil",
    }[role] ?? role
  );
}
