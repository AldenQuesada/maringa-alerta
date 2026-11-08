# Banco e catálogo territorial — fase 1

A fonte de verdade continua sendo `public.ma_cadastros`. A única RPC para inserir, editar ou excluir registros é `ma_aplicar_alteracoes`, com o município, o ID e a versão anterior. Não existe sincronização pelo navegador nem uma segunda gravação de cadastro.

A migração `20261108115725_fase1_catalogo_territorial.sql` adiciona uma projeção relacional no schema não exposto `territorio`. O trigger atualiza essa projeção na mesma transação do cadastro; falhas de tipo, coordenada ou vínculo revertem o lote inteiro. A carga inicial apenas lê os cadastros, mantendo JSON, IDs, versões, datas e histórico.

## Domínios e identidade

| Domínio | Coleções canônicas | Relação |
|---|---|---|
| Local físico | `unidades`, `bases`, `instituicoes`, `abrigos`, `pontos` | Pode abrigar vários serviços e recursos |
| Serviço | `servicos` | Exige `unidade_colecao` e `unidade_id` de um local no mesmo município |
| Recurso | `recursos`, `equipamentos`, `veiculos`, `estoques` | Identidade própria; vínculo ao local opcional para permitir recursos móveis |
| Pessoa | `usuarios`, `voluntarios`, `integrantes` | Referência ao cadastro existente; não concede acesso nem comprova identidade por telefone |
| Operação | `eventos`, `incidentes`, `solicitacoes`, `relatos`, `mobilizacoes`, `apoios` | Pode relacionar locais, serviços e recursos em `vinculos_territoriais` |
| Área | `bairros`, `zonas`, `riscos` | Polígonos e consultas de cobertura |

A identidade é sempre `(municipio_id, colecao, id)`. Um ID igual em outra coleção ou cidade não é o mesmo registro. Chaves estrangeiras verificam município e domínio, inclusive para `responsavel_colecao` + `responsavel_id`. O responsável precisa ser uma pessoa existente. O campo antigo `responsavel_id`, sem a nova coleção explícita, conserva suas regras anteriores.

Referências são verificadas até o fim da transação, permitindo lotes com dependências. A exclusão de um local usado por serviço/recurso, de uma pessoa responsável ou de um recurso ligado a operação é recusada. Exclua ou desvincule as dependências explicitamente; não há exclusão silenciosa desses cadastros. Desativar o local retira também seus serviços e recursos das buscas por raio.

Os rótulos legados são classificados conservadoramente. Por exemplo, uma base chamada “Ponto de água potável” continua sendo o mesmo local; nenhum serviço, capacidade ou disponibilidade foi inventado. O `tipo_id` de `incidentes` continua apontando para `ocorrenciaTipos`, e não para o catálogo territorial.

## Catálogo configurável

São 12 categorias e 70 tipos iniciais, com domínios `local`, `servico` e `recurso`. `pai_id` permite subtipos do mesmo domínio. Tipos e categorias podem ser criados, renomeados ou desativados sem editar JavaScript. O domínio de um tipo é imutável; ciclos de subtipos são rejeitados, inclusive sob concorrência.

`ma_catalogo_territorial()` devolve categorias e tipos, incluindo versão e estado ativo. O catálogo global não contém registros municipais ou dados pessoais e exige autenticação. A administração geral usa:

```sql
select public.ma_salvar_catalogo_territorial('tipo',
 '{"id":"servico_configurado","categoria_id":"comunidade","dominio":"servico","nome":"Serviço configurado"}', 0);
```

Versão `0` cria; a versão atual edita. Uma versão desatualizada falha com `40001`. A auditoria registra ator, valores anteriores e posteriores em `private.ma_historico`. Tipos inativos não podem ser atribuídos a novos registros nem aparecem na busca por raio; registros antigos podem ser corrigidos mantendo esse tipo. O catálogo é desativado, não apagado pela API.

## Contrato dos novos cadastros

`unidades` e `recursos` exigem `nome` e `tipo_id`. `servicos` exige também o vínculo ao local. Continuam obrigatórios `dados.id`, `dados.municipioId` e o envelope municipal do gravador existente.

Campos adicionais:

