import Link from "next/link";
import { requireGrupoPorSlug } from "@/features/groups/access";
import {
  getPeriodosComRodada,
  getRetrospectiva,
  type PeriodoDaRetrospectiva,
} from "@/features/retrospectiva/queries";
import { buildRetrospectivaMessage } from "@/domain/share/whatsapp";
import { Card, EmptyState, SectionLabel, StatBlock } from "@/components/ui/primitives";
import { BotaoCopiar } from "@/components/ui/copiar";
import { cn } from "@/lib/cn";
import { mesEAno, nomeDoMes } from "@/lib/dates";

/**
 * Retrospectiva mensal e anual (plano §27).
 *
 * O que ela mostra e o que ela **não** mostra são a mesma decisão: só
 * superlativo positivo. Não existe "quem mais faltou" nem "time que mais tomou
 * gol" — a regra do plano ("leve e positiva, evitar mecânicas que gerem
 * conflito") vira, aqui, a lista de seções que existe.
 *
 * As abas são montadas do que o grupo tem: oferecer "abril" pra um grupo que
 * nasceu em junho é convidar pra uma tela vazia.
 */

export const metadata = { title: "Retrospectiva" };

export default async function RetrospectivaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { group } = await requireGrupoPorSlug(slug);

  const periodos = await getPeriodosComRodada(group.id, group.timezone);

  if (periodos.meses.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-h1 leading-none text-ink">Retrospectiva</h1>
        <EmptyState title="A retrospectiva começa depois da primeira rodada encerrada." />
      </div>
    );
  }

  // Sem parâmetro, o mês mais recente que teve fut — nunca "este mês", que pode
  // estar vazio no dia 1º.
  const escolhido = escolherPeriodo(query, periodos);
  const retro = await getRetrospectiva(group.id, escolhido, group.timezone);

  const titulo =
    escolhido.tipo === "ano" ? String(escolhido.ano) : mesEAno(escolhido.mes, escolhido.ano);

  const mensagem = retro
    ? buildRetrospectivaMessage({
        groupName: group.name,
        periodo: titulo,
        rodadas: retro.rodadas,
        partidas: retro.partidas,
        gols: retro.gols,
        jogadores: retro.jogadores,
        artilheiros: retro.artilheiros,
        garcons: retro.garcons,
        presencas: retro.presencas,
        dupla: retro.dupla,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-h1 leading-none text-ink">Retrospectiva</h1>
        <p className="mt-2 text-body-s text-ink-2">{titulo}</p>
      </header>

      <Abas
        opcoes={[
          ...periodos.meses.slice(0, 6).map((periodo) => ({
            label: `${nomeDoMes(periodo.mes).slice(0, 3)}/${String(periodo.ano).slice(2)}`,
            href: `/g/${slug}/retrospectiva?ano=${periodo.ano}&mes=${periodo.mes}`,
            active:
              escolhido.tipo === "mes" &&
              escolhido.ano === periodo.ano &&
              escolhido.mes === periodo.mes,
          })),
          ...periodos.anos.map((periodo) => ({
            label: String(periodo.ano),
            href: `/g/${slug}/retrospectiva?ano=${periodo.ano}`,
            active: escolhido.tipo === "ano" && escolhido.ano === periodo.ano,
          })),
        ]}
      />

      {!retro ? (
        <EmptyState title="Não teve fut nesse período." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="py-4">
              <StatBlock value={retro.rodadas} label="Rodadas" />
            </Card>
            <Card className="py-4">
              <StatBlock value={retro.partidas} label="Jogos" />
            </Card>
            <Card className="py-4">
              <StatBlock value={retro.gols} label="Gols" tone="text-red" />
            </Card>
            <Card className="py-4">
              <StatBlock value={retro.jogadores} label="Jogadores" tone="text-ink-2" />
            </Card>
          </section>

          <p className="text-body-s text-ink-2">
            Deu média de <strong className="text-ink">{retro.golsPorPartida}</strong> gols
            por jogo.
          </p>

          <section className="flex flex-col gap-3">
            <SectionLabel>Os destaques</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <Destaque
                slug={slug}
                rotulo="Artilharia"
                destaque={retro.artilheiros}
                unidade={(v) => (v === 1 ? "gol" : "gols")}
                tom="text-red"
              />
              <Destaque
                slug={slug}
                rotulo="Garçom"
                destaque={retro.garcons}
                unidade={(v) => (v === 1 ? "assistência" : "assistências")}
                tom="text-yellow"
              />
              <Destaque
                slug={slug}
                rotulo="Presença"
                destaque={retro.presencas}
                unidade={(v) => (v === 1 ? "rodada" : "rodadas")}
                tom="text-green"
              />
              <Destaque
                slug={slug}
                rotulo="Craque da rodada"
                destaque={retro.craques}
                unidade={(v) => (v === 1 ? "vez" : "vezes")}
                tom="text-pink"
              />
              <Destaque
                slug={slug}
                rotulo="Escolha da galera"
                destaque={retro.escolhasDaGalera}
                unidade={(v) => (v === 1 ? "vez" : "vezes")}
                tom="text-yellow"
              />
            </div>
          </section>

          {retro.dupla && (
            <section className="flex flex-col gap-3">
              <SectionLabel>A dupla do período</SectionLabel>
              <Card className="flex items-center justify-between gap-4 py-5">
                <div>
                  <div className="font-display text-[22px] leading-tight text-ink">
                    {retro.dupla.nomes[0]} e {retro.dupla.nomes[1]}
                  </div>
                  <p className="mt-1 text-body-s text-ink-2">
                    {retro.dupla.jogosJuntos} jogos do mesmo lado ·{" "}
                    {retro.dupla.vitoriasJuntos}{" "}
                    {retro.dupla.vitoriasJuntos === 1 ? "vitória" : "vitórias"}
                  </p>
                </div>
              </Card>
            </section>
          )}

          {retro.jogoMaisMovimentado && (
            <section className="flex flex-col gap-3">
              <SectionLabel>O jogo que ninguém segurou</SectionLabel>
              <Card className="flex items-center justify-between gap-4 py-5">
                <p className="text-body text-ink-2">
                  Um {retro.jogoMaisMovimentado.golsA} × {retro.jogoMaisMovimentado.golsB} —{" "}
                  {retro.jogoMaisMovimentado.gols} gols numa partida só.
                </p>
                <span className="font-display text-score-m tabular leading-none text-red">
                  {retro.jogoMaisMovimentado.gols}
                </span>
              </Card>
            </section>
          )}

          {retro.estreantes.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Chegaram no período</SectionLabel>
              <Card className="py-4">
                <p className="text-body text-ink-2">{retro.estreantes.join(", ")}</p>
              </Card>
            </section>
          )}

          {mensagem && <BotaoCopiar texto={mensagem} rotulo="Copiar pro grupo" block />}
        </>
      )}

      <Link
        href={`/g/${slug}/mais`}
        className="text-body-s text-ink-2 underline decoration-line-strong underline-offset-4"
      >
        Voltar pra tela Mais
      </Link>
    </div>
  );
}

