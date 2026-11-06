# Integração Supabase

Projeto: `yyoozisgoginwepzvnvu` (`maringa-prasomar`, São Paulo).

`/gestao/`, `/plataforma/` e `/mapas/` exigem Supabase Auth e carregam somente os cadastros permitidos pelo banco. `?modo=demo` abre o adaptador local antigo, sem iniciar o cliente Supabase. Não existe importação automática de localStorage. O Mapa de Evento e o atendimento WhatsApp continuam como demonstrações locais e são identificados como tal nos links da gestão conectada.

O banco contém `ma_prefeituras`, `ma_vinculos` e `ma_cadastros`. Cada registro conserva a coleção canônica do protótipo e seu JSON, com prefeitura, versão e data controladas pelo servidor. Esse modelo de transição preserva os formulários existentes; não implementa ainda reservas de recursos ou despacho operacional transacional. RLS restringe os dados ao vínculo municipal do usuário. E-mails e nomes de administradores nos cadastros não concedem permissões.

As gravações usam `ma_aplicar_alteracoes`: lote atômico, RLS e verificação da versão anterior. Falhas não alteram o estado em memória nem geram mensagem de sucesso. Use **Atualizar** para buscar alterações de outros dispositivos; não há atualização automática em tempo real nem fila de gravação offline. Os cadastros reais ficam em memória durante a sessão, sem cópia em localStorage; o SDK mantém apenas sua própria sessão autenticada.

## Carga inicial autorizada

Somente 61 estruturas fixas da lista pública CNES já versionada, conferida novamente em 06/11/2026: 38 UBS/unidades de apoio, 4 postos de bombeiros, 2 UPAs, 1 hospital, 1 central SAMU e 15 outros equipamentos fixos de saúde. Excluídos 7 serviços móveis SAMU e 1 clínica odontológica móvel. Nome e código CNES estão confirmados; endereço, contato, geolocalização, capacidade e funcionamento não são inferidos.

`node scripts/preparar-estruturas.mjs` gera `supabase/seeds/estruturas-confirmadas.sql` sem executar a carga. A SQL é idempotente e não substitui cadastros já editados. Os demais arquivos públicos, em conferência, não são importados no modo conectado. Pessoas fictícias, cozinha/caminhão de demonstração e ocorrências simuladas não entram no banco.

## Autenticação e provisionamento

Configuração pública em `backend/config.js`: URL e chave **publishable**. Nunca incluir senha do banco, `service_role` ou chave secreta. SDK 2.119.0 distribuído localmente com licença MIT, versão fixada em package.json e lockfile; Node 22+ para desenvolvimento.

O login envia um link por e-mail e usa PKCE. O primeiro administrador é autorizado por um convite no schema privado, consumido somente após confirmação do e-mail pelo Auth. O endereço do proprietário foi configurado diretamente no banco, não no repositório público. Outros usuários autenticados não têm acesso até receberem vínculo de um administrador pelo backend. Não há autoatribuição de cargos pela interface.

As URLs de retorno devem ser os caminhos exatos `/maringa-alerta/gestao/`, `/maringa-alerta/plataforma/` e `/maringa-alerta/mapas/` em `https://aldenquesada.github.io`. A sessão do painel Supabase não substitui a sessão da aplicação. O serviço padrão de e-mail Supabase tem restrições de destinatários e envio; configurar SMTP institucional antes de convidar usuários externos.

## Validação

- `npm test`: regras do protótipo e do adaptador remoto, inclusive rollback, concorrência e separação das fontes.
- `npm run check`: bundles canônicos sincronizados com `src/`.
- `tests/backend/bootstrap-local.sql` + migrações + `tests/backend/permissoes.sql`: banco PostgreSQL **descartável**, isolamento entre prefeituras, anônimos, leitores, operadores, convite não confirmado e conflito de versões. Nunca executar essas fixtures no projeto real.
- CI repete os testes de banco em PostgreSQL 17.

As migrações desta implantação foram aplicadas pelo SQL Editor da conta autorizada. Antes de usar `supabase db push` pela primeira vez, vincular o projeto correto e marcar essas versões como aplicadas com `supabase migration repair`; não reaplicar CREATE TABLE em produção. A carga inicial é separada das migrações de estrutura.
