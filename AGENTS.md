# Preferências de interface do projeto

- Não usar setas decorativas em menus, botões, popups ou fluxos.
- Para abrir o cadastro de algo novo, usar um botão com o sinal + em amarelo, com rótulo acessível. Gravar no cadastro existente.
- Em interfaces escuras, barras de rolagem também devem ter trilho e indicador escuros, em computador e celular.
- Preferir formulários amplos ou divididos em etapas para reduzir rolagem. Preservar acessibilidade e telas pequenas.

## Câmeras canônicas dos três mapas

- A posição e a escala aprovadas estão exclusivamente em `config/cameras-mapas.js`.
- A abertura de Ajuda, Colaboradores e Evento, o zoom mínimo e o botão “Voltar à posição original” devem usar essa mesma referência.
- Manter o arraste liberado desde o zoom inicial e bloquear o afastamento além dele nos três mapas.
- Não alterar esses valores, substituí-los por `fitBounds`, preferências locais, dados demonstrativos ou outra referência durante correções, refatorações ou mudanças de layout.
- Só alterar a câmera mediante nova solicitação explícita do usuário. Nesse caso, capturar a referência, atualizar os testes de contrato, publicar e conferir abertura e retorno no endereço real.
- Manter a proteção de imutabilidade e os testes em `tests/cameras-mapas-canonicas.test.cjs`. Não afrouxar ou atualizar as expectativas apenas para fazer passar uma mudança não solicitada.
