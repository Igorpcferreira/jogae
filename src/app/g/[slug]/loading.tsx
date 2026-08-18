import { Skeleton } from "@/components/ui/skeleton";

/**
 * Casca de espera das telas do grupo.
 *
 * Não é enfeite, é o que torna a navegação instantânea. Sem este boundary o
 * clique na barra inferior fica **sem resposta nenhuma** até o servidor
 * terminar de renderizar a página inteira (sessão + banco) — a barra nem
 * marca o item novo. É ele também que dá ao Next uma casca estática pra
 * pré-carregar no `prefetch` do `<Link>`: rota dinâmica sem `loading` não tem
 * o que pré-carregar.
 *
 * O desenho segue o esqueleto comum das cinco abas — título, um bloco grande
 * e uma lista — em vez de imitar cada uma: layout aproximado que aparece na
 * hora vale mais que layout exato que chega depois.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2.5 w-36" />
        </div>
        <Skeleton className="size-9 rounded-pill" />
      </header>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-44 rounded-lg" />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <div className="flex flex-col gap-px overflow-hidden rounded-lg">
          {[0, 1, 2].map((linha) => (
            <div key={linha} className="flex items-center gap-3 bg-surface px-4 py-3.5">
              <Skeleton className="size-7 rounded-pill" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
