# Terceira integração isolada — 06/11/2026

## Escopo e corte

Integração dos 23 caminhos que haviam mudado após o segundo snapshot, incluindo suas novas dependências, extrações e renomeações. O trabalho de origem evoluiu para 168 arquivos alterados em relação ao snapshot `1c5235b`. O terceiro snapshot estável é `d5812b4`; a integração parte de `0e88034` na branch `codex/integracao-admin-seguranca`, em `/tmp/maringa-integracao-isolada`.

A captura foi verificada por SHA-256 antes de integrar. O manifesto completo acompanha este relatório. Na conferência final, nenhum dos 349 caminhos capturados havia mudado novamente na origem. A pasta do outro chat foi apenas lida. Nenhum push, deploy, alteração remota ou migração na produção foi realizado.

## Conflitos resolvidos

- Reorganização dos controladores de Gestão, mapas, Evento, implantação, ocorrências, conversas e cabeçalho incorporada.
- Tarefas e leituras de alertas mantêm persistência no servidor no modo conectado; os novos módulos aguardam confirmação antes de atualizar a interface.
- Proteções de leitura por rota e exclusão por permissão transferidas aos novos controladores; formulário mantém bloqueio de gravação e aviso acessível.
- Esquemas e parâmetros operacionais recebidos do banco preservados, incluindo limite GPS e respostas canônicas de gravação.
- Link para demonstração não foi reintroduzido no login. O modo conectado mantém a prevenção de preenchimento demonstrativo e as referências territoriais do banco.
- Preferências de interface preservadas nos trechos conciliados: sem setas decorativas; botões operacionais conservam identificação para aplicação de permissões.
- Novo versionamento automático dos recursos incorporado. Referências a JSON excluídos da publicação foram removidas do precache antes de regenerar os hashes.
- Arquivos gerados reconstruídos a partir das fontes conciliadas. SQL e permissões do banco não sofreram alterações neste corte.

## Resultados

- 254 testes JavaScript aprovados, zero falhas. Incluem três novas regressões para confirmação assíncrona no painel e bloqueios de consulta/exclusão nos controladores extraídos.
- Todas as migrações instaladas em um PostgreSQL temporário local; seis suítes SQL aprovadas: permissões, segurança do servidor, operações, painel, administração geral e integração.
- Dois cenários concorrentes aprovados: rejeição de atualização com versão conflitante e rejeição de ciclo entre relações criadas simultaneamente.
- Build e `npm run check` aprovados; módulos gerados e hashes dos recursos correspondem às fontes.
- Publicação preparada somente em `.publicacao`: 69 referências locais de scripts verificadas e 47 arquivos JavaScript com sintaxe válida; precache aprovado.
- Atendimento simulado permanece excluído do artefato de publicação, com página de indisponibilidade.
- `git diff --check` aprovado.

## Limites

Os testes usaram dados artificiais exclusivamente nos ambientes de teste locais. Nenhum dado foi enviado ao Supabase remoto. A verificação não inclui navegador autenticado contra produção nem certificação de segurança enterprise. A cópia integrada está pronta para revisão; não foi publicada.
