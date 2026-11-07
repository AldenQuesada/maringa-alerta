# Ocorrências do mapa com persistência — validação isolada

Base: `d2d46bf`. Trabalho exclusivo em `/tmp/maringa-integracao-isolada`, branch `codex/integracao-admin-seguranca`. Nenhuma modificação no workspace do outro chat, nenhum push, deploy ou acesso de escrita à produção. Nenhum token pessoal foi incluído nos arquivos.

## Implementação

O formulário do Mapa de Evento agora possui um adaptador conectado próprio. A coleção `incidentes` usa a tabela canônica `ma_cadastros`, sem tabela de cadastro paralela. Tipos continuam em `ocorrenciaTipos`; registros concretos ficam em `incidentes`.

A migração `20261107013933_ocorrencias_mapa_persistentes.sql`, criada pelo CLI, adiciona somente contratos, regras, permissões, validadores e relações. Não insere dados operacionais nem demonstrações. Foi instalada apenas em PostgreSQL temporário local.

- Contrato, limites, transições e capacidades são carregados do banco.
- Gravação para triagem ou confirmação aguarda resposta canônica do servidor antes de criar o marcador.
- Recarga recupera os registros autorizados da coleção; não usa localStorage para ocorrências conectadas.
- Relato adicional pode ser vinculado ao registro existente, sem duplicar a ocorrência.
- Confirmação, resolução e arquivamento seguem transições permitidas no banco. Arquivado não é contado como resolvido.
- A Gestão lista os mesmos registros e abre o editor no mapa; não utiliza o formulário genérico para os vínculos ocultos.
- Organizações são selecionadas entre cadastros existentes, com nomes canônicos definidos pelo banco. Nenhuma convocação, mensagem ou acionamento simulado é enviado.
- Fotos ficam privadas no registro; sua publicação automática não é habilitada.
- O modo conectado só libera a criação quando o contrato existe e a capacidade de gravação foi concedida. A instalação antiga continua fechada para esse recurso.

## Segurança e integridade

Mantidos RLS, RPC de escrita controlada, versões otimistas, serialização por município e histórico privado. A coleção recebe as permissões da coleção de relatos; não amplia por padrão o acesso de leitores a conteúdo privado.

O banco verifica tipo, evento, bairro e organizações da mesma prefeitura; verifica coordenadas contra a geometria do bairro; rejeita criação em evento encerrado; gera protocolo e horários de registro; preserva vínculos imutáveis. Relações impedem excluir cadastros ainda referenciados. Também limita fotos, formatos, quantidade de organizações/relatos, valores numéricos e transições de estado.

O padrão de RLS permanece alinhado à [documentação oficial do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security): autorização no servidor, não somente em controles visuais.

## Verificação

- 254 testes JavaScript aprovados.
- Sete suítes SQL em cluster novo: permissões, segurança do servidor, operações, painel, administração geral, integração e incidentes.
- Testes específicos recusaram vínculo inexistente/de outra prefeitura, ponto fora do bairro, imagem não permitida, quantidade negativa, estado inicial inválido, data infinita, dado demonstrativo, versão antiga e escrita sem permissão.
- Verificados nomes/protocolo/data canônicos, proteção de organizações referenciadas, histórico e ausência de leitura por papel não autorizado.
- Dois testes concorrentes existentes aprovados: conflito de atualização e ciclo entre relações simultâneas.
- 13 cenários de Chrome aprovados, incluindo o ciclo de ocorrência em desktop e celular, recarga, vínculo, resolução, abertura pela Gestão e falha de gravação. Arquivamento teve reteste móvel adicional aprovado.
- O teste encontrou um problema ao selecionar o local entre etapas: o Leaflet redimensionava o mapa com atraso. O ajuste passou no reteste.
- Build, correspondência das fontes, sintaxe e artefato local de publicação verificados. Fixtures e migrações não entram no artefato público.

## Alcance dos testes e ativação

Os testes de navegador usam APIs em memória e bloqueiam Supabase remoto; os testes SQL usam PostgreSQL real e descartável. São verificações complementares, não uma sessão autenticada end-to-end no Supabase de produção. Evidências: `auditorias/ocorrencias-2026-11-06/`.

Esta etapa resolve localmente a pendência registrada na auditoria de navegador anterior. A ativação no ambiente publicado depende de revisão/aplicação da migração e publicação dos arquivos, fora do escopo autorizado até aqui. Não foi feita certificação enterprise, teste de GPS real, envio de mensagens ou publicação de fotos.
