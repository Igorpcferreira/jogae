"use client";

/**
 * Fila local de gols (plano §40).
 *
 * O pior bug possível no modo ao vivo é perder gol porque o campo não tem
 * sinal. Então o lance é gravado no IndexedDB **antes** de tentar a rede, e só
 * sai da fila quando o servidor confirma. Cada lance carrega um id gerado aqui:
 * reenviar a fila inteira nunca duplica placar.
 *
 * IndexedDB e não localStorage porque localStorage é síncrono e some em modo
 * privado de alguns navegadores no meio de uma partida.
 */

const BANCO = "jogae-offline";
const LOJA = "gols";
const VERSAO = 1;

export interface GolPendente {
  /** Chave primária; vira `clientEventId` no servidor. */
  id: string;
  matchId: string;
  teamId: string;
  playerId: string | null;
  assistPlayerId: string | null;
  ownGoal: boolean;
  minute: number | null;
  criadoEm: number;
}

export function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, VERSAO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(LOJA)) {
        db.createObjectStore(LOJA, { keyPath: "id" });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

function operar<T>(
  modo: IDBTransactionMode,
  acao: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transacao = db.transaction(LOJA, modo);
        const pedido = acao(transacao.objectStore(LOJA));
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => reject(pedido.error);
        transacao.oncomplete = () => db.close();
      }),
  );
}

export const temIndexedDB = () =>
  typeof window !== "undefined" && "indexedDB" in window;

export async function enfileirarGol(gol: GolPendente): Promise<void> {
  if (!temIndexedDB()) return;
  await operar("readwrite", (loja) => loja.put(gol));
}

export async function listarPendentes(): Promise<GolPendente[]> {
  if (!temIndexedDB()) return [];
  const itens = await operar<GolPendente[]>("readonly", (loja) =>
    loja.getAll() as IDBRequest<GolPendente[]>,
  );
  // Ordem de chegada: o placar precisa ser reconstruído na sequência do jogo.
  return itens.sort((a, b) => a.criadoEm - b.criadoEm);
}

export async function removerPendentes(ids: string[]): Promise<void> {
  if (!temIndexedDB() || ids.length === 0) return;
  const db = await abrir();
  await new Promise<void>((resolve, reject) => {
    const transacao = db.transaction(LOJA, "readwrite");
    const loja = transacao.objectStore(LOJA);
    for (const id of ids) loja.delete(id);
    transacao.oncomplete = () => {
      db.close();
      resolve();
    };
    transacao.onerror = () => reject(transacao.error);
  });
}

/**
 * Empurra a fila pro servidor. Devolve quantos foram aceitos.
 * Erro de rede não limpa nada: o lance continua guardado pra próxima tentativa.
 */
export async function sincronizarFila(): Promise<{
  enviados: number;
  restantes: number;
}> {
  const pendentes = await listarPendentes();
  if (pendentes.length === 0) return { enviados: 0, restantes: 0 };

  const resposta = await fetch("/api/gols", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gols: pendentes }),
  });

  if (!resposta.ok) {
    return { enviados: 0, restantes: pendentes.length };
  }

  const dados: { aceitos?: string[]; rejeitados?: string[] } = await resposta.json();
  // Rejeitado é lance que o servidor recusou de vez (partida encerrada, por
  // exemplo). Manter na fila só faria ele tentar pra sempre.
  const resolvidos = [...(dados.aceitos ?? []), ...(dados.rejeitados ?? [])];
  await removerPendentes(resolvidos);

  const restantes = pendentes.length - resolvidos.length;
  return { enviados: dados.aceitos?.length ?? 0, restantes };
}
