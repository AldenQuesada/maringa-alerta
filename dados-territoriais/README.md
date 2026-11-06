# Camadas territoriais de Maringá

## Fontes conferidas em 06/11/2026

- `maringa-bairros-ibge2022.geojson`: 113 bairros, com nomes e geometrias do Censo 2022, município `4115200`.
- `maringa-zonas-cartograficas.geojson`: 61 zonas numeradas do GeoMaringá. As 66 feições originais foram agrupadas pelo número; fragmentos contíguos foram unidos sem criar limites.
- `maringa-subdistritos-ibge.json`: 47 subdistritos para conferência. São outra classificação; não foram misturados às zonas municipais.
- `maringa-cnes-georreferencias.json`: endereço, contato e coordenadas das 61 instituições fixas, consultados individualmente na API do Ministério da Saúde.
- `maringa-apoios-conferidos.json`: 17 locais das imagens fornecidas, com dez coordenadas verificadas. Sete permanecem sem marcador. Disponibilidade atual dos apoios: a confirmar.

[Conferência detalhada, fontes e pendências](CONFERENCIA-2026-11-06.md).

## Onde aparece

Os mapas de Evento, Ajuda e Colaboradores consultam os mesmos cadastros autorizados no Supabase. Os filtros incluem registros sem coordenadas e informam por que não aparecem como pontos. A gestão contém 113 bairros, 61 zonas e 78 estruturas (61 instituições e 17 apoios).

As camadas versionadas permitem consultar a cartografia pública. A malha IBGE 2022 não garante equivalência com a divisão municipal vigente em 2026. Zonas cartográficas não representam homologação de áreas de comando operacional da Defesa Civil.

## Atualização

`scripts/atualizar-bairros-ibge2022.py` extrai a malha do arquivo oficial. Os scripts `atualizar-bairros-maringa.py` e `atualizar-camadas-municipais.py` consultam as demais fontes públicas. Uma nova consulta não substitui automaticamente a revisão dos resultados. O manifesto municipal conserva a falha da consulta de bairros e registra a obtenção das zonas.

`node scripts/preparar-territorios-apoios.mjs` prepara a SQL real, idempotente, sem executá-la. Não usar os arquivos antigos de demonstração como carga do banco. Nenhuma pessoa ou ocorrência simulada integra essa carga.
