# Preferências de interface do projeto

- Não usar setas decorativas em menus, botões, popups ou fluxos.
- Para abrir o cadastro de algo novo, usar um botão com o sinal + em amarelo, com rótulo acessível. Gravar no cadastro existente.
- Em interfaces escuras, barras de rolagem também devem ter trilho e indicador escuros, em computador e celular.
- Preferir formulários amplos ou divididos em etapas para reduzir rolagem. Preservar acessibilidade e telas pequenas.

## Câmera canônica do mapa de Ajuda

- A posição e a escala aprovadas estão exclusivamente em `config/cameras-mapas.js`.
- A abertura da Ajuda, o zoom mínimo e o botão “Voltar à posição original” devem usar essa mesma referência.
- Não alterar esses valores, substituí-los por `fitBounds`, preferências locais, dados demonstrativos ou outra referência durante correções, refatorações ou mudanças de layout.
- Só alterar a câmera mediante nova solicitação explícita do usuário. Nesse caso, capturar a referência, atualizar os testes de contrato, publicar e conferir abertura e retorno no endereço real.
- Manter a proteção de imutabilidade e os testes em `tests/camera-ajuda-canonica.test.cjs`. Não afrouxar ou atualizar as expectativas apenas para fazer passar uma mudança não solicitada.
