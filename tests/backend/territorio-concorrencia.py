"""Concorrência de catálogo e relações, exclusivamente em banco descartável."""
import concurrent.futures
import json
import os
import subprocess
import threading

assert os.getenv('MARINGA_TESTE_DESCARTAVEL') == '1', 'Banco descartável obrigatório'
psql = os.getenv('PSQL', 'psql')
actor = '00000000-0000-4000-8000-000000000089'
def sql(q):
    return subprocess.run([psql, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], input=q, text=True, capture_output=True)
def success(q):
    r = sql(q)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()
def literal(value):
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"
def catalog(id, parent=None, version=0):
    data = dict(id=id, categoria_id='comunidade', dominio='local', nome='Tipo concorrente de teste', pai_id=parent)
    return "select public.ma_salvar_catalogo_territorial('tipo'," + literal(data) + ',' + str(version) + ');'
def record(collection, id, data, operation='inserir', version=1):
    item = dict(operacao=operation, colecao=collection, id=id, municipio_id='maringa', versao=version,
                dados=dict(data, id=id, municipioId='maringa'))
    return 'select public.ma_aplicar_alteracoes(' + literal([item]) + ');'
def auth(q):
    return "begin; set local role authenticated; select set_config('request.jwt.claim.sub','" + actor + "',true);" + q + 'commit;'
def race(queries):
    barrier = threading.Barrier(2)
    def execute(q):
        barrier.wait()
        return sql(auth(q))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(execute, queries))
    assert sum(r.returncode == 0 for r in results) == 1, [r.stderr for r in results]
    return next(r.stderr for r in results if r.returncode)

success("insert into auth.users(id,email,email_confirmed_at) values('" + actor + "','territorio-concorrencia@invalid.example',now());"
        "insert into private.ma_admins values('" + actor + "');insert into public.ma_vinculos values('maringa','" + actor + "','admin');")
try:
    success(auth(catalog('conc_tipo_a') + catalog('conc_tipo_b')))
    assert 'ciclos' in race([catalog('conc_tipo_a', 'conc_tipo_b', 1), catalog('conc_tipo_b', 'conc_tipo_a', 1)])
    success(auth(record('unidades', 'conc-unidade', dict(nome='Local concorrente', tipo_id='igreja'))))
    deletion = record('unidades', 'conc-unidade', {}, 'excluir')
    creation = record('servicos', 'conc-servico', dict(nome='Serviço concorrente', tipo_id='cozinha', unidade_colecao='unidades', unidade_id='conc-unidade'))
    assert 'foreign key' in race([deletion, creation])
    assert success("select (exists(select 1 from territorio.entidades where id='conc-unidade'))=(exists(select 1 from territorio.entidades where id='conc-servico'));") == 't'
    success(auth(record('recursos', 'conc-recurso', dict(nome='Recurso concorrente', tipo_id='freezer', quantidade_disponivel=2))))
    assert 'outra sessão' in race([record('recursos', 'conc-recurso', dict(nome='Recurso concorrente', tipo_id='freezer', quantidade_disponivel=n), 'atualizar') for n in (1, 0)])
    assert success("select c.versao=2 and e.versao=c.versao and e.quantidade=(c.dados->>'quantidade_disponivel')::numeric from public.ma_cadastros c join territorio.entidades e using(municipio_id,colecao,id) where c.id='conc-recurso';") == 't'
finally:
    success("begin;delete from public.ma_cadastros where municipio_id='maringa' and id in ('conc-servico','conc-recurso');"
            "delete from public.ma_cadastros where municipio_id='maringa' and id='conc-unidade';"
            "delete from territorio.tipos where id in ('conc_tipo_a','conc_tipo_b');"
            "delete from auth.users where id='" + actor + "';commit;")
print('PASS: ciclos concorrentes, exclusão contra novo vínculo e versão do recurso; nenhuma referência órfã.')
