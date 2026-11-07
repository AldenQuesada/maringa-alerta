# Correções da auditoria — estado de execução

A refatoração local avançou independentemente do acesso ao Supabase. O pedido completo de eliminar os acoplamentos restantes e publicar depois da validação continua em andamento. Este documento acompanha o diagnóstico inicial; não certifica conclusão do sistema.

## Entregue no código local

- Repositório remoto separado em consultas, diferenças e composição. `ma_cadastros` é consultada somente para o município solicitado; troca de contexto exige nova carga.
- Repositório municipal dividido em oito módulos completos: contexto, esquemas, estado, consultas, escrita, importação, implantação e composição. A implantação exige IBGE correspondente e não reinsere uma prefeitura demonstrativa no estado remoto.
- Núcleo de implantação dividido em cinco módulos. Código IBGE, UF, limites e consultas CNES usam a prefeitura selecionada.
- Formulário da Gestão e importadores de referência extraídos. Catálogo territorial separado da apresentação, com cache por município, repetição após falha e sem fallback para distrito fixo.
- Núcleo de assistência dividido em oito módulos completos. As coleções e os contratos anteriores foram preservados, incluindo a composição transacional remota.
- Atendimento separado em perguntas, anexos, registro e controlador. Corrigido o uso síncrono das gravações remotas: a confirmação agora aguarda a persistência, impede cliques repetidos e preserva as respostas quando ocorre erro.
- Evento: extraídos administração local, auditoria local, fila offline, formatação, regiões demonstrativas e território/recorte. Os serviços locais não leem nem gravam suas demonstrações quando desabilitados no modo conectado.
- Referências específicas de município foram concentradas em configuração por IBGE: identidade visual, camadas públicas, CNES, vista dos mapas e fixtures. Coordenadas, DDD ilustrativo, distrito fixo e condições diretas por nome/ID da cidade foram removidos dos fluxos revisados. Chaves antigas de armazenamento continuam por compatibilidade.
- Mapas e implantação usam centro/limites cadastrados; prefeitura sem polígonos não herda limites demonstrativos. O recorte territorial mantém as ligações entre zona e bairro.
- Removidas as setas decorativas dos botões de mapas. A ação de cadastrar uma referência territorial usa sinal + amarelo e rótulo acessível, no formulário existente.

## Validação desta rodada

225 testes aprovados com Node.js 22.23.2, montagem canônica conferida, sintaxe válida em 66 arquivos completos e `git diff --check` sem erros. O gerador SQL conferiu os 5.571 municípios do catálogo local; isso não é uma nova verificação do banco remoto.

A suíte inclui casos de implantação e CNES em Manaus, bloqueio de pacotes de outra cidade, isolamento de cache, preservação de referências existentes, filas e auditoria locais, gravação assíncrona, falha de persistência e prevenção de confirmação repetida. Testes de DOM executam o formulário da Gestão e o fluxo de solicitação do Atendimento com o HTML real.

A validação visual em navegador continua pendente: o controlador de navegador não respondeu. Os testes de DOM verificam comportamento, mas não substituem inspeção visual de desktop e celular. Nenhuma publicação foi feita nesta rodada.

## E-mail e acesso

O projeto Supabase Lifesinal (`tynksbinrvqzgsdmvqpq`) foi consultado pela Management API na etapa anterior. Os campos de host, porta, usuário e remetente SMTP estão vazios; o hook de envio de e-mail está desativado e não há Edge Functions. Não há configuração SMTP no Supabase desse projeto que possa ser copiada. Isso não prova que a aplicação externa não tenha outro serviço de envio.

O remetente solicitado é `contato@aldenquesada.org`. Nenhuma senha foi escrita no repositório ou enviada a um servidor SMTP não confirmado. O acesso disponível retornou HTTP 403 para o projeto Maringá (`yyoozisgoginwepzvnvu`); o usuário está resolvendo esse acesso. Essa pendência não bloqueou as extrações locais descritas acima.

## Pendências identificadas

- Extrair os controladores ainda compartilhados listados em `ARQUITETURA_MODULAR.md`, especialmente Evento, mapas e renderização da Gestão. A ausência de nomes de cidade nesses controladores não comprova ausência de todos os hardcodes; regras e configurações restantes precisam de revisão por domínio.
- Concluir a matriz operacional de permissões e integridade de referências no servidor, reconciliar o histórico de migrations e repetir a homologação autenticada no projeto correto.
- Validar visualmente desktop/celular, operação de novas prefeituras, carga, recuperação, observabilidade e retenção.
- Identificar o provedor de envio usado pela aplicação Lifesinal ou o provedor institucional; configurar e testar SMTP.
- Publicar somente depois das validações correspondentes. Os testes locais não comprovam funcionamento do banco e do envio de e-mail em produção.
