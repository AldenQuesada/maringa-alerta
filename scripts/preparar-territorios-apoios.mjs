import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(resolve(root,'dados-territoriais',name),'utf8'));
const literal=x=>JSON.stringify(x).replaceAll("'","''");
export function construirCarga(){
 const ibge=read('maringa-ibge2022-fonte.json'),bairros=read('maringa-bairros-ibge2022.geojson').features;
 const zonas=read('maringa-zonas-cartograficas.geojson').features;
 const bases=read('maringa-apoios-conferidos.json').bases;
 const complementos=read('maringa-cnes-georreferencias.json').unidades;
 if(bairros.length!==113||zonas.length!==61||bases.length!==17||complementos.length!==61)throw Error('Contagem divergente: revisar as fontes antes de importar.');
 const rows=[
  ...bairros.map(f=>({colecao:'bairros',dados:{id:f.id,municipioId:'maringa',nome:f.properties.nome,codigo:f.properties.codigo_bairro,externalId:f.id,fonte:'IBGE / Censo 2022 · Divisões intramunicipais',url_fonte:ibge.fonte,ano_referencia:2022,consulta_fonte_em:'2026-11-06',verificacao:'Validado',geojson:JSON.stringify(f.geometry),observacoes:'Malha IBGE 2022. Não equivale à divisão municipal atual nem a zonas operacionais.'}})),
  ...zonas.map(f=>({colecao:'zonas',dados:{id:f.id,municipioId:'maringa',nome:f.properties.nome,tipo:'Zona numerada',codigo:f.properties.codigo,externalId:f.id,fonte:f.properties.fonte,url_fonte:f.properties.url_fonte,consulta_fonte_em:'2026-11-06',objetos_fonte:f.properties.objetos_fonte,verificacao:'Validado',geojson:JSON.stringify(f.geometry),observacoes:'Zona cartográfica oficial da Prefeitura. Não representa homologação de área de comando operacional da Defesa Civil.'}})),
  ...bases.map(dados=>({colecao:'bases',dados}))
 ];
 if(new Set(rows.map(x=>x.colecao+':'+x.dados.id)).size!==rows.length)throw Error('Identificador duplicado.');
 return {rows,complementos};
}
const {rows,complementos}=construirCarga();
const sql=`-- Carga real autorizada: IBGE 2022, GeoMaringá, CNES e locais das imagens.
-- Não importa fixtures, pessoas ou ocorrências. Idempotente e sem exclusões.
begin;
do $$ begin
 if not exists(select 1 from public.ma_prefeituras where id='maringa' and codigo_ibge='4115200') then
  raise exception 'Prefeitura de Maringá não encontrada';
 end if;
end $$;
insert into public.ma_cadastros(municipio_id,colecao,id,dados)
select 'maringa',item->>'colecao',item->'dados'->>'id',item->'dados'
from jsonb_array_elements('${literal(rows)}'::jsonb) item
where not exists(select 1 from public.ma_cadastros c where c.municipio_id='maringa' and c.colecao=item->>'colecao' and c.dados->>'externalId'=item->'dados'->>'externalId')
on conflict(municipio_id,colecao,id) do nothing;
-- Preenche somente campos ausentes nas 61 instituições já existentes.
-- Preserva valores editados pelo município e só substitui o aviso da carga inicial.
with incoming as (select item from jsonb_array_elements('${literal(complementos)}'::jsonb) item),
patches as (
 select c.id,jsonb_object_agg(e.key,e.value) as patch
 from incoming i join public.ma_cadastros c on c.id=i.item->>'id' and c.municipio_id='maringa' and c.colecao='instituicoes'
 cross join lateral jsonb_each(i.item) e
 where ((not c.dados ? e.key or c.dados->>e.key is null or c.dados->>e.key='')
 or (e.key='servicos' and c.dados->>'servicos'='Identidade e código confirmados no CNES. Endereço, telefone, coordenadas e disponibilidade operacional não foram confirmados nesta carga.'))
 and c.dados->e.key is distinct from e.value
 group by c.id
)
update public.ma_cadastros c set dados=c.dados||p.patch
from patches p where c.id=p.id and c.municipio_id='maringa' and c.colecao='instituicoes';
commit;
select colecao,count(*) as registros,count(*) filter(where dados->>'lat' is not null and dados->>'lat'<>'') as com_coordenadas from public.ma_cadastros where municipio_id='maringa' group by colecao order by colecao;
`;
writeFileSync(resolve(root,'supabase/seeds/territorios-e-apoios-reais.sql'),sql);
console.log('Carga preparada, sem envio: '+rows.length+' novos cadastros e '+complementos.length+' complementos CNES.');