- `ativo`: booleano; arquivamento ou estado legado `Inativo` também desativa a projeção.
- `estado_operacional`: `a_confirmar`, `disponivel`, `limitado` ou `indisponivel`. A busca retorna esse estado em `dados`; presença na busca não constitui promessa de disponibilidade ou reserva.
- `capacidade_valor`, `unidade_medida`, `periodo`: capacidade expressa do serviço/local, como 250 refeições por dia. Uma capacidade exige unidade de medida.
- `quantidade_disponivel`: número não negativo próprio do recurso. Não reserva nem dá baixa em estoque.
- `responsavel_colecao`, `responsavel_id`: pessoa responsável do mesmo município.
- Endereço, contato, horário, verificação, fotos e demais informações permanecem no JSON canônico, sujeitos aos contratos de sua coleção; formulários e regras específicas de mídia são etapas posteriores.
- `vinculos_territoriais`: lista de até 100 objetos `{ "colecao": "recursos", "id": "id-existente" }` em operações. Não aceita pessoas ou outro município como destino.

Uma igreja com cozinha e freezer corresponde a três registros: local em `unidades`, cozinha em `servicos` com capacidade própria e freezer em `recursos` com quantidade própria. Os dois últimos apontam para a mesma unidade. Os testes exercitam esse caso sem criar exemplos em produção.

## Coordenadas e consultas

PostGIS fica no schema `gis`, com índices GiST de ponto e área. Latitude/longitude são WGS84; a criação do ponto usa **longitude primeiro**. Latitude deve estar entre −90 e 90 e longitude entre −180 e 180; valores não finitos são recusados.

- `geo_fonte`: origem informada das coordenadas.
- `geo_precisao_m`: precisão informada, não negativa, em metros; ausente significa desconhecida.
- `geo_confirmada`: booleano explícito, inicialmente falso. Requer ponto e fonte. `geo_confirmada_em` é controlado na projeção pelo servidor e renovado se ponto ou fonte mudarem.
- Rótulos antigos de verificação não são convertidos automaticamente em confirmação GPS.
- `geojson`: Polygon/MultiPolygon, objeto ou string JSON; aceita Feature contendo esses formatos. Exige geometria válida, não vazia, com SRID 4326 e coordenadas dentro dos limites.

RPCs públicas, todas `SECURITY INVOKER`:

| RPC | Resultado |
|---|---|
| `ma_territorio_listar(municipio, dominio_alvo, tipo_alvo, limite, deslocamento)` | Cadastro canônico e projeção; padrão de 100, máximo de 500 por página; inclui inativos para administração |
| `ma_territorio_proximos(municipio, latitude, longitude, raio_m, dominio_alvo, tipo_alvo, limite)` | Locais/serviços/recursos ativos, ordenados por distância, coleção e ID; raio de 0 a 100.000 m, máximo de 500 resultados |
| `ma_territorio_areas(municipio, latitude, longitude)` | Áreas que cobrem o ponto, incluindo sua borda |

Serviços e recursos sem ponto próprio herdam o ponto atual da unidade durante a consulta, sem copiar coordenadas. O resultado indica `ponto_herdado`, fonte, precisão, confirmação e `distancia_m`. A distância é **geodésica**, não um trajeto rodoviário ou tempo de deslocamento.

O PostGIS não declara seus predicados espaciais `LEAKPROOF`; usá-los diretamente atrás de RLS pode impedir o índice. Dois leitores privados, com `search_path` vazio, autenticação e checagem explícita de `private.ma_permitido`, fazem somente a seleção espacial autorizada. Não executam SQL dinâmico nem gravação. As tabelas mantêm RLS, as RPCs públicas permanecem invoker e nenhuma propriedade da extensão foi afrouxada. O teste de volume comprova o índice executado na RPC com usuário municipal, não apenas sua existência.

## Permissões e testes

As três coleções novas concedem leitura/gravação/exclusão ao administrador municipal, leitura/gravação ao operador e somente leitura ao leitor. Suspensão municipal bloqueia leitura e gravação. Pessoas e operações conservam suas permissões anteriores; a projeção não amplia sua visibilidade. Alteração do catálogo global exige administrador geral. Clientes não recebem DML direto em nenhuma tabela territorial.

O CI reproduz todas as migrações em PostgreSQL 17 + PostGIS, em banco `template0` novo, e executa `territorio.sql`, `territorio-concorrencia.py` e `territorio-espacial.py`, além das regressões anteriores. As fixtures são exclusivamente descartáveis. A verificação móvel obrigatória continua cobrindo os três mapas, Chromium/WebKit e 320/390 px.

Os formulários, filtros visuais e a integração dos novos serviços/recursos nos três mapas pertencem à fase 3. Nenhuma câmera, interação de navegação ou expectativa de teste de câmera é alterada nesta fase.
