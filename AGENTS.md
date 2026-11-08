# Preferências de interface do projeto

- Não usar setas decorativas em menus, botões, popups ou fluxos.
- Para abrir o cadastro de algo novo, usar um botão com o sinal + em amarelo, com rótulo acessível. Gravar no cadastro existente.
- Em interfaces escuras, barras de rolagem também devem ter trilho e indicador escuros, em computador e celular.
- Preferir formulários amplos ou divididos em etapas para reduzir rolagem. Preservar acessibilidade e telas pequenas.
- Os três mapas usam o fundo escuro canônico do Pra Somar, definido em `mapa-navegacao.css`. Não exibir nomes do banco ou da infraestrutura nos textos da interface.
- Os controles +, − e retorno também são escuros, inclusive nos estados desabilitado, foco e hover. A abertura deve mostrar o fundo escuro e o estado de carregamento imediatamente, antes dos assets externos e da sessão; executar módulos somente após validar acesso e carregar os estilos, preservando sua ordem.

## Câmeras canônicas dos três mapas

- A posição e a escala aprovadas estão exclusivamente em `config/cameras-mapas.js`.
- A abertura de Ajuda, Colaboradores e Evento, o zoom mínimo e o botão “Voltar à posição original” devem usar essa mesma referência.
- Manter o arraste liberado desde o zoom inicial e bloquear o afastamento além dele nos três mapas.
- Não alterar esses valores, substituí-los por `fitBounds`, preferências locais, dados demonstrativos ou outra referência durante correções, refatorações ou mudanças de layout.
- Só alterar a câmera mediante nova solicitação explícita do usuário. Nesse caso, capturar a referência, atualizar os testes de contrato, publicar e conferir abertura e retorno no endereço real.
- Manter a proteção de imutabilidade e os testes em `tests/cameras-mapas-canonicas.test.cjs`. Não afrouxar ou atualizar as expectativas apenas para fazer passar uma mudança não solicitada.

## Verificação móvel obrigatória

- `npm run test:mapas:mobile` testa os três mapas em Chromium e WebKit, nas larguras 320 e 390 px, com toque habilitado.
- Preservar o job `mapas-mobile`, sem filtros de caminhos, `continue-on-error`, exclusão de mapas/navegadores ou testes ignorados. Ele é obrigatório na proteção da main e no workflow reutilizado pelo GitHub Pages.
- Abertura, retorno, arraste no mínimo e o limite durante toda a pinça devem continuar passando nas páginas reais. Não substituir Leaflet por mock nem calcular as expectativas a partir da câmera que está sendo testada.
- Não remover a proteção da branch ou afrouxar testes para liberar uma regressão. Alterações de referência só mediante novo pedido explícito do usuário.
