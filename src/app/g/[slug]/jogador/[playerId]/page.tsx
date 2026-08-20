import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { getCardDoJogador, getDupla } from "@/features/jogadores/queries";
import { buildCardDoJogadorMessage } from "@/domain/share/whatsapp";
import { RECORDES } from "@/domain/statistics/recordes";
import { Card, Chip, SectionLabel, StatBlock } from "@/components/ui/primitives";
import { ConquistaCard } from "@/components/football/conquista-card";
import { RecordeCard } from "@/components/football/recorde-card";
import { BotaoCopiar } from "@/components/ui/copiar";
import { IconChevronRight } from "@/components/ui/icons";
import { formatDayMonth, formatLongDate, mesEAno } from "@/lib/dates";
import { cn } from "@/lib/cn";

/**
 * Card do jogador (plano §27).
 *
 * A tela mais compartilhável do app — e por isso a que mais precisa lembrar do
 * §13: **nível técnico não aparece aqui**. A consulta que a alimenta nem
 * seleciona o campo.
 *
 * Fica atrás de `/g/**`, ou seja, exige ser membro do grupo. O jogador vê o
 * card dele pelo link pessoal (`/p/<token>`), sem conta.
 */

export const metadata = { title: "Jogador" };

const PAPEIS: Record<string, string> = {
  GOALKEEPER: "Goleiro",
  DEFENDER: "Defesa",
  MIDFIELDER: "Meio",
  FORWARD: "Ataque",
  VERSATILE: "Versátil",
};

