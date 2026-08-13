import Link from "next/link";
import { requireUsuario } from "@/features/auth/queries";
import { JogaeMark } from "@/components/ui/icons";
import { GrupoForm } from "@/components/football/grupo-form";
import { criarGrupoAction } from "@/features/groups/actions";

export const metadata = { title: "Criar grupo" };
export const dynamic = "force-dynamic";

export default async function NovoGrupoPage() {
  await requireUsuario("/novo");

  return (
    <div className="relative min-h-dvh px-4 py-8 sm:py-14">
      <div className="texture-grid-lg absolute inset-0 opacity-60" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-7">
        <header className="flex flex-col gap-4">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5">
            <JogaeMark size={32} />
            <span className="font-display text-[24px] leading-none text-ink">Jogaê</span>
          </Link>
          <div>
            <h1 className="font-display text-h1 leading-none text-ink text-balance">
              Bora criar seu fut
            </h1>
            <p className="mt-2 max-w-[44ch] text-body text-ink-2 text-pretty">
              Três perguntas e tá pronto. O resto dá pra ajustar depois.
            </p>
          </div>
        </header>

        <GrupoForm
          acao={criarGrupoAction}
          rotuloEnvio="Criar e colar a lista"
          rotuloEnviando="Criando…"
        />
      </div>
    </div>
  );
}
