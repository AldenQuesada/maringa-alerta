"""Compare canonical simulator snapshots with PostgreSQL. Disposable DB only."""
import json,os,pathlib,subprocess
assert os.getenv('MARINGA_TESTE_DESCARTAVEL')=='1','Disposable database required'
fixture=json.loads(pathlib.Path(__file__).with_name('canonical-fixture.json').read_text())
states=[]
for c in fixture['cases']:
 state=json.loads(json.dumps(c['state']))
 if c['key']=='colaborador/nome':state['answers'].pop('nome',None)
 if 'foto' in state['answers']:state['answers']['foto']={'path':'exemplo/foto.jpg'}
 states.append({'key':c['key'],'state':state})
value=json.dumps(states,ensure_ascii=False).replace("'","''")
query="""select jsonb_agg(jsonb_build_object('key',x->>'key','result',wa.render(jsonb_populate_record(null::wa.sessions,(x->'state')||jsonb_build_object('id','00000000-0000-4000-8000-000000000000','channel_id',c.id,'version_id',v.id,'revision',0,'cycle','00000000-0000-4000-8000-000000000001','simulation',false))))) from wa.channels c join wa.versions v on v.name='municipal-v2-canonico' cross join jsonb_array_elements('"""+value+"'::jsonb) x where c.phone_number_id='1277929198738053';"
result=json.loads(subprocess.check_output(['psql','-X','-Atq','-v','ON_ERROR_STOP=1'],input=query,text=True))
for c in fixture['cases']:
 actual=next(r['result'] for r in result if r['key']==c['key'])
 expected='\n\n'.join(m['text'] for m in c['canonical']['messages'])
 # Only explicit simulator-to-production adaptations. Editorial content stays literal.
 expected=expected.replace('COL-SIM-1234567','00000000-0000-4000-8000-000000000001').replace('Protocolo de demonstração: OCO-SIM-1234567','Protocolo: 00000000-0000-4000-8000-000000000001').replace(' Nenhuma mensagem real foi enviada.','')
 assert actual['text']==expected,c['key']+' text mismatch'
 assert [b['full_label'] for b in actual['buttons']]==c['canonical']['buttons'],c['key']+' button mismatch'
 canon_images=[m['image'] for m in c['canonical']['messages'] if m['image']]
 actual_images=[m['image'] for m in actual['messages'] if m.get('image')]
 assert len(canon_images)==len(actual_images),c['key']+' image mismatch'
 if canon_images:assert actual_images[0]['caption']==canon_images[0]['titulo']
print(f"{len(result)} canonical cases: copy, buttons, image and production adaptations OK")
