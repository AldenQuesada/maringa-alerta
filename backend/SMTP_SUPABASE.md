# Envio de acesso pelo Supabase Auth

Decisão de 08/11/2026: usar o envio nativo do Supabase Auth, com um serviço SMTP configurado no próprio painel. O usuário ainda vai adquirir o domínio. A escolha do provedor, a verificação DNS e a configuração remota ficam para essa etapa; não foram presumidas nem executadas.

## Preparar domínio e remetente

1. Escolher um serviço de e-mail que forneça credenciais SMTP. O código não exige Resend nem sua API.
2. Validar um domínio/subdomínio no serviço escolhido, adicionando os registros DNS exatos fornecidos por ele. Não substituir registros de e-mail existentes sem conferência.
3. Definir o nome **Pra Somar** e o endereço remetente, por exemplo `acesso@DOMINIO_ESCOLHIDO`. O exemplo não é um domínio adquirido.
4. Guardar host, porta, usuário e senha SMTP em arquivo local privado ou inseri-los diretamente no painel. Não enviar senha no chat nem incluí-la no repositório.

O remetente padrão do Supabase é restrito aos integrantes da equipe técnica do projeto e atualmente a dois envios por hora. Não adicionar colaboradores à organização técnica para contornar essa restrição. [Documentação oficial](https://supabase.com/docs/guides/auth/auth-smtp).

## Configuração no projeto correto

Projeto: `maringa-prasomar`, referência `yyoozisgoginwepzvnvu`. As conexões MCP atuais não incluem esse projeto; o painel consultado solicitou login. Não configurar o projeto Clinic AI ou outro projeto acessível como substituto.

No [painel de e-mails do projeto](https://supabase.com/dashboard/project/yyoozisgoginwepzvnvu/auth/templates), abrir **SMTP Settings**, habilitar o SMTP personalizado e preencher:

| Campo | Valor |
| --- | --- |
| Sender email | Remetente validado no domínio adquirido |
| Sender name | Pra Somar |
| Host | Host informado pelo serviço escolhido |
| Port | Porta TLS indicada pelo serviço |
| Username | Usuário SMTP fornecido pelo serviço |
| Password | Credencial SMTP privada |

Manter confirmação de e-mail habilitada. O prazo padrão de confirmação do Auth é uma hora; não confundir com o prazo de 48 horas do vínculo administrativo. O primeiro acesso exige ambos válidos quando ainda é necessária a confirmação nativa.

Na seção **Email Templates**, usar `supabase/templates/acesso-invite.html` em **Invite user** e `supabase/templates/acesso-magic-link.html` em **Magic link**, com assunto **Seu acesso ao Pra Somar**. Esses modelos atendem exclusivamente ao cadastro administrativo. O administrador continua preenchendo a ficha completa antes de qualquer chamada de envio. Não alterar o template de recuperação para o template de cadastro.

Em [URL Configuration](https://supabase.com/dashboard/project/yyoozisgoginwepzvnvu/auth/url-configuration), conferir a Site URL `https://aldenquesada.github.io/maringa-alerta/` e incluir somente os retornos necessários, preservando os retornos existentes até a análise de uso:

```text
https://aldenquesada.github.io/maringa-alerta/acesso/#token=*
https://aldenquesada.github.io/maringa-alerta/acesso/?recuperar=1
```

A aquisição de um domínio remetente não muda automaticamente o endereço do site. Se o site também mudar, atualizar Site URL, retornos e `PRA_SOMAR_APP_URL` em conjunto antes de homologar. As URLs e os modelos são testados com GoTrue real em rede isolada, mas a configuração hospedada ainda exige conferência.

## Publicação e aceite

O serviço usa somente as credenciais de runtime do Supabase, `PRA_SOMAR_ACCESS_SECRET` e `PRA_SOMAR_APP_URL`. As credenciais SMTP ficam no Auth; a aplicação não chama API externa de envio nem recebe credenciais SMTP no navegador.

Com backup remoto recente e validado, aplicar as migrações, publicar a função e preparar templates/retornos antes de publicar a interface. A mudança de templates deve ocorrer no mesmo período de publicação, porque o novo link precisa da nova página de acesso. Não considerar uma configuração salva como comprovação de entrega.

Homologar um destinatário autorizado: cadastro completo, chegada real do e-mail, abertura em navegador sem sessão, definição e confirmação de senha, entrada posterior com senha, conta existente sem alteração de senha e recuperação. Registrar mensagens recusadas/limitadas pelo serviço sem perder a ficha. Só então concluir a fase 2.

Referências: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [redirecionamentos](https://supabase.com/docs/guides/auth/redirect-urls).
