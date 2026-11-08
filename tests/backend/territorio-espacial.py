"""Verifica o plano real da RPC sob RLS, somente no PostgreSQL descartável."""
import json
import os
import re
import subprocess

assert os.getenv('MARINGA_TESTE_DESCARTAVEL') == '1', 'Banco descartável obrigatório'
query = """
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000088','territorio-volume@invalid.example',now());
insert into public.ma_vinculos values('maringa','00000000-0000-4000-8000-000000000088','operador');
insert into public.ma_cadastros(municipio_id,colecao,id,dados)
 select 'maringa','unidades','volume-'||i,jsonb_build_object('id','volume-'||i,'municipioId','maringa','nome','Local de teste de volume','tipo_id','local_geral','lat',-23.42+(i%100)*0.01,'lng',-51.93+(i/100)*0.01) from generate_series(0,2999) i;
analyze territorio.entidades;
analyze public.ma_cadastros;
load 'auto_explain';
set local auto_explain.log_min_duration=0;
set local auto_explain.log_nested_statements=on;
set local auto_explain.log_format=json;
set local auto_explain.log_analyze=on;
set local client_min_messages=log;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000088',true);
select 'raio='||jsonb_array_length(public.ma_territorio_proximos('maringa',-23.42,-51.93,150));
rollback;
"""
r = subprocess.run([os.getenv('PSQL', 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], input=query, text=True, capture_output=True)
assert r.returncode == 0, r.stderr
assert 'raio=1' in r.stdout, r.stdout
plans = []
for match in re.finditer(r'plan:\s*(\{)', r.stderr):
    plans.append(json.JSONDecoder().raw_decode(r.stderr[match.start(1):])[0])
def walk(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for item in node:
            yield from walk(item)
used = [n for p in plans for n in walk(p) if n.get('Index Name') == 'entidades_ponto' and n.get('Actual Loops', 0) > 0 and n.get('Actual Rows', 0) > 0]
assert used, 'A RPC não usou o índice espacial para encontrar o ponto autorizado'
print('PASS: RPC sob RLS, 3.000 pontos, 1 resultado correto e GiST executado; fixtures revertidas.')
