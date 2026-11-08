# Câmeras móveis: verificação obrigatória

`mapas-mobile` é o check obrigatório da branch `main`. Também faz parte do workflow reutilizado pelo GitHub Pages: uma falha impede a publicação.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run test:mapas:mobile
```

Requer Node 22+ e um sistema operacional suportado pelo Playwright fixado no package-lock. No macOS 13, apenas para diagnóstico local de Chromium, é possível usar o Chrome instalado em perfil descartável:

```sh
MAPAS_CHROME_LOCAL=1 npx playwright test --config=playwright.mapas.config.cjs --project=chromium-390 --project=chromium-320
```

Esse comando parcial não substitui o CI completo. No CI, o reporter reprova a execução se faltar qualquer um dos 12 casos, inclusive por exclusão de projeto, filtro ou teste ignorado. Não há retries que ocultem falhas intermitentes.

## Contratos verificados

- Ajuda, Colaboradores e Evento, em Chromium e WebKit, nas larguras 320 e 390 pixels, com toque e comportamento de navegador móvel habilitados.
- As páginas reais carregam os bundles, a configuração canônica e o Leaflet 1.9.4 reais. O teste só observa o mapa: não troca as opções de navegação nem chama seus manipuladores privados de toque.
- Abertura, zoom mínimo, arraste com um dedo, pinça para aproximar, afastamento cruzando o mínimo, pinça já no mínimo, cancelamento, botão de retorno, zoom +/−, rotação e recarga.
- A amostragem do evento de zoom reprova qualquer afastamento abaixo do mínimo durante a pinça, mesmo que o mapa volte à escala correta no fim.
- Os valores esperados são literais aprovados; não são lidos da configuração sob teste. Os testes Node verificam igualdade exata. No navegador há tolerância máxima de um pixel para o centro, devido ao arredondamento de projeção do Leaflet; zoom e mínimo não recebem essa tolerância.
- Chromium recebe eventos multitoque pelo protocolo de entrada do navegador. WebKit recebe TouchEvents sintéticos nos listeners reais. São testes de motores de navegador, não certificação de aparelho físico Android/iPhone.

## Isolamento e evidências

O servidor liga somente em `127.0.0.1:8784` e encerra com o executor. Banco e sessão usam uma fixture em memória, sem credenciais, com escrita negada. Qualquer tentativa de acessar serviços externos ou escrever dados reprova o teste. Leaflet é servido da dependência npm fixada; tiles de mapa são neutros para que a rede/CDN não cause falhas aleatórias.

Capturas, relatório HTML/JSON e rastros ficam em `.test-results/mapas` e `.playwright-report/mapas`. O GitHub guarda os artefatos por 14 dias. Testes, fixtures e relatórios são excluídos do conteúdo publicado.

Não alterar as câmeras, os valores esperados, os mapas/navegadores exigidos ou a proteção da branch para contornar uma regressão. Só um novo pedido explícito do usuário autoriza mudar as referências, conforme AGENTS.md.
