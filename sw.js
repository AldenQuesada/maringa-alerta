// cache minimo do shell do app para abrir mesmo sem internet depois do primeiro carregamento.
// protocolo real de missao critica precisaria de fila de sincronizacao mais robusta (Background Sync API);
// isto aqui cobre o caso mais comum: internet caiu, mas o navegador ja tinha a pagina aberta/carregada antes.
const CACHE_NAME = "maringa-alerta-shell-v3";
const SHELL_FILES = ["./", "./index.html", "./fluxo-ajuda.js", "./prototipo.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("maringa-alerta-shell-") && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// rede primeiro: sempre busca a versao mais nova quando ha internet (essencial enquanto o app
// continua em desenvolvimento ativo); so usa o cache guardado se a rede falhar (offline de verdade).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Mapas e dependências externas seguem a rede/cache normal do navegador.
  // Não armazenar tiles de terceiros neste cache do aplicativo.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return new Response("Recurso indisponível offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      })
  );
});
