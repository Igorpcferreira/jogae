import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/features/auth/queries";
import { JogaeMark } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { TeamStripe } from "@/components/football/team-card";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { LoginForm } from "./_components/login-form";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string }>;
}) {
  const { proximo, erro } = await searchParams;

  // Já logado não vê tela de login: vai direto pro destino.
  const usuario = await getUsuarioAtual();
  if (usuario) redirect(proximo?.startsWith("/") ? proximo : "/");

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="texture-grid-lg absolute inset-0 opacity-70" aria-hidden />

      <div className="relative flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <JogaeMark size={40} />
            <span className="font-display text-[34px] leading-none text-ink">Jogaê</span>
          </div>
          <h1 className="font-display text-h1 text-ink text-balance">
            Entra aí que o<br />
            <span className="text-green">fut já vai começar</span>
          </h1>
          <p className="max-w-[42ch] text-body text-ink-2 text-pretty">
            Sem senha. Entra com o Google e pronto.
          </p>
          <TeamStripe className="max-w-32" />
        </div>

        {!supabaseConfigurado ? (
          <Card className="flex flex-col gap-2">
            <h2 className="font-display text-[22px] leading-none text-ink">
              Falta configurar o acesso
            </h2>
            <p className="text-body-s text-ink-2 text-pretty">
              Defina <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code className="text-ink">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no{" "}
              <code className="text-ink">.env</code>. Veja{" "}
              <code className="text-ink">docs/deploy.md</code>.
            </p>
          </Card>
        ) : (
          <LoginForm
            proximo={proximo?.startsWith("/") ? proximo : undefined}
            avisoInicial={
              erro === "link"
                ? "Esse link já era — ele vale pouco tempo e só uma vez. Pede outro."
                : erro === "google"
                  ? "Não consegui falar com o Google agora. Tenta de novo ou usa o e-mail."
                  : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
