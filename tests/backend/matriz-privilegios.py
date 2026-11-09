"""Verifica a matriz efetiva em leitura; captura explícita só para revisar uma nova versão."""
from pathlib import Path
import subprocess,json,sys,os
query="""begin read only;
with funcs as (
 select p.oid::regprocedure::text as nome,pg_get_userbyid(p.proowner) as dono,p.prosecdef as definer,
 (select coalesce(jsonb_agg(r order by r),'[]') from unnest(array['anon','authenticated','service_role','ma_escritor','ma_gestor_acessos']) r where has_function_privilege(r,p.oid,'EXECUTE')) as executar
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','wa','territorio') or (n.nspname='public' and p.proname like 'ma_%')
),rels as (
 select c.oid::regclass::text as nome,pg_get_userbyid(c.relowner) as dono,c.relrowsecurity as rls,
 (select coalesce(jsonb_object_agg(r,permissoes),'{}') from (select r,(select coalesce(jsonb_agg(p order by p),'[]') from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p where has_table_privilege(r,c.oid,p)) permissoes from unnest(array['anon','authenticated','service_role','ma_escritor','ma_gestor_acessos']) r) x where permissoes<>'[]') as privilegios
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v') and (n.nspname in ('private','wa','territorio') or (n.nspname='public' and c.relname like 'ma_%'))
)
select jsonb_build_object('funcoes',(select jsonb_agg(to_jsonb(f) order by nome) from funcs f),'relacoes',(select jsonb_agg(to_jsonb(r) order by nome) from rels r));commit;"""
p=subprocess.run([os.getenv('PSQL','psql'),'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
if p.returncode:raise SystemExit(p.stderr)
actual=json.loads(p.stdout);canonical=Path(__file__).with_suffix('.json')
if '--capturar' in sys.argv:
 if os.getenv('MARINGA_TESTE_DESCARTAVEL')!='1':raise SystemExit('Captura exige ambiente descartável')
 canonical.write_text(json.dumps(actual,ensure_ascii=False,sort_keys=True,indent=1)+'\n')
 print('Matriz capturada para revisão; não é uma aprovação automática.');raise SystemExit(0)
expected=json.loads(canonical.read_text())
if actual!=expected:
 for section in actual:
  wanted={x['nome']:x for x in expected[section]};found={x['nome']:x for x in actual[section]}
  for name in sorted(wanted.keys()|found.keys()):
   if wanted.get(name)!=found.get(name):print(section,name,'esperado=',wanted.get(name),'obtido=',found.get(name))
 raise SystemExit('Matriz de privilégios divergente')
print('PASS: matriz efetiva exata; '+str(len(actual['funcoes']))+' funções e '+str(len(actual['relacoes']))+' relações.')
