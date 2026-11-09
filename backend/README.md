# Integração Supabase

Projeto: `yyoozisgoginwepzvnvu` (`maringa-prasomar`, São Paulo).

`/gestao/`, `/plataforma/`, `/mapas/` e `/index.html` exigem Supabase Auth e carregam somente os cadastros permitidos pelo banco. O parâmetro `?modo=demo` não libera acesso. Não existe importação automática de localStorage. O artefato publicado exclui fixtures e o simulador de atendimento.

São 33 tabelas próprias com RLS: oito públicas (`ma_prefeituras`, `ma_vinculos`, `ma_cadastros`, `ma_ufs`, `ma_municipios_ibge`, `ma_auditoria`, `ma_configuracao`, `ma_painel`) e cinco privadas (`ma_admins`, `ma_convites_iniciais`, `ma_permissoes`, `ma_historico`, `ma_referencias`), 16 do módulo WhatsApp e quatro territoriais (`categorias`, `tipos`, `entidades`, `vinculos_operacionais`). Cada cadastro conserva sua coleção canônica e seu JSON, com prefeitura, versão e data controladas pelo servidor. Contratos, capacidades, transições e relações vêm do banco. As ocorrências ficam na coleção `incidentes`, com validação territorial e histórico. Não há despacho externo automático nem reserva transacional de recursos. E-mails e nomes nos cadastros não concedem permissões.

Os cadastros usam exclusivamente `ma_aplicar_alteracoes`: lote atômico e verificação obrigatória da versão anterior. A função pública invoker encaminha ao executor privado, que valida identidade, papel, prefeitura e suspensão em cada operação. A escrita direta nas tabelas foi revogada; RLS continua protegendo as leituras e servindo como defesa adicional. Os helpers internos não são executáveis pelos clientes. Falhas não alteram o estado em memória nem geram mensagem de sucesso. Após uma falha da requisição, novas gravações ficam bloqueadas até recarregar: a conexão pode ter caído depois de o servidor salvar. Recarregue a página no navegador para conferir o resultado e buscar alterações de outros dispositivos; não há atualização automática em tempo real nem fila de gravação offline. Os cadastros reais ficam em memória durante a sessão, sem cópia em localStorage; o SDK mantém apenas sua própria sessão autenticada.

## Carga inicial autorizada

61 estruturas fixas da lista pública CNES, conferida novamente em 06/11/2026: 38 UBS/unidades de apoio, 4 postos de bombeiros, 2 UPAs, 1 hospital, 1 central SAMU e 15 outros equipamentos fixos de saúde. Excluídos 7 serviços móveis SAMU e 1 clínica odontológica móvel. A consulta individual à API oficial do Ministério da Saúde complementou endereço, contato e coordenadas. Capacidade e funcionamento atual não são inferidos.

`node scripts/preparar-estruturas.mjs` gera `supabase/seeds/estruturas-confirmadas.sql` sem executar a carga. A SQL é idempotente e não substitui cadastros já editados.

Em 06/11/2026 foram adicionados 113 bairros IBGE 2022, 61 zonas cartográficas municipais e 17 pontos de apoio das imagens fornecidas. `node scripts/preparar-territorios-apoios.mjs` gera `supabase/seeds/territorios-e-apoios-reais.sql`, sem enviar dados. A carga preserva registros existentes e preenche apenas campos ausentes nas instituições CNES. São 252 cadastros: 174 territórios e 78 estruturas, das quais 71 têm coordenadas verificadas. Sete apoios permanecem na lista, sem marcador; a disponibilidade atual dos 17 apoios está a confirmar. Consulte [a conferência e suas fontes](../dados-territoriais/CONFERENCIA-2026-11-06.md).

Pessoas fictícias, cozinha/caminhão de demonstração e ocorrências simuladas não entram no banco. Nenhuma carga é executada automaticamente pelo navegador.

## Autenticação e provisionamento

Configuração pública em `backend/config.js`: URL e chave **publishable**. Nunca incluir senha do banco, `service_role` ou chave secreta. SDK 2.119.0 distribuído localmente com licença MIT, versão fixada em package.json e lockfile; Node 22+ para desenvolvimento.

Nesta versão, o login habitual usa e-mail e senha. O administrador cadastra a ficha completa em `/colaboradores/`; somente após o salvamento confirmado o serviço envia o acesso. O destinatário define sua senha ou usa a conta existente. Papéis e suspensão são conferidos no servidor. O primeiro administrador já provisionado e os vínculos legados são preservados. Consulte o [contrato de cadastro e acesso](ACESSO.md).

A publicação da fase 2 depende de configurar e homologar `ma-colaboradores-acesso` e o remetente de e-mail. Até isso acontecer, o ambiente publicado continua na versão anterior; a documentação da implementação não comprova publicação ou entrega real.

As URLs de retorno devem incluir os caminhos exatos `/maringa-alerta/gestao/`, `/maringa-alerta/plataforma/`, `/maringa-alerta/mapas/`, `/maringa-alerta/index.html` e `/maringa-alerta/` em `https://aldenquesada.github.io`. A sessão do painel Supabase não substitui a sessão da aplicação. Incluir também `/maringa-alerta/acesso/?recuperar=1` nos retornos autorizados de recuperação. O envio inicial é realizado pelo serviço próprio; a recuperação habitual usa o canal de e-mail configurado na autenticação. Ambos precisam ser homologados antes da publicação.

## Validação

- `npm test`: regras do protótipo e do adaptador remoto, inclusive rollback, concorrência e separação das fontes.
- `npm run check`: bundles canônicos sincronizados com `src/`.
- `tests/backend/bootstrap-local.sql` + migrações + `tests/backend/permissoes.sql`: banco PostgreSQL **descartável**, isolamento entre prefeituras, anônimos, leitores, operadores, convite não confirmado e conflito de versões. Nunca executar essas fixtures no projeto real.
- CI repete os testes de banco em PostgreSQL 17 + PostGIS, incluindo concorrência territorial e execução do índice espacial sob permissões municipais.

As migrações iniciais foram aplicadas pelo SQL Editor da conta autorizada. A fase 0 reconciliou o histórico remoto com as 35 versões canônicas; a fase 1 foi aplicada pela CLI e completou 36 versões alinhadas, sem pendências. Não repetir o reparo histórico nem reaplicar as migrações antigas. A carga inicial permanece separada das migrações de estrutura.

## Administração Geral — revisão de 06/11/2026

Consulte [os contratos e limites da área central](../plataforma/README.md) e [a auditoria desta revisão](../AUDITORIA_ADMIN_GERAL_2026-11-06.md). A carga nacional é somente catálogo: nenhum novo ambiente municipal, conta ou vínculo foi criado em produção. As cinco novas migrações foram aplicadas pelo SQL Editor e verificadas; o frontend integra a versão atual. O histórico da CLI foi reconciliado na fase 0 e conferido novamente após a fase 1.

## Catálogo territorial

A fase 1 preserva os 253 cadastros inventariados em 08/11/2026 e adiciona os domínios `unidades`, `servicos` e `recursos`, com 12 categorias e 70 tipos iniciais configuráveis. Pessoas e operações conservam suas coleções existentes. A projeção relacional é mantida pelo servidor, na mesma transação do gravador canônico. Há consultas por raio e cobertura territorial, qualidade explícita de coordenadas e auditoria do catálogo. Consulte o [contrato e as APIs](TERRITORIO.md) e a [validação da fase 1](../auditorias/FASE_1_BANCO_CATALOGO_2026-11-08.md).
