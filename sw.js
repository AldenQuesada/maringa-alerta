// cache minimo do shell do app para abrir mesmo sem internet depois do primeiro carregamento.
// protocolo real de missao critica precisaria de fila de sincronizacao mais robusta (Background Sync API);
// isto aqui cobre o caso mais comum: internet caiu, mas o navegador ja tinha a pagina aberta/carregada antes.
const CACHE_NAME = "maringa-alerta-shell-v55-integracao";
const SHELL_FILES = ["./", "./index.html", "./evento/app.js?v=territorios-reais-2", "./evento/style.css?v=territorios-reais-2", "./gestao/dados.js?v=ficha-ponto-20261106", "./dados-territoriais/importacao-publica.js?v=apoios-1", "./mapas/inventario.js?v=ficha-ponto-20261106", "./cadastro-ocorrencia.js?v=4", "./cadastro-ocorrencia-mapa.js?v=3", "./cadastro-ocorrencia.css?v=3", "./filtros-cadastros.js?v=territorios-reais-2", "./filtros-cadastros.css?v=1", "./crise/core.js?v=1", "./mapas/ficha-ponto.js?v=2", "./mapas/ficha-ponto.css?v=2", "./filtros-ocorrencias.js?v=1", "./filtros-ocorrencias.css?v=1", "./eventos-mapa.js?v=1", "./evento-referencias.js?v=2", "./evento-tornado-2026.js?v=1", "./painel-eventos.js?v=2", "./painel-eventos.css?v=5", "./operacao-restauracao.js?v=1", "./operacao-restauracao.css?v=1", "./gestao/acoes-cabecalho.js?v=mapas-filtros-2", "./gestao/acoes-cabecalho.css?v=acoes-2", "./dados-territoriais/camadas-mapas.js?v=territorio-2", "./fluxo-ajuda.js?v=sessoes-1", "./prototipo.css?v=evento-10", "./sessao.js?v=sessoes-1", "./sessao-ui.js?v=sessoes-2", "./sessao.css?v=sessoes-2", "./mapa-navegacao.js?v=zoom-arraste-1", "./mapa-navegacao.css?v=recuperacao-mapas-1"];

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
  const simulador = url.pathname.includes("/atendimento/");
  const areaAutenticada = /\/(gestao|plataforma|mapas)\//.test(url.pathname) || url.pathname.endsWith("/index.html") || url.pathname === new URL("./", self.location.href).pathname;
  event.respondWith(
    fetch(event.request, simulador ? { cache: "no-store" } : areaAutenticada ? { cache: "no-store" } : undefined)
      .then((res) => {
        if (res.ok && !areaAutenticada && !url.searchParams.has("code")) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return res;
      })
      .catch(async () => {
        if (areaAutenticada) return new Response("Gestão indisponível offline. Conecte-se à internet para acessar o Supabase.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          // Nunca substituir o chat de atendimento pela página do Mapa de Evento.
          if (simulador) return new Response("Simulador de atendimento indisponível offline. Conecte-se à internet e tente novamente.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
          const shell = await caches.match("./index.html");
          if (shell) return shell;
        }
        return new Response("Recurso indisponível offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      })
  );
});
