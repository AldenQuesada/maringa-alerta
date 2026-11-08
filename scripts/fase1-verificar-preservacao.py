#!/usr/bin/env python3
"""Compara dados anteriores com um manifesto privado; somente consultas READ ONLY.

PSQL seleciona um executável psql (ou wrapper para um contêiner isolado).
PGSERVICE/PGSERVICEFILE/PGPASSFILE podem fornecer a conexão, sem senha em argumentos.
Não imprime conteúdo de registros, apenas contagens e hashes agregados.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--manifesto', required=True, type=Path)
parser.add_argument('--saida', required=True, type=Path)
args = parser.parse_args()
psql = os.getenv('PSQL', 'psql')
def sql(query):
    r = subprocess.run([psql, '-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1'], input='begin read only;\n'+query+'\ncommit;', text=True, capture_output=True)
    if r.returncode:
        raise RuntimeError('Falha ao consultar a evidência; nenhuma escrita foi executada.')
    return r.stdout.strip()
manifest = json.loads(args.manifesto.read_text())
checked = []
for t in manifest:
    if t['schema'] not in ('public', 'private', 'wa'):
        continue
    relation = '"'+t['schema'].replace('"','""')+'"."'+t['table'].replace('"','""')+'"'
    value = 'to_jsonb(t)'
    predicate = ''
    if relation == '"public"."ma_configuracao"':
        value = "case when id='contratos' then jsonb_set(jsonb_set(to_jsonb(t),'{documento}',documento-'unidades'-'servicos'-'recursos'),'{versao}',to_jsonb(versao-1)) else to_jsonb(t) end"
    elif relation == '"private"."ma_permissoes"':
        predicate = " where colecao not in ('unidades','servicos','recursos')"
    data = sql('copy (select md5(('+value+')::text) from '+relation+' t'+predicate+' order by 1) to stdout;')
    rows = data.splitlines() if data else []
    digest = hashlib.sha256(('\n'.join(rows)+'\n' if rows else '').encode()).hexdigest()
    assert len(rows) == t['rows'] and digest == t['sha256_sorted_row_md5'], 'Conteúdo anterior divergente: '+relation
    checked.append(dict(t, preserved=True))
state = json.loads(sql("""select jsonb_build_object(
 'categorias',(select count(*) from territorio.categorias),
 'tipos',(select count(*) from territorio.tipos),
 'projetados',(select count(*) from territorio.entidades),
 'dominios',(select jsonb_object_agg(dominio,n) from (select dominio,count(*) n from territorio.entidades group by 1) d),
 'pontos',(select count(*) from territorio.entidades where ponto is not null),
 'areas',(select count(*) from territorio.entidades where area is not null),
 'novos_cadastros',(select count(*) from public.ma_cadastros where colecao in ('unidades','servicos','recursos')),
 'novas_permissoes',(select count(*) from private.ma_permissoes where colecao in ('unidades','servicos','recursos')),
 'contratos',(select documento ?& array['unidades','servicos','recursos'] from public.ma_configuracao where id='contratos'),
 'rls',(select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='territorio' and c.relkind='r'),
 'indices_validos',(select bool_and(i.indisvalid) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='territorio'),
 'public_definer',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ma_%' and p.prosecdef),
 'postgis',(select extversion from pg_extension where extname='postgis'),
 'migration_count',(select count(*) from supabase_migrations.schema_migrations)
);"""))
assert state['categorias'] == 12 and state['tipos'] == 70 and state['novos_cadastros'] == 0
assert state['novas_permissoes'] == 9 and state['contratos'] and state['rls'] and state['indices_validos'] and state['public_definer'] == 0
report = dict(status='passed', tables_checked=len(checked), tables=checked, territory=state,
              expected_changes=['Três contratos adicionados e versão do documento incrementada em um', 'Nove permissões para as três novas coleções'],
              no_legacy_record_rewrite=True, no_production_fixtures=True)
args.saida.parent.mkdir(parents=True, exist_ok=True)
args.saida.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(f'PASS: {len(checked)} tabelas próprias com conteúdo anterior preservado; '+json.dumps(state,ensure_ascii=False))
