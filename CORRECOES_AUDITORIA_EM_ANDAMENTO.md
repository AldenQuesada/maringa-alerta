# Correções da auditoria — estado de execução

A separação dos controladores legados identificados e a revisão dos hardcodes municipais e operacionais desta rodada foram concluídas no código local, independentemente do acesso ao Supabase. A publicação continua pendente da homologação autenticada. Este documento acompanha o diagnóstico inicial; não certifica conclusão operacional do sistema.

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

- Concluída a separação dos controladores da Gestão, implantação visual, mapas auxiliares, ocorrências e cabeçalho. No Evento, 28 controladores têm estado privado, contratos explícitos e inicialização idempotente. Nenhuma fonte do manifesto depende de abertura/fechamento de função em outro arquivo.
- Central de Conversas dividida em nove módulos. Roteiro e identificação acompanham a prefeitura ativa. Fixtures e importador histórico separados das regras, restritos por IBGE; abertura normal não gera novos colaboradores fictícios.
- Limites de GPS, anexos, importação e duplicidade centralizados em `config/parametros.js`. Corrigidos bloqueio de gravação simultânea e limpeza da prévia ao trocar de prefeitura.
- Versões de JavaScript/CSS calculadas pelo conteúdo nas cinco páginas e no Service Worker. O build impede fontes incompletas e recursos publicados divergentes.
- A inspeção real corrigiu cabeçalho municipal fixo, sobreposição dos comandos móveis e cálculo de tamanho dos mapas enquanto a página estava oculta pelo acesso. Removidas setas decorativas restantes; preservados cadastro existente, sinal + amarelo e rolagem escura.

## Validação desta rodada

235 testes aprovados com Node.js 22.23.2. Os 16 bundles e suas 125 fontes independentes passaram pela montagem canônica e verificação de versões. A verificação de sintaxe cobriu 216 arquivos JS/CJS/MJS, sem erros. `git diff --check` sem erros. O gerador SQL conferiu os 5.571 municípios do catálogo local; isso não é uma nova verificação do banco remoto.

A suíte inclui isolamento por IBGE, implantação/CNES em Manaus, bloqueio de pacotes de outra cidade, cache por município, gravação assíncrona, preservação após falha, prevenção de gravação repetida, troca de prefeitura e inicialização idempotente dos controladores. Testes de DOM usam o HTML real; neles, Leaflet é um objeto de teste, sem validar a renderização cartográfica.

A inspeção visual foi realizada em Chrome headless com perfil descartável, servidor localhost e Leaflet real, depois da indisponibilidade do controlador de navegador. Foram verificadas seis telas em 1440 × 960 e 390 × 844: painel do Admin Geral, cadastro de prefeitura, Gestão, Evento, Colaboradores e Pra Somar. Não ocorreram exceções JavaScript nas telas percorridas; o transbordamento móvel dos mapas foi corrigido. O cadastro local de Recife pelo catálogo IBGE foi concluído nas duas etapas, mantendo Manaus e sem inserir prefeitura demonstrativa extra. O cabeçalho do Evento foi revalidado depois do ajuste final.

Evidências e resultado estruturado: `evidencias-refatoracao/`. Os ensaios de navegador usaram somente dados fictícios em modo local; não autenticaram nem gravaram no Supabase. Nenhuma publicação foi feita nesta rodada.

## E-mail e acesso

O projeto Supabase Lifesinal (`tynksbinrvqzgsdmvqpq`) foi consultado pela Management API na etapa anterior. Os campos de host, porta, usuário e remetente SMTP estão vazios; o hook de envio de e-mail está desativado e não há Edge Functions. Não há configuração SMTP no Supabase desse projeto que possa ser copiada. Isso não prova que a aplicação externa não tenha outro serviço de envio.

O remetente solicitado é `contato@aldenquesada.org`. Nenhuma senha foi escrita no repositório ou enviada a um servidor SMTP não confirmado. O acesso disponível retornou HTTP 403 para o projeto Maringá (`yyoozisgoginwepzvnvu`); o usuário está resolvendo esse acesso. Essa pendência não bloqueou as extrações locais descritas acima.

## Pendências identificadas

- Concluir a matriz operacional de permissões e integridade de referências no servidor, reconciliar o histórico de migrations e repetir a homologação autenticada no projeto correto.
- Homologar no ambiente conectado a operação de novas prefeituras, incluindo permissões, carga, recuperação, observabilidade e retenção. A inspeção desktop/celular local está registrada acima.
- Identificar o provedor de envio usado pela aplicação Lifesinal ou o provedor institucional; configurar e testar SMTP.
- Publicar somente depois das validações correspondentes. Os testes locais não comprovam funcionamento do banco e do envio de e-mail em produção.
