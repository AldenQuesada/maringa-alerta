"""Cascata x worker, exclusivamente em PostgreSQL descartável; não chama a Meta."""
import os
import subprocess
import time

if os.environ.get('MARINGA_TESTE_DESCARTAVEL') != '1':
    raise SystemExit('Requer banco descartável explícito')
cmd = [os.environ.get('PSQL', 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
def sql(query):
    return subprocess.run(cmd + ['-c', query], text=True, capture_output=True, timeout=15)
def success(query):
    r = sql(query)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()
def transaction(query):
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    p.stdin.write("begin; set local statement_timeout='10s'; " + query + "; select 'READY';\n")
    p.stdin.flush()
    while True:
        line = p.stdout.readline()
        if line.strip() == 'READY':
            return p
        assert line, p.stderr.read()
def commit(p):
    out, err = p.communicate('commit;\n', timeout=15)
    assert p.returncode == 0, err

user = '00000000-0000-4000-8000-000000000096'
success(f"insert into auth.users(id,email) values('{user}','purge-race@example.invalid'); insert into public.ma_vinculos values('maringa','{user}','admin'); update wa.channels set enabled=true,outbound_enabled=true;")
success("select public.ma_wa_receber(phone_number_id,jsonb_build_array(jsonb_build_object('type','message','id','purge.race','from','550000009999','timestamp',extract(epoch from now())::bigint::text,'text','oi'))) from wa.channels; select public.ma_wa_processar(id) from wa.inbox where provider_id='purge.race';")
sid = success("select id from wa.sessions where contact='550000009999'")
auth = f"select set_config('request.jwt.claim.sub','{user}',true)"
erase = f"select public.ma_contato_excluir('maringa','s:{sid}','delete-v1:'||(public.ma_contato_detalhe('maringa','s:{sid}')->'contact'->>'revision'))"
# A reserva ainda não está visível, mas segura a linha. A exclusão deve aguardar
# e reavaliar o estado sending após o COMMIT, em vez de apagar a mensagem em voo.
sender = transaction('select public.ma_wa_reservar()')
eraser = subprocess.Popen(cmd + ['-c', f"begin; set local statement_timeout='10s'; set local application_name='ma_purge_race'; {auth}; {erase}; commit;"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if success("select exists(select 1 from pg_stat_activity where application_name='ma_purge_race' and wait_event_type='Lock')") == 't':
            break
        time.sleep(0.05)
    else:
        raise AssertionError('Exclusão não aguardou a reserva concorrente')
    commit(sender)
    out, err = eraser.communicate(timeout=15)
    assert eraser.returncode != 0 and 'envio' in err.lower(), (out, err)
    assert success(f"select count(*) from wa.sessions where id='{sid}'") == '1'
    success("select public.ma_wa_resultado(id,lease,'sent','purge.race.sent') from wa.outbox where state='sending'")
    # No sentido inverso, a exclusão mantém os locks até o COMMIT e o worker
    # não consegue reservar nada desse contato enquanto a cascata está aberta.
    deletion = transaction(auth + '; ' + erase)
    assert success('select public.ma_wa_reservar() is null') == 't'
    commit(deletion)
    assert success(f"select count(*) from wa.sessions where id='{sid}'") == '0'
finally:
    if sender.poll() is None:
        sender.kill()
    if eraser.poll() is None:
        eraser.kill()
success("delete from wa.deleted_receipts where event_hash=encode(sha256(convert_to('purge.race','UTF8')),'hex')")
success(f"delete from wa.operations where actor='{user}'; delete from public.ma_vinculos where user_id='{user}'; delete from auth.users where id='{user}';")
print('Exclusão concorrente: envio em andamento preservado; nenhuma reserva depois da cascata.')
