# Cadastro e acesso de colaboradores — fase 2

O administrador municipal (ou geral) preenche a ficha em `ma_cadastros`, coleção `usuarios`. A ficha, as permissões e a versão são confirmadas numa transação antes de solicitar qualquer envio. Equipe, responsável, substituto e horários pertencem à mesma ficha. A função de trabalho não concede privilégios de acesso.

`private.ma_colaboradores_acesso` contém somente o vínculo de acesso: identidade da ficha, e-mail autorizado, conta autenticada, papel, coleções permitidas e situação. Não é um segundo cadastro de pessoas. Os vínculos anteriores continuam funcionando. A suspensão é consultada no servidor em cada operação, inclusive com sessão já emitida.

O comando especializado de salvamento usa a mesma tabela canônica, valida município e versão, preserva campos não editados e executa os triggers de contrato, relações e auditoria existentes. A edição genérica de uma ficha gerenciada é recusada para evitar divergência entre ficha e acesso.

O serviço `ma-colaboradores-acesso` só envia depois da confirmação do cadastro. Um comando de envio estável produz o mesmo token e usa a mesma chave de idempotência no provedor. O banco guarda apenas o hash do token. Reenviar com novo comando revoga o link anterior; erro de entrega preserva a ficha e permite tentar novamente.

O link abre uma página própria e não cria sessão automaticamente. O token fica no fragmento, é retirado da barra de endereço e nunca é enviado como Referer. Conta nova: o serviço confere o token e cria a conta com a senha escolhida e o e-mail verificado pela posse do link; em seguida a pessoa entra com senha e ativa o vínculo. Conta existente: exige a senha daquela conta, sem redefini-la. A ativação exige e-mail autenticado confirmado, ficha ativa, município ativo, token válido e ausência de conflito de identidade. Repetir a ativação da mesma conta é idempotente.

Configuração privada necessária para publicar o serviço: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (fornecidos ao runtime), `PRA_SOMAR_ACCESS_SECRET` (32 bytes aleatórios ou mais), `RESEND_API_KEY`, `PRA_SOMAR_EMAIL_FROM` (remetente verificado), `PRA_SOMAR_APP_URL` (URL HTTPS da raiz da aplicação). Nunca colocar essas credenciais em arquivos publicados. O status `enviado` significa aceite do provedor, não leitura ou entrega na caixa de entrada.

O login habitual usa e-mail e senha. Recuperação de senha permanece uma operação separada do cadastro. As rotas de recuperação devem estar autorizadas na configuração de autenticação.

Referência: fluxo atual do Clinic AI v2, commit `58a2e1283a0087b96f05d1b41961adc56c1b327a`. A geração e cópia de link do Clinic foram adaptadas para envio automático com confirmação; seu fluxo de `signUp` sem sessão não foi copiado.

As contas legadas mantêm sua matriz anterior. Para as fichas novas, o administrador escolhe explicitamente as coleções: leitor consulta, operador edita dentro dessa seleção, administrador gerencia o município. Novos vínculos não ampliam as permissões de outras contas. O caminho legado de gestão de vínculos recusa fichas já gerenciadas pelo assistente.

A API de e-mail mantém chaves de idempotência por 24 horas; uma entrega ainda não confirmada só pode repetir o mesmo comando por 23 horas, com o mesmo conteúdo. Depois disso é necessário novo envio. Referências oficiais: [Resend — idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys), [Auth — criação administrativa de conta](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Auth — atualização administrativa](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

A preparação do token tem execução reservada a `service_role`. O serviço valida o JWT administrativo no Auth e passa o identificador confirmado ao comando; o banco confere novamente os privilégios municipais após obter o bloqueio de concorrência. Uma chamada direta do navegador não pode fabricar um link e usá-lo como prova de posse de outro e-mail.
