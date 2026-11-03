// cache minimo do shell do app para abrir mesmo sem internet depois do primeiro carregamento.
// protocolo real de missao critica precisaria de fila de sincronizacao mais robusta (Background Sync API);
// isto aqui cobre o caso mais comum: internet caiu, mas o navegador ja tinha a pagina aberta/carregada antes.
const CACHE_NAME = "maringa-alerta-shell-v1";
const SHELL_FILES = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
