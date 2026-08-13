import { requireGrupoPorSlug } from "@/features/groups/access";
import { groupCapacity } from "@/features/groups/queries";
import { getCurrentRound, temRodadaAnterior } from "@/features/rounds/queries";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CreateRoundButton } from "../../_components/create-round-button";
import { ImportListFlow } from "./_components/import-flow";

export const metadata = { title: "Importar lista" };

export default async function ImportListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, pode } = await requireGrupoPorSlug(slug);

  // Assistente apita o jogo, não mexe em presença: mostrar o fluxo aqui só
  // levaria a um erro no fim do caminho.
  if (!pode("rodada:presenca")) {
    return (
      <EmptyState
        title="Quem monta a lista da rodada é o organizador."
        action={
          <ButtonLink href={`/g/${slug}`} variant="secondary">
            Voltar pro início
          </ButtonLink>
        }
      />
    );
  }

  const round = await getCurrentRound(group.id);
  if (!round) {
    return (
      <EmptyState
        title="Precisa de uma rodada aberta pra colar a lista."
        action={<CreateRoundButton
                groupId={group.id}
                podeRepetir={await temRodadaAnterior(group.id)}
              />}
      />
    );
  }

  return (
    <ImportListFlow
      roundId={round.id}
      backHref={`/g/${slug}/rodada`}
      capacity={groupCapacity(group)}
    />
  );
}
