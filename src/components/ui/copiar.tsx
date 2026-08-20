"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck, IconShare } from "@/components/ui/icons";

/**
 * "Copiar recado" — o botão que faz o app conversar com o WhatsApp (plano §17).
 *
 * O WhatsApp continua sendo o centro social do grupo; o Jogaê só entrega o
 * texto pronto. Ele repete em muitas telas da Fase 2 (conquista, card do
 * jogador, retrospectiva), então mora aqui em vez de ser recopiado em cada uma.
 *
 * Falha de clipboard não vira erro na cara de ninguém: em navegador que bloqueia
 * a API o texto continua selecionável na tela, e um alerta vermelho por causa de
 * um "copiar" seria pior que o silêncio.
 */
export function BotaoCopiar({
  texto,
  rotulo = "Copiar recado",
  rotuloCopiado = "Copiado",
  variant = "secondary",
  size = "sm",
  block,
  className,
}: {
  texto: string;
  rotulo?: string;
  rotuloCopiado?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "lg" | "md" | "sm";
  block?: boolean;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      block={block}
      className={className}
      onClick={copiar}
    >
      {copiado ? <IconCheck size={15} /> : <IconShare size={15} />}
      {copiado ? rotuloCopiado : rotulo}
    </Button>
  );
}