export default async function CardDoJogadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; playerId: string }>;
  searchParams: Promise<{ dupla?: string }>;
}) {
  const [{ slug, playerId }, query] = await Promise.all([params, searchParams]);
  const { group } = await requireGrupoPorSlug(slug);

  const card = await getCardDoJogador(group.id, playerId, group.timezone);
  // Jogador de outro grupo dá o mesmo 404 de jogador inexistente.
  if (!card) notFound();

  const { jogador, resumo, recordes, melhorMes, parcerias, conquistas } = card;
  const dupla = query.dupla ? await getDupla(group.id, playerId, query.dupla) : null;

  const mensagem = buildCardDoJogadorMessage({
    groupName: group.name,
    nome: jogador.nome,
    rodadas: resumo.rodadas,
    gols: resumo.gols,
    assistencias: resumo.assistencias,
    vitorias: resumo.vitorias,
    aproveitamento: resumo.aproveitamento,
    recorde: recordes[0]
      ? `${RECORDES[recordes[0].tipo].rotulo} — ${RECORDES[recordes[0].tipo].descricao(recordes[0].valor)}`
      : null,
  });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-h1 leading-none text-ink">{jogador.nome}</h1>
          {jogador.isGoalkeeper && <Chip tone="green">Goleiro</Chip>}
          {!jogador.active && <Chip tone="outline">Inativo</Chip>}
        </div>
        <p className="text-body-s text-ink-2">
          {PAPEIS[jogador.preferredRole] ?? "Versátil"}
          {resumo.primeiraRodada && ` · joga aqui desde ${formatLongDate(resumo.primeiraRodada)}`}
        </p>
      </header>

      {resumo.rodadas === 0 ? (
        <Card className="py-6">
          <p className="text-body-s text-ink-2">
            {jogador.nome} ainda não jogou nenhuma rodada encerrada. O card enche
            sozinho depois do primeiro apito final.
          </p>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            <Card className="py-4">
              <StatBlock value={resumo.gols} label="Gols" tone="text-red" />
            </Card>
            <Card className="py-4">
              <StatBlock value={resumo.assistencias} label="Assistências" tone="text-yellow" />
            </Card>
            <Card className="py-4">
              <StatBlock value={resumo.rodadas} label="Rodadas" tone="text-ink" />
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <SectionLabel>A temporada</SectionLabel>
            <Card>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-s sm:grid-cols-4">
                <Campo rotulo="Jogos" valor={String(resumo.partidas)} />
                <Campo
                  rotulo="V / E / D"
                  valor={`${resumo.vitorias}/${resumo.empates}/${resumo.derrotas}`}
                />
                <Campo
                  rotulo="Aproveitamento"
                  valor={`${Math.round(resumo.aproveitamento * 100)}%`}
                />
                <Campo rotulo="Gols por rodada" valor={resumo.golsPorRodada.toFixed(1)} />
                <Campo rotulo="Participações" valor={String(resumo.participacoes)} />
                <Campo rotulo="Craque da rodada" valor={String(resumo.vezesCraque)} />
                <Campo
                  rotulo="Escolha da galera"
                  valor={String(resumo.vezesEscolhaDaGalera)}
                />
                {resumo.ultimaRodada && (
                  <Campo rotulo="Última rodada" valor={formatDayMonth(resumo.ultimaRodada)} />
                )}
              </dl>
            </Card>
          </section>

          {melhorMes && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Melhor mês</SectionLabel>
              <Card className="flex items-center justify-between gap-4 py-5">
                <div>
                  <div className="font-display text-[22px] leading-none text-ink">
                    {mesEAno(melhorMes.mes, melhorMes.ano)}
                  </div>
                  <p className="mt-1.5 text-body-s text-ink-2">
                    {melhorMes.gols} {melhorMes.gols === 1 ? "gol" : "gols"} e{" "}
                    {melhorMes.assistencias}{" "}
                    {melhorMes.assistencias === 1 ? "assistência" : "assistências"} em{" "}
                    {melhorMes.rodadas} {melhorMes.rodadas === 1 ? "rodada" : "rodadas"}
                  </p>
                </div>
                <span className="font-display text-score-m tabular leading-none text-pink">
                  {melhorMes.participacoes}
                </span>
              </Card>
            </section>
          )}

          {conquistas.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Conquistas do mês</SectionLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {conquistas.map((conquista) => (
                  <ConquistaCard
                    key={conquista.tipo}
                    tipo={conquista.tipo}
                    valor={conquista.valor}
                    nome={jogador.nome}
                  />
                ))}
              </div>
            </section>
          )}

          {recordes.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Recordes</SectionLabel>
              <div className="grid gap-2">
                {recordes.map((recorde) => (
                  <RecordeCard
                    key={recorde.tipo}
                    tipo={recorde.tipo}
                    valor={recorde.valor}
                    quando={recorde.data ? formatLongDate(recorde.data) : null}
                  />
                ))}
              </div>
            </section>
          )}

          {parcerias.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Com quem mais joga</SectionLabel>
              <Card className="p-0">
                <ul>
                  {parcerias.map((parceria, index) => (
                    <li key={parceria.parceiroId} className={cn(index > 0 && "border-t border-line/50")}>
                      <Link
                        href={`/g/${slug}/jogador/${playerId}?dupla=${parceria.parceiroId}`}
                        scroll={false}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                          {parceria.nome}
                        </span>
                        <span className="text-caption tabular text-ink-3">
                          {parceria.jogosJuntos} jogos juntos
                        </span>
                        <IconChevronRight size={16} className="shrink-0 text-ink-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <p className="text-caption uppercase tracking-[0.06em] text-ink-3">
                Ordenado por quantas vezes caíram do mesmo lado — não por quem ganha mais.
              </p>
            </section>
          )}

          {dupla && (
            <section className="flex flex-col gap-3">
              <SectionLabel>
                {dupla.a.nome} e {dupla.b.nome}
              </SectionLabel>
              <Card className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <StatBlock
                    value={dupla.estatistica.jogosJuntos}
                    label="Jogos juntos"
                    tone="text-ink"
                  />
                  <StatBlock
                    value={dupla.estatistica.vitoriasJuntos}
                    label="Vitórias"
                    tone="text-green"
                  />
                  <StatBlock
                    value={`${Math.round(dupla.estatistica.aproveitamentoJuntos * 100)}%`}
                    label="Aproveitamento"
                    tone="text-ink-2"
                  />
                </div>

                <p className="text-body-s text-ink-2">
                  {dupla.a.nome} deu {dupla.estatistica.passesDeAparaB}{" "}
                  {dupla.estatistica.passesDeAparaB === 1 ? "assistência" : "assistências"}{" "}
                  pra {dupla.b.nome}, e recebeu {dupla.estatistica.passesDeBparaA}.
                </p>

                {dupla.estatistica.jogosContra > 0 && (
                  <p className="text-body-s text-ink-3">
                    Já se enfrentaram {dupla.estatistica.jogosContra}{" "}
                    {dupla.estatistica.jogosContra === 1 ? "vez" : "vezes"}:{" "}
                    {dupla.estatistica.vitoriasDeA} pra {dupla.a.nome},{" "}
                    {dupla.estatistica.vitoriasDeB} pra {dupla.b.nome} e{" "}
                    {dupla.estatistica.empatesNoConfronto}{" "}
                    {dupla.estatistica.empatesNoConfronto === 1 ? "empate" : "empates"}.
                  </p>
                )}
              </Card>
            </section>
          )}

          <BotaoCopiar texto={mensagem} rotulo="Copiar card pro grupo" block />
        </>
      )}

      <Link
        href={`/g/${slug}/ranking`}
        className="text-body-s text-ink-2 underline decoration-line-strong underline-offset-4"
      >
        Ver o ranking do grupo
      </Link>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-[0.06em] text-ink-3">{rotulo}</dt>
      <dd className="mt-0.5 font-medium text-ink">{valor}</dd>
    </div>
  );
}
