// cache minimo do shell do app para abrir mesmo sem internet depois do primeiro carregamento.
// protocolo real de missao critica precisaria de fila de sincronizacao mais robusta (Background Sync API);
// isto aqui cobre o caso mais comum: internet caiu, mas o navegador ja tinha a pagina aberta/carregada antes.
const CACHE_NAME = "maringa-alerta-shell-fd2974e44434";
const SHELL_FILES = ["./", "./index.html", "./evento/app.js?v=de4db9fbd6f8", "./evento/style.css?v=eadc6012dcc6", "./gestao/dados.js?v=baf69cd9b4cf", "./dados-territoriais/importacao-publica.js?v=eb216b997605", "./mapas/inventario.js?v=158a4fb5207b", "./cadastro-ocorrencia.js?v=0958b181df69", "./cadastro-ocorrencia-mapa.js?v=e721a2b459f8", "./cadastro-ocorrencia.css?v=58a73fe1f9cf", "./filtros-cadastros.js?v=3937a61368c0", "./filtros-cadastros.css?v=21520c023736", "./crise/core.js?v=f5d751602d04", "./mapas/ficha-ponto.js?v=638de561535c", "./mapas/ficha-ponto.css?v=e9bca272093f", "./filtros-ocorrencias.js?v=ba9bbce023f3", "./filtros-ocorrencias.css?v=5e8fec626cb9", "./eventos-mapa.js?v=2f7186b52d64", "./evento-referencias.js?v=afd79dd0624b", "./evento-tornado-2026.js?v=350315016c29", "./painel-eventos.js?v=8cf0d1639b15", "./painel-eventos.css?v=11af9417db04", "./operacao-restauracao.js?v=ed97ad817d70", "./operacao-restauracao.css?v=fcfc52569448", "./gestao/acoes-cabecalho.js?v=786c2da159f9", "./gestao/acoes-cabecalho.css?v=c73e577473ca", "./dados-territoriais/camadas-mapas.js?v=986c85ad4ee3", "./fluxo-ajuda.js?v=85cf7b23197a", "./prototipo.css?v=de931620876a", "./sessao.js?v=7c5335721d36", "./sessao-ui.js?v=9a6003d065ad", "./sessao.css?v=5ac3ef7bf8ac", "./mapa-navegacao.js?v=5fdf0926b40c", "./mapa-navegacao.css?v=f3d14405ce2c"];

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
  const areaAutenticada = /\/(gestao|plataforma|mapas|colaboradores|acesso)\//.test(url.pathname) || url.pathname.endsWith("/index.html") || url.pathname === new URL("./", self.location.href).pathname;
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
        if (areaAutenticada) return new Response("Gestão indisponível offline. Conecte-se à internet para acessar o sistema.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
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
