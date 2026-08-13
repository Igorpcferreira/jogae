"use client";

import { useActionState, useState } from "react";
import {
  entrarComEmailAction,
  entrarComGoogleAction,
  type EstadoLogin,
} from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { IconCheck } from "@/components/ui/icons";

const INICIAL: EstadoLogin = { status: "inicial" };

/**
 * Google primeiro, e-mail como alternativa aberta por escolha.
 *
 * A ordem é a do atrito: um toque contra "abre o e-mail, acha a mensagem,
 * volta". Quem não usa Google — ou foi convidado num e-mail corporativo — tem
 * o segundo caminho a um clique de distância, sem se sentir empurrado.
 */
export function LoginForm({
  proximo,
  avisoInicial,
}: {
  proximo?: string;
  avisoInicial?: string;
}) {
  const [estado, enviarEmail, enviando] = useActionState(entrarComEmailAction, INICIAL);
  const [mostrarEmail, setMostrarEmail] = useState(false);

  if (estado.status === "enviado") {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <IconCheck size={20} className="text-green" />
          <h2 className="font-display text-[22px] leading-none text-ink">Link enviado</h2>
        </div>
        <p className="text-body text-ink-2 text-pretty">
          Mandamos pra <strong className="text-ink">{estado.email}</strong>. Abre o e-mail e
          clica — é só isso.
        </p>

        <form action={enviarEmail} className="contents">
          <input type="hidden" name="email" value={estado.email} />
          {proximo && <input type="hidden" name="proximo" value={proximo} />}
          <Button type="submit" variant="ghost" size="sm" disabled={enviando}>
            {enviando ? "Reenviando…" : "Não chegou? Reenviar"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <form action={entrarComGoogleAction}>
        {proximo && <input type="hidden" name="proximo" value={proximo} />}
        <Button type="submit" size="lg" block variant="secondary">
          <MarcaGoogle />
          Entrar com Google
        </Button>
      </form>

      {avisoInicial && !mostrarEmail && (
        <p className="text-body-s text-red">{avisoInicial}</p>
      )}

      {mostrarEmail ? (
        <form action={enviarEmail} className="flex flex-col gap-4">
          {proximo && <input type="hidden" name="proximo" value={proximo} />}

          <Field
            label="Seu e-mail"
            htmlFor="email"
            error={estado.status === "erro" ? estado.mensagem : avisoInicial}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="voce@email.com"
              aria-invalid={estado.status === "erro" || undefined}
            />
          </Field>

          <Button type="submit" size="lg" block disabled={enviando}>
            {enviando ? "Enviando…" : "Receber link de acesso"}
          </Button>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            <span className="text-caption uppercase tracking-[0.1em] text-ink-3">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            block
            onClick={() => setMostrarEmail(true)}
          >
            Entrar com e-mail
          </Button>
        </>
      )}
    </Card>
  );
}

/** Marca do Google — cores oficiais são exigência do provedor, não decoração. */
function MarcaGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
