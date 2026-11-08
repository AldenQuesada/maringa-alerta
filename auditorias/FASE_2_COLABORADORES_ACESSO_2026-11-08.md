# Fase 2 — cadastro administrativo, permissões e primeiro acesso

Estado: implementação e homologação local/CI concluídas; publicação pendente. **Não publicada; fase 2 ainda não concluída em produção.** A conexão PostgreSQL está disponível, mas falta uma credencial autorizada para publicar o serviço de acesso e configurar o provedor de e-mail. Nenhum e-mail externo, conta de produção ou senha real foi criado ou modificado nesta fase.

## Implementação

- Assistente amplo em quatro etapas: dados e contato/endereço; município, equipe, função, responsável e substituto; períodos semanais; permissões e revisão.
- A pessoa permanece em `ma_cadastros`, coleção `usuarios`, com a identidade original. Não há uma segunda tabela de fichas. Os dados pessoais complementares são opcionais; nome, e-mail, telefone, endereço, bairro, cargo e função são obrigatórios.
- Salvamento transacional e versionado, preservando campos existentes. Escalas não podem se sobrepor; relações devem pertencer ao município e a hierarquia de responsáveis não pode ser circular.
- Acesso separado da função de trabalho. Administrador municipal, operador e leitor; seleção explícita de áreas para os novos colaboradores; suspensão consultada pelo servidor mesmo com sessão já emitida. Contas legadas preservam sua matriz.
- Geração e envio somente depois de confirmar o salvamento. Só o serviço pode preparar tokens, usando a identidade administrativa verificada no Auth. O navegador não escolhe tokens nem recebe o link bruto. O envio usa confirmação do provedor e comando idempotente, com erro recuperável sem duplicar a ficha.
- Primeiro acesso com token no fragmento, retirado da barra de endereço. Conta nova é criada pelo serviço após conferir o token; não depende de `signUp` devolver sessão. Conta existente mantém sua senha. Um e-mail ainda não confirmado é confirmado pela posse do link entregue, sem redefinir a senha.
- A ativação exige conta autenticada com o mesmo e-mail, ficha e município ativos, token vigente e ausência de outro vínculo pessoal conflitante. Repetir com a mesma conta é seguro. Uma falha ao renovar a sessão preserva a ativação e orienta entrada normal com senha.
- O login habitual agora usa e-mail e senha. Recuperação é uma ação separada. As páginas de acesso são excluídas do cache offline autenticado.

Referência do Clinic AI conferida em [auditoria própria](FASE_2_REFERENCIA_CLINIC_AI_2026-11-08.md). Foram adaptados o cadastro por etapas, a separação entre salvar e conceder acesso e a conferência da identidade. O envio automático é uma implementação do Pra Somar; a referência examinada do Clinic oferecia geração e cópia do link.

## Validação

O backup de 08/11/2026 às 18:48 UTC foi restaurado antes da alteração: 77 tabelas com contagens e hashes iguais à origem, sequências verificadas, três segredos recuperados e um objeto Storage íntegro. A comparação posterior confirmou a preservação das 33 tabelas próprias, exceto a atualização prevista do catálogo de relações; veja [preservação no clone](fase2-pra-somar-2026-11-08/preservacao-clone.json). A restauração ficou sem rede, sem cron ativo e sem superuser de aplicação. Evidência: [backup validado](fase2-pra-somar-2026-11-08/backup-validado.json).

As 37 migrações foram reproduzidas em banco vazio; passaram os 15 arquivos SQL da regressão e os seis programas de concorrência/validação, incluindo os 36 casos canônicos de mensagens. Também passaram os 280 testes Node, os nove testes de transporte e os 17 bundles determinísticos. Os verificadores oficiais do banco local apontaram apenas o aviso de desempenho já existente em `ma_configuracao`; nenhum achado novo da fase 2.

Os três mapas passaram nas 12 combinações de Chromium/WebKit, larguras 320/390 e toque, usando Leaflet real. `config/cameras-mapas.js` e suas expectativas não foram alterados. O job obrigatório foi preservado.

O ambiente de primeiro acesso usa GoTrue e PostgREST reais, uma base vazia e o mesmo handler da publicação. A confirmação de e-mail permanece habilitada. As mensagens são capturadas por um transportador local em rede interna; isso **não comprova entrega de e-mail em produção**. Os casos incluem ficha completa antes do envio, conta nova e existente, confirmação de senha, sessão de outra pessoa, link inválido/revogado, repetição, falha de entrega, conta não confirmada, perda de renovação da sessão e login posterior pela interface. A expiração e a suspensão são verificadas também em SQL. A concorrência verifica versão e envio idempotente.

Durante a homologação foi corrigida a abertura de um novo link na mesma aba já em `/acesso/`: a mudança apenas do fragmento agora reinicia a conferência do link. Esse achado não foi apresentado como reprodução da causa histórica do bug do Clinic AI.

## Revisão e integração contínua

[PR 110, em rascunho](https://github.com/AldenQuesada/maringa-alerta/pull/110), branch `codex/fase2-colaboradores-acesso`. O commit de implementação `ab2ad83c2b300816607a21a6884f4dd98e69e006` passou nos cinco jobs: verificar, permissoes-banco, transporte-whatsapp, mapas-mobile e primeiro-acesso. [Execução completa](https://github.com/AldenQuesada/maringa-alerta/actions/runs/42515107795); [resumo verificável](fase2-pra-somar-2026-11-08/ci.json).

A implementação foi desenvolvida sobre a main publicada em uma cópia isolada, `/tmp/pra-somar-fase2`. A pasta compartilhada contém alterações anteriores e uma versão de autenticação diferente da main; não foi substituída ou mesclada automaticamente com código de produção. Plano e evidências são sincronizados na pasta compartilhada; a implementação validada está na branch e no PR.

## Pendências para encerrar a fase

1. Receber o caminho de um arquivo local autorizado com a credencial de publicação do projeto e o serviço de e-mail/remetente verificado. Não colocar segredos no chat ou no repositório.
2. Publicar o serviço, configurar os segredos e os retornos de recuperação; aplicar a migração com backup recente e comparar a preservação do banco remoto.
3. Publicar a interface somente quando o serviço estiver pronto. Testar um envio a destinatário de homologação autorizado e confirmar o primeiro acesso no endereço publicado.
4. Registrar a evidência remota e somente então marcar a fase 2 concluída.
