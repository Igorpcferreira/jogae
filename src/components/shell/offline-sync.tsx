"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { listarPendentes, sincronizarFila, temIndexedDB } from "@/lib/fila-offline";
import { IconOffline, IconSync } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Registra o service worker e mantém a fila de gols em dia.
 *
 * O indicador só aparece quando há algo a dizer — sem conexão ou com lance
 * esperando pra subir. Silêncio quando está tudo certo é a informação
 * "pode confiar".
 */
/** Estado da conexão vem do navegador, não do React — daí o store externo. */
function assinarConexao(aoMudar: () => void) {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

export function OfflineSync() {
  const router = useRouter();
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const online = useSyncExternalStore(
    assinarConexao,
    () => navigator.onLine,
    // No servidor não existe conexão pra consultar; assumir online evita
    // um flash de "sem sinal" na hidratação.
    () => true,
  );

  const contar = useCallback(async () => {
    if (!temIndexedDB()) return;
    setPendentes((await listarPendentes()).length);
  }, []);

  const descarregar = useCallback(async () => {
    if (!temIndexedDB() || !navigator.onLine) return;
    setSincronizando(true);
    try {
      const { enviados, restantes } = await sincronizarFila();
      setPendentes(restantes);
      if (enviados > 0) router.refresh();
    } finally {
      setSincronizando(false);
    }
  }, [router]);

  // Sem Background Sync no iOS: a descarga é disparada pelo app quando a
  // conexão volta, quando a aba volta ao primeiro plano ou quando o modo ao
  // vivo enfileira um lance.
  useEffect(() => {
    const sincronizar = () => {
      void contar();
      void descarregar();
    };

    sincronizar();
    window.addEventListener("online", sincronizar);
    window.addEventListener("focus", sincronizar);
    window.addEventListener("jogae:fila-mudou", sincronizar);

    return () => {
      window.removeEventListener("online", sincronizar);
      window.removeEventListener("focus", sincronizar);
      window.removeEventListener("jogae:fila-mudou", sincronizar);
    };
  }, [contar, descarregar]);

  useEffect(() => {
    // Em dev o bundle muda a cada edição; um worker cacheando isso só atrapalha.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falhar em registrar não pode derrubar a tela: o app funciona sem SW.
    });
  }, []);

  if (online && pendentes === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // O bottom nav tem 56px + home indicator: sem contar a safe area, o
        // indicador some atrás da barra no iPhone com notch.
        "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30",
        "mx-auto w-fit max-w-[92vw] lg:bottom-4",
        "flex items-center gap-2 rounded-pill border px-4 py-2 shadow-2",
        "text-caption font-bold uppercase tracking-[0.06em]",
        online
          ? "border-yellow/50 bg-yellow/12 text-yellow"
          : "border-line-strong bg-elevated text-ink-2",
      )}
    >
      {online ? (
        <IconSync size={15} className={cn(sincronizando && "animate-spin")} />
      ) : (
        <IconOffline size={15} />
      )}
      {pendentes > 0
        ? `${pendentes} ${pendentes === 1 ? "lance guardado" : "lances guardados"}${
            online ? " · enviando" : " · sobem quando voltar"
          }`
        : "Sem conexão"}
    </div>
  );
}
