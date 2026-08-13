import { notFound } from "next/navigation";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { getUsuarioAtual } from "@/features/auth/queries";
import { getConvitesAbertos, getMembrosDoGrupo } from "@/features/members/queries";
import { MembrosView } from "./_components/membros-view";

export const metadata = { title: "Membros" };

export default async function MembrosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { group, pode } = await requireGrupoPorSlug(slug);

  // Quem não gerencia membros nem descobre que a tela existe — mesmo critério
  // do grupo alheio: 404, não 403.
  if (!pode("membros:gerenciar")) notFound();

  const [membros, convites, usuario] = await Promise.all([
    getMembrosDoGrupo(group.id),
    getConvitesAbertos(group.id),
    getUsuarioAtual(),
  ]);

  return (
    <MembrosView
      groupId={group.id}
      grupo={group.name}
      membros={membros}
      convites={convites}
      euId={usuario?.id ?? ""}
    />
  );
}
