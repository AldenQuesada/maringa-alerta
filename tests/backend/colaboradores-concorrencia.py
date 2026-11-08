"""Versão concorrente e envio idempotente. Exclusivamente em banco descartável."""
import concurrent.futures
import json
import os
import subprocess
import threading
assert os.getenv('MARINGA_TESTE_DESCARTAVEL') == '1'
psql=os.getenv('PSQL','psql')
actor='f2000000-0000-4000-8000-000000000091'
def sql(query):
 return subprocess.run([psql,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
def success(query):
 result=sql(query);assert result.returncode==0,result.stderr;return result.stdout.strip()
def auth(query):
 return "begin;set local role authenticated;select set_config('request.jwt.claim.sub','"+actor+"',true);"+query+'commit;'
def literal(data):return "'"+json.dumps(data).replace("'","''")+"'::jsonb"
def save(ficha,version):
 return "select public.ma_colaborador_salvar('maringa','fase2-concorrente',"+literal(ficha)+",'{\"papel\":\"leitor\",\"colecoes\":[\"eventos\"],\"situacao\":\"pendente\"}',"+str(version)+");"
def race(queries,expected,service=False):
 barrier=threading.Barrier(len(queries))
 def execute(query):barrier.wait();return sql(('begin;set local role service_role;'+query+'commit;') if service else auth(query))
 with concurrent.futures.ThreadPoolExecutor(max_workers=len(queries)) as pool: results=list(pool.map(execute,queries))
 assert sum(r.returncode==0 for r in results)==expected,[r.stderr for r in results]
 return results
success("insert into auth.users(id,email,email_confirmed_at) values('"+actor+"','fase2-concorrencia@example.invalid',now());insert into public.ma_vinculos values('maringa','"+actor+"','admin');")
try:
 success(auth(save(dict(nome='Concorrência local',email='fase2-concorrente@example.invalid',telefone='44999999999',endereco='Rua local',bairro='Centro',cargo='Apoio',funcao='operador',horarios=[]),'null')))
 results=race([save({'cargo':c},1) for c in ['Cargo A','Cargo B']],1)
 assert any('Atualize antes de salvar' in r.stderr for r in results)
 send="select public.ma_acesso_preparar('maringa','fase2-concorrente',2,'f2000000-0000-4000-8000-000000000092',repeat('c',64),'"+actor+"');"
 race([send,send],2,service=True)
 assert success("select count(*) from private.ma_acessos_envios where colaborador_id='fase2-concorrente';")=='1'
 assert success("select versao from public.ma_cadastros where municipio_id='maringa' and colecao='usuarios' and id='fase2-concorrente';")=='2'
finally:
 success("begin;delete from private.ma_acessos_envios where colaborador_id='fase2-concorrente';delete from private.ma_colaboradores_acesso where municipio_id='maringa' and id='fase2-concorrente';delete from public.ma_cadastros where municipio_id='maringa' and id='fase2-concorrente';delete from auth.users where id='"+actor+"';commit;")
print('PASS: edição concorrente recusada; dois envios simultâneos do mesmo comando geram um único registro.')
