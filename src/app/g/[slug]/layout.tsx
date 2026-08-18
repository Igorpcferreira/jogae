import type { ReactNode } from "react";
import { requireGrupoPorSlug } from "@/features/groups/access";
import { getUsuarioAtual } from "@/features/auth/queries";
import { temRodadaAoVivo } from "@/features/rounds/queries";
import { BottomNav, Sidebar } from "@/components/shell/navigation";
import { OfflineSync } from "@/components/shell/offline-sync";

export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // O layout não é a defesa (ele não re-renderiza a cada navegação): cada
  // página chama `requireGrupoPorSlug` de novo e toda mutação passa pelo DAL.
  const { group, role } = await requireGrupoPorSlug(slug);

  // A casca só precisa do ponto vermelho: pedir a rodada inteira aqui era
  // carregar presenças, times, partidas e lances pra derivar um booleano.
  const [usuario, hasLive] = await Promise.all([
    getUsuarioAtual(),
    temRodadaAoVivo(group.id),
  ]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        slug={slug}
        groupName={group.name}
        hasLive={hasLive}
        usuario={usuario ? { nome: usuario.name, email: usuario.email } : null}
        role={role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* O respiro do rodapé conta a barra (56px) + a safe area do iPhone. */}
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 lg:max-w-5xl lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav slug={slug} hasLive={hasLive} />
      <OfflineSync />
    </div>
  );
}
