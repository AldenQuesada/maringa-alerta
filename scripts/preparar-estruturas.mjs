import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const doc=JSON.parse(readFileSync(resolve(root,'dados-territoriais/maringa-unidades-cnes.json'),'utf8'));
if(doc.municipio_ibge!=='4115200'||doc.unidades.length!==69)throw Error('Revisar a fonte CNES antes de gerar a carga.');
// Apenas equipamentos fixos: ambulâncias e odontologia móvel ficam fora desta carga.
const units=doc.unidades.filter(x=>!/^SAMU SUPORTE |ODONTOLOGICA MOVEL/.test(x.nome)&&!x.nome.includes('ODONTOLOGICA MOVEL'));
if(units.length!==61)throw Error('Conjunto de estruturas fixas divergente.');
const rows=units.map(x=>({id:'cnes-'+x.codigo_cnes,municipioId:'maringa',nome:x.nome,tipo:x.tipo,codigo_cnes:x.codigo_cnes,externalId:'cnes:'+x.codigo_cnes,categoria:x.grupo==='emergencias'?'Emergência':'Saúde',fonte:doc.fonte,url_fonte:doc.url_fonte,verificacao:'Validado',atualizado_em:'2026-11-06',servicos:'Identidade e código confirmados no CNES. Endereço, telefone, coordenadas e disponibilidade operacional não foram confirmados nesta carga.'}));
const literal=JSON.stringify(rows).replaceAll("'","''");
const sql=`-- Fonte oficial CNES conferida em 06/11/2026. Somente 61 estruturas fixas.\n-- Não inclui pessoas, casos, veículos, dados demonstrativos ou coordenadas estimadas.\nbegin;\ninsert into public.ma_cadastros(municipio_id,colecao,id,dados)\nselect 'maringa','instituicoes',item->>'id',item from jsonb_array_elements('${literal}'::jsonb) item\non conflict (municipio_id,colecao,id) do nothing;\ncommit;\nselect colecao,count(*) from public.ma_cadastros group by colecao;\n`;
writeFileSync(resolve(root,'supabase/seeds/estruturas-confirmadas.sql'),sql);
console.log('Geradas '+rows.length+' estruturas fixas; sem envio ao banco.');
