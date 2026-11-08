# E1 — cadastro, senha e empacotamento

**Resultado: E1 implementada e homologada no candidato da fase 2; sem publicação em produção.** Correções no [PR 110](https://github.com/AldenQuesada/maringa-alerta/pull/110), branch `codex/fase2-colaboradores-acesso`. A validação desta etapa não encerra as pendências de escala, autoridade, modularização e operação identificadas na auditoria 360. E2 não foi iniciada.

Escopo autorizado: A03, A04, A05 e A08, mais a coerência da política de senha de A06. Nenhuma ficha, conta ou senha real foi alterada; nenhum e-mail externo foi enviado. Os dados do backup foram usados somente em uma cópia sem rede. A implementação fica no worktree isolado `/tmp/pra-somar-fase2`; a pasta compartilhada mantém suas alterações anteriores.

## Correções e provas

| Achado | Correção | Prova de aceite |
|---|---|---|
| A03 — cadastro incompleto/duplicado pela porta genérica | Triggers recusam criação, alteração e exclusão de pessoas pelo papel da API genérica. Salvamento passa pelo comando administrativo completo. Índice único de e-mail normalizado por município. | Chamadas genéricas recusadas; duplicidade rejeitada pelo comando e pelo índice, inclusive duas criações concorrentes. Uma ficha e um vínculo de acesso no resultado. |
| A04 — campos com formatos inválidos | Contrato de campos no banco, validado antes da gravação: tipos, tamanhos, campos permitidos, telefone, e-mail, CEP e nascimento real. | 16 alterações inválidas recusadas em SQL; reprodução via API de telefone, documento, data, campo desconhecido e e-mail duplicado. Versão e ficha preservadas nas recusas. |
| A05 — sessão normal usada para recuperação | Recuperação em sessão isolada, exigindo retorno nativo válido; Auth configurado para exigir senha atual fora dos fluxos nativos de recuperação. | URL sem prova e fragmento fabricado recusados. API recusa senha atual ausente/incorreta e metadados falsificados; aceita senha atual correta e recuperação legítima. Senha anterior continua válida após tentativas recusadas. |
| A06 — política incoerente, parcela da E1 | Mínimo 12 e proteções nativas no TOML; formulário e ambiente real de teste derivados da mesma configuração. | API recusa senha de 11 caracteres; teste impede divergência do arquivo público gerado. Signup, MFA e demais controles de A06 permanecem para etapas seguintes. |
| A08 — diretório privado incluído no pacote | Manifesto explícito de arquivos públicos; rejeição de caminhos privados, travessia e links simbólicos; validação antes de montar artefato novo. | Canários privados ficam fora mesmo em diretório público. Pacote real contém exatamente 85 arquivos do manifesto e o placeholder de atendimento; assets das páginas e cache conferidos. |

A recuperação não confia em `user_metadata`. A proteção decisiva contra chamadas diretas pertence ao Auth, com `require_current_password = true`; a validação de URL no navegador é complementar. O comportamento foi conferido na [implementação GoTrue v2.197.0](https://github.com/supabase/auth/blob/v2.197.0/internal/api/user.go) e no serviço real isolado. Reautenticação baseada somente na idade da sessão não resolvia o caso reproduzido.

## Preservação e migração

A nova migração é `20261108223323_e1_integridade_cadastro.sql`, criada pelo CLI. As versões anteriores não foram reescritas. Antes de criar o índice, a migração procura e-mails duplicados; se existirem, interrompe com erro e exige reconciliação explícita. Não elimina nem escolhe uma ficha automaticamente.

O contrato novo não reescreve registros legados. O administrador completa a mesma ficha, mantendo o ID e as extensões anteriores. Campos desconhecidos já existentes podem permanecer exatamente iguais; novas extensões ou alterações desses campos são recusadas por esse comando. Relações, versão, permissões, suspensão e auditoria existentes continuam sendo verificadas.

O backup real de 08/11/2026 às 18:48 UTC foi novamente restaurado em destino sem rede: **77 tabelas, 17.545 linhas**, contagens e hashes iguais, sequências conferidas, Vault recuperável e Storage íntegro. No clone, o proprietário do banco foi alinhado ao remoto (`postgres`); as três migrações candidatas foram aplicadas como `postgres` **sem superuser**. Isso reproduz o executor para este ensaio, sem substituir a matriz completa de privilégios prevista em E2.

A comparação antes/depois cobriu **34 tabelas: 33 próprias e `auth.users`**. Cadastros e contas, incluindo hashes de senha, permaneceram idênticos. Somente `ma_configuracao` mudou, exatamente pelo catálogo de relações da fase 2 e pelo contrato de colaboradores E1. [Restauração](e1-cadastros-2026-11-08/backup-validado.json) e [comparação após migrações](e1-cadastros-2026-11-08/preservacao-backup.json).

## Validação executada

| Verificação | Resultado |
|---|---|
| Testes Node, com Node 22.23.2 | 286 passaram; zero ignorados |
| Primeiro acesso e senha com GoTrue/PostgREST reais | 26 cenários em Chromium e WebKit passaram |
| Mapas em celular, Leaflet real | 12 combinações: três mapas, dois navegadores, 320/390 px e toque |
| Banco vazio | 39 migrações, 16 suítes SQL e seis programas Python passaram |
| Concorrência adicional de e-mail | Uma única ficha e um único acesso; segunda criação recusada |
| Transporte WhatsApp | Nove testes passaram |
| Fontes e bundles | 17 bundles conferidos |
| Empacotamento | Seis testes passaram, incluindo artefato real completo e canários privados |
| Verificadores oficiais do banco isolado | Zero erros; um aviso de desempenho preexistente |

Os casos legítimos incluem primeiro acesso, conta existente sem troca de senha, recuperação nativa, resposta perdida após gravar a senha, falha antes da gravação, nova tentativa, envio concorrente e falha ao renovar a sessão. Os testes não usam mock para Auth, PostgreSQL ou Leaflet; somente a entrega SMTP é capturada internamente. Isso não comprova chegada em caixa postal externa.

`config/cameras-mapas.js`, suas expectativas imutáveis e a configuração móvel ficaram byte a byte iguais. O job `mapas-mobile` continua inteiro, sem filtros, exclusões ou tolerâncias afrouxadas. [Resumo e hashes das câmeras](e1-cadastros-2026-11-08/resumo.json).

O único aviso dos advisors é a avaliação repetida de identidade na política de leitura de `ma_configuracao`, já existente. Ele continua registrado para a etapa de desempenho: [orientação oficial](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan). [Saída completa](e1-cadastros-2026-11-08/advisors.json).

Evidências locais estão em `e1-cadastros-2026-11-08/`, com [manifesto SHA-256](e1-cadastros-2026-11-08/SHA256SUMS). A CI do novo commit deve estar verde no PR antes do encerramento desta rodada; a confirmação final de execução fica também na cópia do relatório da pasta compartilhada.

## Estado da produção e próximos limites

As correções desta E1 estão no candidato; **não estão aplicadas ao ambiente publicado**. A produção permanece na fase 1. Editar `supabase/config.toml` não altera o Auth hospedado: mínimo de senha, exigência de senha atual e reautenticação precisam ser conferidos e aplicados na liberação. O [guia de publicação](../backend/SMTP_SUPABASE.md) contém as provas obrigatórias contra a API hospedada. Se a versão hospedada não oferecer proteção equivalente, não liberar a interface vulnerável.

E6 ainda depende de domínio/remetente, SMTP no Supabase, publicação coordenada de migrações/função/interface e homologação com destinatário autorizado. Não houve alteração da configuração remota, migrações remotas, dados reais ou proteção da branch nesta E1.

Não há declaração de que o sistema inteiro já esteja pronto para escala. E2 a E5 continuam necessárias para autoridade efetiva, gates de release, paginação, separação de módulos, observabilidade e comportamento sob carga/falhas. A conclusão desta etapa significa que as falhas E1 reproduzidas foram corrigidas e seus casos negativos e legítimos passaram na homologação.
