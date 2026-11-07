# Integração isolada: Admin Geral e segurança

## Entrega

Integração preparada em `/tmp/maringa-integracao-isolada`, branch `codex/integracao-admin-seguranca`. Nenhuma alteração na produção, no Supabase, na branch `main` ou nos arquivos de trabalho dos dois chats. Nenhum push ou publicação.

Foram combinados:

- **Admin Geral:** snapshot `f6056ad`, capturado de 41 arquivos alterados/novos da cópia do chat “Auditar gestão das prefeituras”, sobre a base `2c89565`.
- **Segurança e operações:** branch `codex/seguranca-banco`, até `c5edd77`, incluindo `8ff3ef6`.

O snapshot foi conferido por hashes imediatamente após a cópia. O outro chat continua trabalhando; houve alterações posteriores ao ponto de corte. Esta entrega não incorpora silenciosamente essas alterações. Imagens de evidência e capturas de tela da outra cópia não fazem parte do código integrado.

## O que foi preservado de cada trabalho

Do Admin Geral: catálogo IBGE com 5.571 municípios e 27 UFs; validação de identidade oficial da prefeitura; administração global independente de vínculo municipal; gestão de vínculos e auditoria administrativa; páginas e serviços modularizados; consultas paginadas; carga de cadastros restrita à prefeitura selecionada.

Da segurança: escrita única por RPC com papel interno sem bypass de RLS; matriz de capacidades; contratos e regras operacionais no banco; integridade de referências; respostas canônicas do servidor; histórico protegido; controles de permissão; painel pessoal persistido; mapas conectados sem dados territoriais locais alternativos; entrada de demonstração removida.

## Conflitos resolvidos

1. **Login e rotas:** o Admin Geral usa seu serviço próprio e não carrega registros municipais, painel pessoal ou configuração operacional desnecessária. Na área municipal, as regras são carregadas antes do repositório e dos controladores. O município da URL tem precedência, e a sessão é atualizada com o município efetivamente carregado.
2. **Repositório:** o arquivo publicado continua gerado pelo manifest. Consultas e cálculo de diferenças permanecem em módulos próprios. A composição recebeu as capacidades, confirmações canônicas e persistência do painel da branch de segurança. Registros e painel são consultados com filtro municipal explícito.
3. **Duas implementações de escrita:** a migração `20261106233100_escrita_controlada.sql` foi conciliada na cópia integrada. Foram mantidos os helpers pequenos de prefeitura e cadastro, mas removida a criação de `private.ma_aplicar_lote`, que seria um segundo caminho de escrita com privilégios diferentes. O caminho final passa pela validação operacional e pelo papel `ma_escritor`, sem login, superusuário ou bypass de RLS.
4. **Catálogo e gatilhos:** concedida ao papel interno somente a leitura do catálogo oficial necessária ao gatilho de validação, com políticas de leitura correspondentes. Helpers internos continuam inacessíveis ao papel autenticado.
5. **Auditoria:** preservadas as responsabilidades complementares. `ma_auditoria` contém metadados consultáveis pelo Admin Geral; `private.ma_historico` guarda snapshots protegidos. O teste integrado confirma autor e registro nas duas trilhas, sem expor snapshots pela interface administrativa.
6. **Admin e resposta da RPC:** o serviço administrativo agora exige e usa os dados/versão confirmados pelo servidor. Resposta incompleta bloqueia novas gravações até recarregar.
7. **Testes e CI:** unidas as suítes. Fixtures de prefeituras usam identidades do catálogo oficial, exclusivamente em banco descartável; nenhum catálogo inventado foi acrescentado para contornar validações. Corrigidos os mocks de boot para representar o carregamento real do script.

8. **Artefato e cache:** retiradas do precache as referências a dois JSON locais que não entram na publicação. A versão do cache foi renovada e a preparação do artefato agora falha se algum arquivo de precache estiver ausente. Os scripts locais referenciados pelas páginas do artefato também foram conferidos, sem arquivos ausentes.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| JavaScript com Node 22.23.2 | 220 testes aprovados, zero falhas |
| Construção canônica | Todos os bundles conferidos, incluindo `backend/repositorio.js` |
| Instalação conjunta em PostgreSQL 16 UTF-8 vazio | Aprovada |
| Suítes SQL | 6 aprovadas: permissões, segurança, operações, painel, Admin Geral e integração |
| Cobertura do catálogo nacional | Criação local para as 5.571 identidades oficiais/27 UFs, com rollback |
| Concorrência: mesma versão | Uma gravação aceita; outra rejeitada |
| Concorrência: ciclo entre eventos | Ciclo rejeitado entre duas conexões |
| Tabelas próprias integradas | 13, todas com RLS habilitada |
| Funções públicas SECURITY DEFINER | Nenhuma |
| Caminho paralelo `private.ma_aplicar_lote` | Ausente |
| DML direto nas tabelas principais | Continua negado ao autenticado |
| Acesso aos executores internos | Negado ao autenticado |
| Artefato de publicação | Gerado localmente, sem publicação |
| Sintaxe e diff | Conferidos |

Os testes novos exercitam o fluxo integrado: criar prefeitura oficial pelo Admin Geral, receber versão canônica, obter capacidades municipais, gravar uma base, registrar ambas as auditorias e rejeitar demonstração marcada. Também exercitam boot municipal com regras/permissões e boot administrativo sem vínculo municipal. Os testes de interface usam DOM simulado, não uma homologação visual autenticada do site real.

Tabelas próprias: `ma_prefeituras`, `ma_vinculos`, `ma_cadastros`, `ma_configuracao`, `ma_painel`, `ma_ufs`, `ma_municipios_ibge`, `ma_auditoria`, `ma_admins`, `ma_convites_iniciais`, `ma_permissoes`, `ma_historico`, `ma_referencias`. A contagem se refere ao banco efêmero desta integração, não ao estado remoto.

## Reprodução

A partir da cópia integrada:

```sh
npm test
npm run check
sh scripts/testar-banco-isolado.sh
```

O script SQL cria um cluster novo, usa exclusivamente loopback, instala as migrações, executa as seis suítes e a concorrência e encerra o cluster ao terminar. Requer PostgreSQL local; `PG_BIN_DIR` permite informar o diretório de binários. Não utiliza o projeto Supabase nem credenciais de produção. A porta padrão é 55439 e pode ser alterada com `MARINGA_TEST_PORT`. As fixtures não são publicadas nem enviadas ao Supabase.

## Antes de qualquer implantação futura

- Escolher o próximo ponto de corte do outro chat e integrar seu delta em uma nova rodada, sem substituir a cópia ativa.
- Conferir o histórico remoto de migrações. Este pacote concilia SQL local ainda em preparação; **não assumir que arquivos com o mesmo nome e conteúdo diferente possam ser reaplicados**. Se alguma versão original já estiver instalada, preparar uma migração incremental a partir desse estado real.
- Conferir dados existentes contra os contratos e preparar backfill se houver referências anteriores. A proteção que interrompe a migração diante dessas referências foi mantida.
- Aplicar primeiro o banco, depois a interface que depende das novas funções e tabelas; repetir RLS, grants, contagens, mapas, filtros e acesso autenticado no ambiente integrado.
- SMTP, entrega de login, backups/restauração, retenção de históricos, carga operacional e inspeção visual em navegador real continuam fora desta validação local. Nenhuma credencial SMTP foi copiada para o pacote.

Esta integração resolve os conflitos entre os dois pontos de corte e passa nos testes conjuntos. Não certifica nível enterprise nem conclui a refatoração adicional ainda em andamento no outro chat.
