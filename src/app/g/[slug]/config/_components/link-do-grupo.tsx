"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy, IconShare, IconSync } from "@/components/ui/icons";
import { buildLinkDoGrupoMessage } from "@/domain/share/whatsapp";
import { regenerarLinkDeConvidadoAction } from "@/features/groups/actions";

/**
 * O link único que o organizador cola na conversa do grupo.
 *
 * Mora na configuração e não no elenco de propósito: o link pessoal é de uma
 * pessoa e sai da ficha dela; este é do grupo inteiro, e trocar ele é decisão
 * de quem configura o grupo.
 */
export function LinkDoGrupo({
  groupId,
  groupName,
  base,
  tokenInicial,
  dateText,
  venue,
}: {
  groupId: string;
  groupName: string;
  base: string;
  tokenInicial: string;
  dateText: string | null;
  venue: string | null;
}) {
  const [token, setToken] = useState(tokenInicial);
  const [copiado, setCopiado] = useState<"link" | "mensagem" | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [trocando, iniciarTroca] = useTransition();

  const url = `${base}/e/${token}`;
  const mensagem = buildLinkDoGrupoMessage({ groupName, url, dateText, venue });

  async function copiar(texto: string, qual: "link" | "mensagem") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
    } catch {
      setCopiado(null);
    }
  }

  function trocar() {
    iniciarTroca(async () => {
      const novo = await regenerarLinkDeConvidadoAction(groupId);
      setToken(novo);
      setConfirmando(false);
      setCopiado(null);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:p-6">
      <div>
        <h2 className="font-display text-h2 leading-none text-ink">Link do grupo</h2>
        <p className="mt-2 text-body-s text-ink-2 text-pretty">
          Um link só, pra colar na conversa do grupo. Cada um abre, toca no
          próprio nome e responde se vai ou não — sem conta, sem instalar nada.
          Da segunda vez o link já cai direto na página da pessoa.
        </p>
      </div>

      <code className="overflow-x-auto rounded-sm bg-canvas px-2.5 py-2 text-body-s text-ink-3">
        {url}
      </code>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          disabled={trocando}
          onClick={() => copiar(url, "link")}
        >
          {copiado === "link" ? <IconCheck size={15} /> : <IconCopy size={15} />}
          {copiado === "link" ? "Copiado" : "Copiar link"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          disabled={trocando}
          onClick={() => copiar(mensagem, "mensagem")}
        >
          {copiado === "mensagem" ? <IconCheck size={15} /> : <IconShare size={15} />}
          {copiado === "mensagem" ? "Copiado" : "Copiar recado"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-body-s text-ink-3 text-pretty">
          Quem tem esse link vê os nomes do elenco e pode responder no lugar de
          qualquer um. Se ele sair do grupo, gera outro: o antigo para de valer
          na hora. Quem já entrou continua com a página dele.
        </p>

        {confirmando ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              block
              disabled={trocando}
              onClick={trocar}
            >
              {trocando ? "Gerando…" : "Confirmar troca"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              block
              disabled={trocando}
              onClick={() => setConfirmando(false)}
            >
              Deixa quieto
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmando(true)}
            className="self-start"
          >
            <IconSync size={15} />
            Gerar link novo
          </Button>
        )}

        {confirmando && (
          <p role="status" className="text-body-s text-red">
            O link que está no grupo vai parar de funcionar. Vai ter que colar o
            novo lá.
          </p>
        )}
      </div>
    </section>
  );
}
