# Fase 2 — referência Clinic AI v2 e fluxo corrigido

Conferência em 08/11/2026, somente leitura do Clinic AI. Nenhum colaborador, senha, convite ou mensagem foi criado. Esta rodada atualizou o plano do Pra Somar; não implementou a fase 2 nem alterou o acesso em produção.

## Diretriz

O administrador faz o cadastro completo dentro do sistema, por **+ Novo colaborador**, e define município, equipe, função e permissões. O link de primeiro acesso é gerado e enviado ao final, depois de confirmar o salvamento. A pessoa recebe acesso ao cadastro já existente; não preenche novamente a ficha e não precisa iniciar pedindo um link por e-mail. Login habitual com e-mail e senha.

## Evidências atuais

Repositório: `AldenQuesada/clinicai-v2`, main `58a2e1283a0087b96f05d1b41961adc56c1b327a`, conferida pela API do GitHub. A cópia local principal estava em uma revisão anterior; a análise usou os arquivos da main atual.

No projeto configurado do Clinic AI, a consulta somente leitura confirmou RLS em `professional_profiles`, `profiles`, `clinic_invitations`, `user_module_permissions`, `automation_admin_catalog_entries` e `private.professional_invitation_receipts_v1`. Não foram lidos registros pessoais. Confirmados os comandos `professional_admin_upsert_v3`, `professional_editor_context_v1`, `professional_invitation_create_v1`, `invitation_access_preview_v1` e `accept_invitation(p_raw_token text)`.

A aceitação confere identidade autenticada, e-mail, validade do token, vínculo com profissional ativo da mesma clínica e conflitos de identidade. Vincula a conta ao profissional existente, aplica as permissões escolhidas e registra o evento de acesso. A repetição para a mesma conta vinculada possui tratamento idempotente.

O catálogo vivo contém as seções Dados, Horários, Acesso, Comissões e metas, Habilidades e Documentos. Para o Pra Somar, os campos e seções devem ser adaptados ao cadastro municipal existente; os campos clínicos e de remuneração não são requisitos automáticos desta fase.

## Código de referência

Todos os caminhos abaixo pertencem ao commit conferido:

- `apps/lara/src/app/(authed)/configuracoes/usuarios/UsersAdminClient.tsx`: “Cadastrar na Equipe” abre o editor de membros.
- `apps/lara/src/app/(authed)/configuracoes/resources/team-panel.tsx`: salva o cadastro, mantém a ficha editável e exige salvar alterações antes de gerar o acesso. Salvar e gerar link são ações separadas.
- `apps/lara/src/app/(authed)/configuracoes/resources/professional-full-editor-dialog.tsx`: ficha ampla com seções oriundas do catálogo.
- `apps/lara/src/app/(authed)/configuracoes/resources/_actions.ts`: gera o endereço `/join?token=...` para o membro salvo.
- `apps/lara/src/app/(authed)/configuracoes/resources/professional-registration-summary.tsx`: apresenta o link e o botão **Copiar link**.
- `apps/lara/src/app/join/invitation-access-service.ts`: separa criação de conta com senha, entrada em conta existente e ativação do vínculo.
- `apps/lara/src/app/join/invitation-repository.ts`: identifica o acesso pelo token e trata sessão de outro e-mail.
- `apps/lara/src/app/login/actions.ts`: login habitual com senha; confere identidade e vínculo ativo antes de entrar.

[Consultar o código do editor](https://github.com/AldenQuesada/clinicai-v2/blob/58a2e1283a0087b96f05d1b41961adc56c1b327a/apps/lara/src/app/%28authed%29/configuracoes/resources/team-panel.tsx).

## Migrações e diferença entre histórico e estado atual

A migração `20260831214805_team_registration_invite_wizard.sql` implantou a jornada inicial. Em seguida, `20260906002906_team_editor_lifecycle_authority.sql` separou a edição do cadastro do estado do acesso. `20260906031333_team_invitation_retire_combined_command.sql` retirou o comando antigo que combinava cadastro e convite. `20260906205944_team_database_governance.sql` consolidou contratos e seções do editor no catálogo.

Assim, reutilizar isoladamente o wizard de agosto reintroduziria uma versão substituída. A referência correta é a jornada atual: cadastro persistido, acesso vinculado e gestão do ciclo desse acesso.

## Envio e senha: limites da comprovação

A tela examinada disponibiliza **Copiar link**; o comando lido gera o token e retorna seu endereço. A tabela de convites consultada não possui triggers de aplicação que efetuem envio. Portanto, não se tratou a geração do link como prova de envio automático. O Pra Somar deve cumprir a instrução do usuário de enviar ao finalizar, com estado verificável e possibilidade de repetir o envio sem recriar o colaborador.

O código de criação de conta chama `signUp` com e-mail e senha e sinaliza `email_confirmation_required` se não recebe sessão. Isso identifica uma condição que precisa ser validada no ambiente de destino; não comprova a causa do bug histórico relatado pelo usuário. Foram lidos testes unitários dos fluxos, mas não foi executado nesta conferência um cadastro real, envio de e-mail ou teste completo de senha.

Na implementação do Pra Somar, verificar conta nova/existente, senha e confirmação, navegador sem sessão, sessão de outra pessoa, token expirado/usado/revogado, repetição, falha no envio e recuperação de sessão. A criação do cadastro não pode depender do sucesso da entrega nem ser perdida por erro de ativação.

## Fluxo aprovado pelo usuário para orientar a implementação

```text
ADMINISTRADOR
      |
+ Novo colaborador
      |
Dados pessoais e contato
      |
Endereço, município, equipe e função
      |
Permissões e revisão
      |
Confirmar salvamento do cadastro
      |
Gerar e enviar acesso vinculado
      |
COLABORADOR abre o link
      |
Define senha / usa sua conta compatível
      |
Entra com as permissões já definidas
```

O botão de abertura usa + amarelo e rótulo acessível. A ficha aproveita o cadastro existente e preserva os dados da fase 1. As câmeras e os mapas permanecem fora desta alteração de fluxo.
