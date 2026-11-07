import pathlib,json,re
# Gera somente SQL: não conecta nem aplica alterações. Pré-condição: esquema de 06/11/2026.
root=pathlib.Path(__file__).resolve().parents[1]
files=[f for f in sorted((root/'supabase/migrations').glob('*.sql')) if '20261106232331' <= f.name[:14] <= '20261107013933']
parts=[]
for f in files:
 s=f.read_text()
 s=re.sub(r'(?m)^(begin;|commit;)\s*$', '',s)
 if f.name=='20261106233100_escrita_controlada.sql':
  s=s.replace('create function private.ma_gravar_prefeitura','create or replace function private.ma_gravar_prefeitura').replace('create function private.ma_gravar_cadastro','create or replace function private.ma_gravar_cadastro')
 if f.name=='20261106233717_indice_prefeitura_ibge_uf.sql':s=s.replace('create index ma_prefeituras_ibge_uf','create index if not exists ma_prefeituras_ibge_uf')
 s=s.replace('create role ma_escritor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;', 'create role ma_escritor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;\ngrant ma_escritor to current_user;')
 parts.append('-- '+f.name+'\n'+s)
sql='begin;\n'+'\n'.join(parts)+'\ndrop function if exists private.ma_aplicar_lote(jsonb);\nrevoke ma_escritor from current_user;\ncommit;\n'
pathlib.Path('/tmp/maringa-upgrade.sql').write_text(sql)
pathlib.Path('/tmp/maringa-upgrade-payload.json').write_text(json.dumps({'name':'integracao_seguranca_operacoes_ocorrencias','query':sql}))
