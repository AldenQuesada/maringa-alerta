# Conferência de territórios e estruturas — 06/11/2026

Projeto Supabase `yyoozisgoginwepzvnvu`, prefeitura Maringá, IBGE `4115200`. Carga conferida no banco: **252 cadastros**, sem pessoas, equipes ou ocorrências simuladas.

| Coleção | Registros | Coordenadas de pontos |
|---|---:|---:|
| Bairros IBGE 2022 | 113 | Geometrias de áreas |
| Zonas municipais | 61 | Geometrias de áreas |
| Instituições CNES | 61 | 61 |
| Apoios das imagens | 17 | 10 |

## Territórios

Os 113 bairros foram extraídos do [arquivo oficial IBGE — Paraná, Censo 2022](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/PR_bairros_CD2022.zip), filtrados pelo município. São 113 nomes distintos, sem nomes ou limites inventados.

A [camada Zonas do GeoMaringá](https://geoproc.maringa.pr.gov.br/arcgis/rest/services/SIGMARINGA/MAPA_BASE/MapServer/10) retornou 66 feições e 61 números distintos: 1 a 62, exceto 52. As zonas 16, 33, 34, 49 e 51 possuem dois fragmentos na fonte. A união geométrica conserva a área original e produz geometrias válidas. Nenhuma zona ausente foi criada para completar a sequência.

A [API de subdistritos do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/municipios/4115200/subdistritos) retornou 47 entradas, incluindo Zona Central. Essa classificação não foi confundida com as 61 zonas cartográficas municipais. O vínculo cartográfico de um ponto a uma zona foi registrado somente quando contido em um único polígono; não é atribuição operacional.

## Instituições e apoios

As 61 estruturas fixas existentes foram consultadas por código na [API CNES do Ministério da Saúde](https://apidadosabertos.saude.gov.br/cnes/estabelecimentos). Foram conferidos código, nome, município e coordenadas, sem importar os serviços móveis. A atualização complementa campos ausentes e preserva edições municipais. O cadastro CNES não confirma disponibilidade de atendimento em tempo real.

Todos os 17 locais mostrados nas três imagens foram cadastrados: 12 CRAS, quatro pontos divulgados para água e uma igreja divulgada para banho. Nove CRAS têm endereço compatível com o ponto da [camada oficial CRAS](https://geoproc.maringa.pr.gov.br/arcgis/rest/services/SIGMARINGA/CRAS/MapServer/0). O décimo ponto é o Rio Hotel by Bourbon, com endereço e coordenadas publicados pelo [site oficial do hotel](https://www.bourbon.com.br/hoteis-e-resorts/rio-hotel-by-bourbon-maringa).

**A identidade do local e sua posição não confirmam que a oferta emergencial permanece disponível.** Os 17 apoios têm disponibilidade “A confirmar”. A referência a quarta-feira na imagem da igreja não permite inferir data de funcionamento atual.

## Locais cadastrados sem marcador

| Local | Pendência |
|---|---|
| CRAS Morangueira | Imagem: Haiti, 808; camada municipal: Haiti, 830. |
| CRAS São Judas Tadeu | Imagem: Flamboyant, 1214; camada municipal: 1238. O Requerimento 194/2026 da Câmara também menciona 1214, sem fornecer coordenadas. |
| CRAS Mandacaru | Imagem: Pioneiro Ignácio Gomes, 117; camada municipal: Jasmins, 513. |
| Fisioquântic | Endereço confirmado no site institucional; coordenadas exatas não confirmadas. |
| Puralab | Endereço da imagem, corroborado por registro empresarial; posição exata pendente. |
| SOHO Club | Endereço da imagem, corroborado por registro empresarial; posição exata pendente. |
| Igreja da Palavra | Endereço e contato da imagem; posição exata pendente. |

Fontes adicionais: [Câmara Municipal — Requerimento 194/2026](https://sapl.cmm.pr.gov.br/sessao/1766/ordemdia), [Fisioquântic — contato](https://www.fisioquantic.com.br/contato), [registro Puralab](https://cnpj.biz/55594120000156), [registro SOHO](https://cnpj.biz/41148391000173), [registro Igreja da Palavra](https://cnpj.biz/57788639000109). Os registros empresariais são fontes secundárias; não foram usados para inventar coordenadas ou atestar a oferta atual.

## Reprodução e integridade

Os arquivos públicos sanitizados desta pasta geram `supabase/seeds/territorios-e-apoios-reais.sql` por `node scripts/preparar-territorios-apoios.mjs`. A SQL não exclui registros, não substitui cadastro existente e não contém dados de demonstração. A aplicação mantém todas as estruturas pesquisáveis, inclusive as sete sem posição confirmada. São 71 marcadores possíveis, sem usar centros de bairros ou CEP como coordenadas dos estabelecimentos.

A execução foi dividida em lotes no SQL Editor por limite de tamanho da interface. A união dos cinco polígonos fragmentados foi aplicada depois, com verificação da versão anterior. A SQL versionada já contém a geometria normalizada para cargas futuras.