/**
 * Qual período a tela mostra.
 *
 * O padrão é o mês mais recente **com rodada**, e não o mês corrente: no dia 1º
 * o mês corrente está vazio, e abrir a retrospectiva num "não teve fut" é a
 * pior primeira impressão possível pra uma tela que existe pra celebrar.
 */
function escolherPeriodo(
  query: { ano?: string; mes?: string },
  periodos: Awaited<ReturnType<typeof getPeriodosComRodada>>,
): PeriodoDaRetrospectiva {
  const ano = Number(query.ano);
  const mes = Number(query.mes);

  if (Number.isInteger(ano) && ano > 2000) {
    if (query.mes !== undefined && Number.isInteger(mes) && mes >= 0 && mes <= 11) {
      return { tipo: "mes", ano, mes };
    }
    return { tipo: "ano", ano };
  }

  const recente = periodos.meses[0];
  return { tipo: "mes", ano: recente.ano, mes: recente.mes };
}

function Destaque({
  slug,
  rotulo,
  destaque,
  unidade,
  tom,
}: {
  slug: string;
  rotulo: string;
  destaque: { playerIds: string[]; nomes: string[]; valor: number };
  unidade: (valor: number) => string;
  tom: string;
}) {
  if (destaque.nomes.length === 0) {
    return (
      <Card className="flex flex-col justify-center py-4">
        <div className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
          {rotulo}
        </div>
        <p className="mt-1 text-body-s text-ink-3">Sem destaque no período.</p>
      </Card>
    );
  }

  return (
    <Card className="flex items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <div className={cn("text-caption font-bold uppercase tracking-[0.1em]", tom)}>
          {rotulo}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-body font-medium text-ink">
          {destaque.nomes.map((nome, index) => (
            <Link
              key={destaque.playerIds[index]}
              href={`/g/${slug}/jogador/${destaque.playerIds[index]}`}
              className="underline decoration-line-strong underline-offset-4"
            >
              {nome}
            </Link>
          ))}
        </div>
        <div className="text-body-s text-ink-3">
          {destaque.valor} {unidade(destaque.valor)}
        </div>
      </div>
      <span className={cn("font-display text-score-m tabular leading-none", tom)}>
        {destaque.valor}
      </span>
    </Card>
  );
}

function Abas({
  opcoes,
}: {
  opcoes: Array<{ label: string; href: string; active: boolean }>;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {opcoes.map((opcao) => (
          <Link
            key={opcao.href}
            href={opcao.href}
            className={cn(
              "shrink-0 rounded-pill border px-3.5 py-1.5",
              "text-caption font-bold uppercase tracking-[0.06em] transition-colors duration-[120ms]",
              opcao.active
                ? "border-transparent bg-elevated text-ink"
                : "border-line text-ink-3 hover:text-ink",
            )}
          >
            {opcao.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
