"""Executar somente com MARINGA_TESTE_DESCARTAVEL=1 em PostgreSQL efêmero."""
import concurrent.futures
import json
import os
import subprocess
import threading

if os.environ.get('MARINGA_TESTE_DESCARTAVEL') != '1':
    raise SystemExit('Requer banco descartável explícito')
psql = os.environ.get('PSQL', 'psql')
def sql(query):
    return subprocess.run([psql, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, capture_output=True)
def success(query):
    result = sql(query)
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()
user = '00000000-0000-4000-8000-000000000031'
success(f"insert into auth.users(id,email,email_confirmed_at) values('{user}','concorrencia@invalid.example',now()); insert into public.ma_vinculos values('maringa','{user}','admin'); insert into public.ma_cadastros(municipio_id,colecao,id,dados) values('maringa','estoques','concorrencia-local','{{\"id\":\"concorrencia-local\",\"municipioId\":\"maringa\",\"nome\":\"Fixture local\",\"quantidade\":10}}');")
barrier = threading.Barrier(2)
def save(value):
    payload = json.dumps([{'operacao':'atualizar','colecao':'estoques','municipio_id':'maringa','id':'concorrencia-local','versao':1,'dados':{'id':'concorrencia-local','municipioId':'maringa','nome':'Fixture local','quantidade':value}}])
    barrier.wait()
    return sql(f"begin; set local role authenticated; select set_config('request.jwt.claim.sub','{user}',true); select public.ma_aplicar_alteracoes('{payload}'); commit;")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    results = list(executor.map(save, [8,7]))
assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
assert 'outra sessão' in next(r.stderr for r in results if r.returncode), [r.stderr for r in results]
assert success("select versao from public.ma_cadastros where id='concorrencia-local'") == '2'
success("insert into public.ma_cadastros(municipio_id,colecao,id,dados) select 'maringa','eventos',i,jsonb_build_object('id',i,'municipioId','maringa','nome','Fixture local','tipo','Verificação') from unnest(array['ciclo-a','ciclo-b']) i;")
def connect(pair):
    origin, destination = pair
    payload = json.dumps([{'operacao':'atualizar','colecao':'eventos','municipio_id':'maringa','id':origin,'versao':1,'dados':{'id':origin,'municipioId':'maringa','nome':'Fixture local','tipo':'Verificação','mapa_evento_id':destination}}])
    barrier.wait()
    return sql(f"begin; set local role authenticated; select set_config('request.jwt.claim.sub','{user}',true); select public.ma_aplicar_alteracoes('{payload}'); commit;")
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    cycles = list(executor.map(connect, [('ciclo-a','ciclo-b'),('ciclo-b','ciclo-a')]))
assert sum(r.returncode == 0 for r in cycles) == 1, [r.stderr for r in cycles]
assert 'circular' in next(r.stderr for r in cycles if r.returncode), [r.stderr for r in cycles]
success("delete from private.ma_referencias where id in ('ciclo-a','ciclo-b'); delete from public.ma_cadastros where id in ('ciclo-a','ciclo-b');")
print('Concorrência de relações: ciclo entre duas sessões rejeitado.')
success(f"delete from public.ma_cadastros where id='concorrencia-local'; delete from public.ma_vinculos where user_id='{user}'; delete from auth.users where id='{user}';")
print('Concorrência: uma gravação confirmada, conflito rejeitado, versão final 2.')
