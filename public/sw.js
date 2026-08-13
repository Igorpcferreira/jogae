/* global self, caches, fetch, Response, URL */

/**
 * Service worker do Jogaê (plano §40).
 *
 * Escopo deliberadamente pequeno: cachear o shell pra o app abrir no campo
 * sem sinal. Gol NÃO passa por aqui — quem guarda lance é a fila em
 * IndexedDB (`src/lib/fila-offline.ts`), que só apaga o item quando o
 * servidor confirma. Background Sync não é suportado no iOS, então a
 * sincronização é disparada pelo app quando a conexão volta.
 *
 * Nada de POST e nada de rota autenticada no cache: HTML de `/g/**` tem dado
 * do grupo, e cachear isso vazaria conteúdo entre contas no mesmo aparelho.
 */

const VERSAO = "jogae-v1";
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const CACHE_CASCA = `${VERSAO}-casca`;

const PAGINA_OFFLINE = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_CASCA)
      .then((cache) => cache.addAll([PAGINA_OFFLINE, "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => !chave.startsWith(VERSAO))
            .map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;
  // A API de sincronização nunca vem do cache.
  if (url.pathname.startsWith("/api/")) return;

  // Assets versionados do Next: o nome já carrega o hash, cache-first é seguro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    evento.respondWith(cachePrimeiro(requisicao, CACHE_ESTATICO));
    return;
  }

  if (requisicao.mode === "navigate") {
    evento.respondWith(redePrimeiroComFallback(requisicao));
  }
});

async function cachePrimeiro(requisicao, nomeDoCache) {
  const cache = await caches.open(nomeDoCache);
  const guardado = await cache.match(requisicao);
  if (guardado) return guardado;

  const resposta = await fetch(requisicao);
  if (resposta.ok) cache.put(requisicao, resposta.clone());
  return resposta;
}

/**
 * Navegação sempre tenta a rede: dado de rodada muda o tempo todo e servir
 * placar velho seria pior do que uma tela de "sem conexão".
 */
async function redePrimeiroComFallback(requisicao) {
  try {
    return await fetch(requisicao);
  } catch {
    const cache = await caches.open(CACHE_CASCA);
    return (await cache.match(PAGINA_OFFLINE)) ?? Response.error();
  }
}

/** O app avisa quando quer forçar uma atualização do worker. */
self.addEventListener("message", (evento) => {
  if (evento.data === "pular-espera") self.skipWaiting();
});
