import Link from "next/link";
import { redirect } from "next/navigation";
import { getGruposDoUsuario, getUsuarioAtual } from "@/features/auth/queries";
import { ROLE_LABELS } from "@/domain/access/permissions";
import { ButtonLink } from "@/components/ui/button";
import { JogaeMark, IconPlus } from "@/components/ui/icons";
import { TeamStripe } from "@/components/football/team-card";
import { Card } from "@/components/ui/primitives";

// Depende de sessão e do banco; nada aqui pode virar HTML estático.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const usuario = await getUsuarioAtual();
  const grupos = usuario ? await getGruposDoUsuario() : [];

  // Quem só tem um grupo não escolhe nada: vai direto pro fut.
  if (grupos.length === 1) redirect(`/g/${grupos[0].slug}`);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="texture-grid-lg absolute inset-0 opacity-70" aria-hidden />

      <div className="relative flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <JogaeMark size={44} />
            <span className="font-display text-[40px] leading-none text-ink">Jogaê</span>
          </div>
          <h1 className="font-display text-display-l text-ink text-balance">
            Seu fut,
            <br />
            <span className="text-green">sem enrolação</span>
          </h1>
          <p className="max-w-[46ch] text-body-l text-ink-2 text-pretty">
            Cole a lista do grupo, monte os times e registre o jogo. O WhatsApp continua
            sendo o WhatsApp.
          </p>
          <TeamStripe className="max-w-40" />
        </div>

        {!usuario ? (
          <div className="flex flex-col gap-3">
            <ButtonLink href="/entrar" size="lg" block>
              Entrar
            </ButtonLink>
            <p className="text-center text-body-s text-ink-3">
              Sem senha — a gente manda um link no seu e-mail.
            </p>
          </div>
        ) : grupos.length === 0 ? (
          <Card className="flex flex-col gap-4">
            <p className="text-body text-ink-2 text-pretty">
              Você ainda não organiza nenhum fut. Bora criar o primeiro?
            </p>
            <ButtonLink href="/novo" size="lg" block>
              <IconPlus size={18} />
              Criar meu grupo
            </ButtonLink>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {grupos.map((grupo) => (
              <Link
                key={grupo.id}
                href={`/g/${grupo.slug}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-[120ms] hover:border-line-strong"
              >
                <div className="min-w-0">
                  <div className="font-display text-[22px] leading-none text-ink">
                    {grupo.name}
                  </div>
                  <div className="mt-1.5 truncate text-body-s text-ink-3">
                    {grupo.defaultVenue ?? ROLE_LABELS[grupo.role]}
                  </div>
                </div>
                <span className="text-caption font-bold uppercase tracking-[0.1em] text-green">
                  Entrar
                </span>
              </Link>
            ))}
            <ButtonLink href="/novo" variant="secondary" size="lg" block className="mt-2">
              <IconPlus size={18} />
              Criar outro grupo
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
