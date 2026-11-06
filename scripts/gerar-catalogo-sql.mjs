/** Gera somente o bloco de referência IBGE da migração; nunca conecta ao banco. */
import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('../dados-territoriais/catalogo-ibge.json',import.meta.url);
const target=new URL('../supabase/migrations/20261106231833_admin_catalogo_guards.sql',import.meta.url);
const catalog=JSON.parse(readFileSync(source,'utf8'));
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
if(catalog.ufs.length!==27||new Set(catalog.municipios.map(x=>x.codigo_ibge)).size!==catalog.municipios.length)throw Error('Catálogo inválido');
const sql='-- IBGE: '+catalog.fonte+' · consulta '+catalog.consultado_em+'\n'+
 'insert into public.ma_ufs(sigla,codigo,nome) values\n'+catalog.ufs.map(x=>'('+[x.sigla,x.codigo,x.nome].map(quote).join(',')+')').join(',\n')+';\n'+
 'insert into public.ma_municipios_ibge(codigo_ibge,uf,nome) values\n'+catalog.municipios.map(x=>'('+[x.codigo_ibge,x.uf,x.nome].map(quote).join(',')+')').join(',\n')+';';
const original=readFileSync(target,'utf8');
const next=original.replace(/-- CARGA_IBGE_GERADA[\s\S]*?(?=\n\nalter table public.ma_prefeituras)/,'-- CARGA_IBGE_GERADA\n'+sql);
if(process.argv.includes('--check')){if(next!==original)throw Error('Catálogo SQL desatualizado');}
else writeFileSync(target,next);
console.log(catalog.municipios.length+' municípios oficiais conferidos');
