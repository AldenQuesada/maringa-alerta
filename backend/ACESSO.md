# Cadastro e acesso de colaboradores — fase 2

O administrador municipal (ou geral) preenche a ficha em `ma_cadastros`, coleção `usuarios`. A ficha, as permissões e a versão são confirmadas numa transação antes de solicitar qualquer envio. Equipe, responsável, substituto e horários pertencem à mesma ficha. A função de trabalho não concede privilégios de acesso.

`private.ma_colaboradores_acesso` contém somente o vínculo de acesso: identidade da ficha, e-mail autorizado, conta autenticada, papel, coleções permitidas e situação. Não é um segundo cadastro de pessoas. Os vínculos anteriores continuam funcionando. A suspensão é consultada no servidor em cada operação, inclusive com sessão já emitida.

O comando especializado de salvamento usa a mesma tabela canônica, valida município e versão, preserva campos não editados e executa os triggers de contrato, relações e auditoria existentes. A edição genérica de uma ficha gerenciada é recusada para evitar divergência entre ficha e acesso.

O serviço `ma-colaboradores-acesso` só chama o Supabase Auth depois da confirmação do cadastro. Conta nova/não confirmada usa envio administrativo; conta confirmada usa a entrega nativa por e-mail sem criar outra conta. As credenciais SMTP e o remetente ficam no painel do Auth. Não há dependência da API do Resend na aplicação. [Preparação da configuração](SMTP_SUPABASE.md).

O banco guarda apenas o hash do token administrativo. O serviço autentica o admin e verifica as permissões municipais; o navegador não pode fabricar o token nem recebe o link bruto. O envio possui uma reserva exclusiva de 90 segundos. Repetições já confirmadas não disparam outro e-mail e tentativas concorrentes não recebem a mesma reserva. O Auth não fornece idempotência SMTP: um resultado desconhecido conserva a reserva e pode exigir nova tentativa depois do prazo; não se promete entrega externa exatamente uma vez. Reenviar com novo comando revoga o acesso anterior. Erro de entrega preserva a ficha.

Os templates oficiais versionados levam o token administrativo e o hash de confirmação do Auth no fragmento da URL. A página remove ambos da barra e não confirma o e-mail apenas por ser aberta; a confirmação só acontece ao enviar o formulário. Conta nova: valida o token nativo, confere a identidade, salva a senha escolhida no Auth, entra com essa senha e ativa o vínculo. Conta existente: exige sua senha e não a substitui. O login habitual não começa solicitando link por e-mail.

A confirmação de um convite pelo Auth pode criar uma senha temporária aleatória. Por isso o controle `senha_inicial` não usa apenas a existência de um hash de senha como prova de conclusão. A ativação exige um JWT com método de autenticação `password`, e-mail confirmado compatível, ficha/município ativos e token válido. Após esse login, os envios pendentes da mesma conta deixam de solicitar primeira senha. Uma falha ao salvar pode ser repetida; se a resposta se perder depois da gravação, o formulário testa a senha informada antes de tentar gravar novamente. Uma sessão criada apenas por confirmação de convite não ativa a ficha.

Configuração privada da função: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (runtime), `PRA_SOMAR_ACCESS_SECRET` (32 bytes aleatórios ou mais) e `PRA_SOMAR_APP_URL` (raiz HTTPS da aplicação). Nenhuma senha SMTP entra no código ou navegador. O status `enviado` significa que o Auth aceitou a solicitação; o identificador armazenado é o da tentativa interna, não um comprovante de entrega na caixa de entrada.

O login habitual usa e-mail e senha. Recuperação de senha permanece uma operação separada do cadastro. As rotas de recuperação devem estar autorizadas na configuração de autenticação.

Referência: fluxo atual do Clinic AI v2, commit `58a2e1283a0087b96f05d1b41961adc56c1b327a`. A geração e cópia de link do Clinic foram adaptadas para envio automático com confirmação; seu fluxo de `signUp` sem sessão não foi copiado.

As contas legadas mantêm sua matriz anterior. Para as fichas novas, o administrador escolhe explicitamente as coleções: leitor consulta, operador edita dentro dessa seleção, administrador gerencia o município. Novos vínculos não ampliam as permissões de outras contas. O caminho legado de gestão de vínculos recusa fichas já gerenciadas pelo assistente.

O token administrativo vale por 48 horas; o hash nativo de confirmação segue o prazo do Auth, uma hora na configuração testada. Uma entrega administrativa ainda não confirmada pode repetir o mesmo comando por até 23 horas, depois exige novo comando. A ficha permanece salva. Referências: [SMTP nativo](https://supabase.com/docs/guides/auth/auth-smtp), [templates](https://supabase.com/docs/guides/auth/auth-email-templates), [verificação do Auth](https://supabase.com/docs/reference/javascript/auth-verifyotp).

A preparação do token tem execução reservada a `service_role`. O serviço valida o JWT administrativo no Auth e passa o identificador confirmado ao comando; o banco confere novamente os privilégios municipais após obter o bloqueio de concorrência. Uma chamada direta do navegador não pode fabricar um link e usá-lo como prova de posse de outro e-mail.
