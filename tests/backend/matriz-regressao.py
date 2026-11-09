"""Falhas deliberadas em ACL: o verificador precisa recusar cada regressão real."""
import os,subprocess
from pathlib import Path
assert os.getenv('MARINGA_TESTE_DESCARTAVEL')=='1' and os.getenv('PGDATABASE','').startswith('teste_')
psql=os.getenv('PSQL','psql')
def sql(q):
 p=subprocess.run([psql,'-X','-qAt','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True)
 assert p.returncode==0,p.stderr
check=['python3',str(Path(__file__).with_name('matriz-privilegios.py'))]
def verify():return subprocess.run(check,capture_output=True,text=True)
assert verify().returncode==0,'Baseline deve estar aprovado antes de injetar falhas'
cases=[
 ('escrita direta','grant insert on public.ma_cadastros to authenticated;','revoke insert on public.ma_cadastros from authenticated;'),
 ('execução anônima','grant execute on function public.ma_colaborador_salvar(text,text,jsonb,jsonb,bigint) to public;','revoke execute on function public.ma_colaborador_salvar(text,text,jsonb,jsonb,bigint) from public;'),
 ('associação ao executor','grant ma_gestor_acessos to authenticated;','revoke ma_gestor_acessos from authenticated;'),
 ('associação ao consultor','grant ma_consultor to authenticated;','revoke ma_consultor from authenticated;'),
 ('escrita pelo consultor','grant update on public.ma_cadastros to ma_consultor;','revoke update on public.ma_cadastros from ma_consultor;')]
for name,apply,undo in cases:
 try:
  sql(apply);assert verify().returncode!=0,'Regressão não detectada: '+name
 finally:sql(undo)
 assert verify().returncode==0,'Restauração da matriz falhou: '+name
 print('PASS: gate recusou '+name+'; matriz restaurada.')
