"""Ensaio local descartável de páginas, contexto e planos; nunca usa dados remotos."""
import os,subprocess,json,time
from pathlib import Path
if os.getenv('MARINGA_TESTE_DESCARTAVEL')!='1' or not os.getenv('PGDATABASE','').startswith('teste_'):
 raise SystemExit('Exige banco descartável teste_ autorizado.')
psql=[os.getenv('PSQL','psql'),'-X','-qAt','-v','ON_ERROR_STOP=1']
reports=[]
for n in (1000,10000,100000):
 sql=f"""begin;
 insert into auth.users(id,email) values('e3100000-0000-4000-8000-000000000001','volume-e3@example.invalid');
 insert into public.ma_vinculos(municipio_id,user_id,papel) values('maringa','e3100000-0000-4000-8000-000000000001','admin');
 -- Preparação sintética de leitura; não mede ingestão. Constraints permanecem ativas.
 -- Os guards são exercitados pelas suítes funcionais; voltam antes das consultas.
 alter table public.ma_cadastros disable trigger user;
 insert into public.ma_cadastros(municipio_id,colecao,id,dados)
 select 'maringa','usuarios','vol-e3-'||lpad(n::text,7,'0'),jsonb_build_object('id','vol-e3-'||lpad(n::text,7,'0'),'municipioId','maringa','nome','Volume E3 pessoa '||n,'funcao','operador','email','vol-e3-'||n||'@example.invalid','telefone','44999999999','endereco','Endereço de ensaio','bairro','Centro','cargo','Operação','horarios','[]'::jsonb,'documento',repeat('x',100),'observacao',repeat('x',1000)) from generate_series(1,{n}) n;
 alter table public.ma_cadastros enable trigger user;
 analyze public.ma_cadastros;
 select set_config('request.jwt.claim.sub','e3100000-0000-4000-8000-000000000001',true);
 set local role authenticated;
 do $$declare p jsonb;t timestamptz; amostras jsonb:='[]';begin
  for i in 1..21 loop
   t:=clock_timestamp();p:=public.ma_colaboradores_pagina('maringa','Volume E3',null,30);
   if i>1 then amostras:=amostras||to_jsonb(extract(epoch from clock_timestamp()-t)*1000);end if;
  end loop;
  if jsonb_array_length(p->'itens')<>30 or octet_length(p::text)>300000 then raise exception 'Página fora do orçamento';end if;
  raise notice 'E3_RESULTADO:%',jsonb_build_object('dataset',{n},'itens',jsonb_array_length(p->'itens'),'bytes',octet_length(p::text),'contexto_bytes',octet_length(public.ma_colaboradores_contexto('maringa')::text),'tem_proxima',p->>'proxima' is not null,'latencias_ms',amostras);
 end$$;
 reset role;
 explain (analyze,buffers,format json) select id,versao,dados from public.ma_cadastros where municipio_id='maringa' and colecao='usuarios' and arquivado_em is null and id>'vol-e3-0000900' order by id limit 31;
 explain (analyze,buffers,format json) select id,versao,dados from public.ma_cadastros where municipio_id='maringa' and colecao='usuarios' and arquivado_em is null and to_tsvector('simple'::regconfig,coalesce(dados->>'nome','')||' '||coalesce(dados->>'identificacao','')||' '||coalesce(dados->>'email','')||' '||coalesce(dados->>'bairro','')) @@ to_tsquery('simple','999:*') order by id limit 31;
 rollback;"""
 started=time.monotonic();p=subprocess.run(psql,input=sql,text=True,capture_output=True)
 if p.returncode:raise SystemExit(p.stderr)
 line=next(x for x in p.stderr.splitlines() if 'E3_RESULTADO:' in x)
 report=json.loads(line.split('E3_RESULTADO:',1)[1]);samples=sorted(report['latencias_ms']);report['p50_ms']=samples[9];report['p95_ms']=samples[18];report['ensaio_segundos']=round(time.monotonic()-started,2)
 report['planos']=p.stdout.split('\n',1)[1].strip();reports.append(report)
 print(json.dumps({k:v for k,v in report.items() if k not in ('planos','latencias_ms')},ensure_ascii=False),flush=True)
Path('/tmp/e3-volume.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
