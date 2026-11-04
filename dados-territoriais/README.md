# Camadas territoriais de Maringá

## Dados prontos para o protótipo
- `maringa-bairros-ibge2022.geojson`: **113 geometrias com 113 nomes distintos**, filtradas pela chave de município `4115200`, diretamente do arquivo público `PR_bairros_CD2022.zip` do IBGE Censo 2022. Arquivo versionado, com rótulos UTF-8 corrigidos e geometrias em longitude/latitude. Preferência no carregamento dos mapas se a fonte municipal de 2026 não estiver acessível.
- `maringa-bairros.geojson`: 50 feições, 49 nomes distintos da camada estadual Paraná Interativo (muitas com rótulos numéricos). Mantida somente como fallback histórico claramente identificado.
- `maringa-municipal-fonte.json`: resultado auditado da tentativa de consulta às camadas `Bairro` e `Zonas` do GeoMaringá. A consulta falhou por timeout na execução de 04/11/2026. NÃO há base municipal homologada distribuída no repositório neste momento.

## Onde aparece
- `/index.html` — Mapa de Evento, camadas de bairros administrativas opcionais; seis zonas simuladas mantidas como uma camada separada.
- `/mapas/?tipo=colaboradores` — Mapa de Colaboradores com busca/lista de bairros.
- `/mapas/?tipo=ajuda` — Mapa da Ajuda com busca/lista de bairros.
- `/gestao/#bairros` — tabela de todos os bairros obtidos da fonte versionada, com pesquisa e links diretos aos mapas. Pode registrar todos no cadastro local, sem duplicar registros validados.
- `/gestao/#zonas` — separação explícita entre zonas do sistema (a serem cadastradas/homologadas) e seis polígonos demonstrativos.

Nos três mapas, o controle territorial permite ver bairros, localizar cada nome, alternar zonas cartográficas quando existirem e exibir as seis zonas demonstrativas. **Os polígonos das zonas demonstrativas não são limites de operação validados pela Prefeitura/Defesa Civil.**

## Atualização
A importação reproduzível de dados foi implementada em `scripts/atualizar-bairros-ibge2022.py`, `scripts/atualizar-bairros-maringa.py` e `scripts/atualizar-camadas-municipais.py`. O workflow `publicar-bairros-maringa.yml` pode atualizar a base versionada. Não tratar automaticamente dados de outra fonte como substituição oficial sem validar código do município, nomes, geometria e período.

## Limites
Este protótipo é publicado em GitHub Pages e tem persistência local. A malha IBGE 2022 **não garante a cobertura de todos os bairros conforme a delimitação municipal vigente em 2026**. Não gerar fronteiras ou nomes inexistentes. A atribuição de cada bairro a uma zona operacional precisa ser configurada pela Prefeitura/Defesa Civil; não pode ser inferida automaticamente de zonas censitárias, urbanísticas ou de seis polígonos demonstrativos.

Fonte: [Malha IBGE de Bairros, Censo 2022, UF Paraná](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/PR_bairros_CD2022.zip).
