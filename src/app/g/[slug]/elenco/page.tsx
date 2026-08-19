import { requireGrupoPorSlug } from "@/features/groups/access";
import { urlBase } from "@/lib/base-url";
import { getJogadoresDoGrupo } from "@/features/groups/queries";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ElencoView, type JogadorDoElenco } from "./_components/elenco-view";

export const metadata = { title: "Elenco" };

export default async function ElencoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, pode } = await requireGrupoPorSlug(slug);

  if (!pode("elenco:editar")) {
    return (
      <EmptyState
        title="Só quem organiza o grupo mexe no elenco."
        action={
          <ButtonLink href={`/g/${slug}`} variant="secondary">
            Voltar pro início
          </ButtonLink>
        }
      />
    );
  }

  const [jogadores, base] = await Promise.all([
    getJogadoresDoGrupo(group.id),
    urlBase(),
  ]);

  const dados: JogadorDoElenco[] = jogadores.map((jogador) => ({
    id: jogador.id,
    displayName: jogador.displayName,
    nickname: jogador.nickname,
    // Nível técnico só chega aqui porque a rota exige `elenco:editar`.
    skillLevel: jogador.skillLevel,
    preferredRole: jogador.preferredRole,
    isGoalkeeper: jogador.isGoalkeeper,
    active: jogador.active,
    notes: jogador.notes,
    aliases: jogador.aliases.map((alias) => alias.alias),
    linkPessoal: `${base}/p/${jogador.selfToken}`,
  }));

  return <ElencoView groupId={group.id} groupName={group.name} jogadores={dados} />;
}
