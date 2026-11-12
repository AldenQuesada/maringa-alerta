'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function carregar(){const ctx=vm.createContext({});for(const f of ['perfil','textos','geometria','consultas'])vm.runInContext(fs.readFileSync('src/monitoramento-animal/'+f+'.js','utf8'),ctx);return ctx;}
const sql=fs.readFileSync('supabase/migrations/20261108194500_monitoramento_animal.sql','utf8');
const bloco=i=>{const a=sql.indexOf('$j$',sql.indexOf(i))+3;return JSON.parse(sql.slice(a,sql.indexOf('$j$',a)));};
const sqlD=fs.readFileSync('supabase/migrations/20261110120000_monitoramento_animal_triagem.sql','utf8');
const blocoD=i=>{const a=sqlD.indexOf('$j$',sqlD.indexOf(i))+3;return JSON.parse(sqlD.slice(a,sqlD.indexOf('$j$',a)));};
// Perfil e regras como ficam no banco depois das etapas A e D.
const sqlA=fs.readFileSync('supabase/migrations/20261111190000_protecao_animal_lugares_acoes.sql','utf8');
const blocoA=i=>{const a=sqlA.indexOf('$j$',sqlA.indexOf(i))+3;return JSON.parse(sqlA.slice(a,sqlA.indexOf('$j$',a)));};
// Perfil como fica no banco depois das etapas A, D e da camada de ações.
const perfilAD={...bloco("values('mapas'")['monitoramento-animal'],...blocoD("'{monitoramento-animal}'")};
// Revisão por IA: relatório na ficha do relato e sugestão no formulário do alerta.
const sqlRev=fs.readFileSync('supabase/migrations/20261111230000_revisao_ia.sql','utf8');
const blocoRev=i=>{const a=sqlRev.indexOf('$j$',sqlRev.indexOf(i))+3;return JSON.parse(sqlRev.slice(a,sqlRev.indexOf('$j$',a)));};
const sugestaoIA=JSON.parse(sqlRev.match(/\{monitoramento-animal,textos,envio,sugestaoIA\}','("[^']+")'/)[1]);
// Perfil como fica no banco depois das etapas E2 a E4 (alerta do bairro na ficha).
const sqlEnv=fs.readFileSync('supabase/migrations/20261111220000_alertas_envio.sql','utf8');
const blocoEnv=i=>{const a=sqlEnv.indexOf('$j$',sqlEnv.indexOf(i))+3;return JSON.parse(sqlEnv.slice(a,sqlEnv.indexOf('$j$',a)));};
const perfil={...perfilAD,camadas:[...perfilAD.camadas,...blocoA("'{monitoramento-animal,camadas}'")],
 textos:{...perfilAD.textos,acao:blocoA("'{monitoramento-animal,textos,acao}'"),envio:{...blocoEnv("'{monitoramento-animal,textos,envio}'"),sugestaoIA},revisao:blocoRev("'{monitoramento-animal,textos,revisao}'")}};
const regras={...bloco("'{protecaoAnimal}'"),triagem:blocoD("'{protecaoAnimal,triagem}'")},modelo=bloco("values('modelos'")['protecao-animal'];
test('perfil do banco é válido e perfil ausente ou incompleto é recusado',()=>{
 const c=carregar();
 assert.equal(c.AlertaAnimalPerfil.validar(perfil,regras).perfil.camera,'ajuda');
 const sqlE=fs.readFileSync('supabase/migrations/20261111170000_monitoramento_animal_enquadramento.sql','utf8');
 const enquadramento=JSON.parse(sqlE.match(/\{monitoramento-animal,enquadramento\}','(\[[^']+\])'/)[1]);
 assert.deepEqual(JSON.parse(JSON.stringify(c.AlertaAnimalPerfil.validar({...perfil,enquadramento},regras).perfil.enquadramento)),enquadramento);
 for(const ruim of [[],[[1,2]],[[-23.3,-52],[-23.4,-51.8]],[[-23.4,-51.8],[-23.3,-52]],[['a',1],[2,3]]])
  assert.throws(()=>c.AlertaAnimalPerfil.validar({...perfil,enquadramento:ruim},regras),/enquadramento inválido/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar(undefined,regras),/não está configurado/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar({...perfil,camadas:[]},regras),/sem camadas/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar(perfil,undefined),/protecaoAnimal/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar({...perfil,textos:undefined},regras),/falta textos/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar({...perfil,cores:{contornoZona:'amarelo',destaqueRestrito:'#fff'}},regras),/contornoZona/);
});
test('textos: interpolação, e texto ausente é erro e não reserva',()=>{
 const {t}=carregar().AlertaAnimalTextos.criar(perfil.textos);
 assert.equal(t('lista.semPosicao',{n:3}),'3 sem posição');
 assert.throws(()=>t('lista.inexistente'),/Texto ausente no perfil do mapa: lista.inexistente/);
 assert.throws(()=>carregar().AlertaAnimalTextos.criar(undefined),/falta textos/);
});
test('toda chave de texto usada na página e no código existe no perfil do banco',()=>{
 const {t}=carregar().AlertaAnimalTextos.criar(perfil.textos);
 const html=fs.readFileSync('mapas/monitoramento-animal.html','utf8');
 const chaves=new Set([...html.matchAll(/data-texto(?:-[a-z-]+)?="([^"]+)"/g)].map(m=>m[1]));
 for(const f of fs.readdirSync('src/monitoramento-animal'))
  for(const m of fs.readFileSync('src/monitoramento-animal/'+f,'utf8').matchAll(/\bt\("([a-zA-Z.]*[a-zA-Z])"/g))chaves.add(m[1]);
 // A ficha monta a chave como "ficha."+campo: confere cada campo usado em linha("campo",...).
 for(const m of fs.readFileSync('src/monitoramento-animal/ficha.js','utf8').matchAll(/linha\("([a-zA-Z]+)"/g))chaves.add('ficha.'+m[1]);
 assert.ok(chaves.size>40,'chaves encontradas: '+chaves.size);
 for(const k of chaves)assert.doesNotThrow(()=>t(k),k);
});
test('ações de triagem: cada exigência é conhecida e todo destino é um estado do contrato',()=>{
 const estados={relatos:['Em triagem','Vinculado','Confirmado','Arquivado'],incidentes:['Em triagem','Confirmada','Resolvida','Arquivada']};
 for(const [colecao,acoes] of Object.entries(regras.triagem.acoes))for(const a of acoes){
  assert.ok(estados[colecao].includes(a.para),a.id);
  for(const d of a.de)assert.ok(estados[colecao].includes(d),a.id);
  for(const e of a.exige||[])assert.ok(['bairro_id','motivo','desfecho'].includes(e),e);
 }
});
test('ponto em polígono respeita buracos e multipolígonos',()=>{
 const {contem}=carregar().AlertaAnimalGeometria;
 const q=(x,y,s)=>[[x,y],[x+s,y],[x+s,y+s],[x,y+s],[x,y]];
 assert.equal(contem({type:'Polygon',coordinates:[q(0,0,10)]},5,5),true);
 assert.equal(contem({type:'Polygon',coordinates:[q(0,0,10),q(4,4,2)]},5,5),false);
 assert.equal(contem({type:'MultiPolygon',coordinates:[[q(0,0,1)],[q(20,20,5)]]},22,22),true);
 assert.equal(contem({type:'Polygon',coordinates:[q(0,0,10)]},'x',5),false);
});
test('consultas: só relatos e ocorrências da categoria animal; encerradas ocultas por padrão',()=>{
 const c=carregar();
 const dados={ocorrencias:[...modelo.tipos,{id:'outro',nome:'Queda de árvore'}],
  relatos:[{id:'r1',categoria:'animal',status:'Em triagem',situacao:'Perdi meu animal'},{id:'r2',status:'Em triagem'},{id:'r3',categoria:'animal',status:'Vinculado',situacao:'Perdi meu animal'}],
  incidentes:[{id:'i1',tipo_id:'animal-ferido',status:'Confirmada'},{id:'i2',tipo_id:'animal-ferido',status:'Resolvida'},{id:'i3',tipo_id:'outro',status:'Confirmada'}]};
 const normal=x=>String(x??'').toLowerCase();
 const q=c.AlertaAnimalConsultas.criar({db:{lista:m=>dados[m]||[]},perfil,regras,normal});
 assert.deepEqual(q.relatos().map(x=>x.id),['r1']);
 assert.equal(q.relatos()[0].tipo.id,'animal-perdido');
 assert.deepEqual(q.incidentes().map(x=>x.id),['i1','i2']);
 // Ações: só as agendadas, de hoje em diante; realizadas, canceladas e passadas ficam fora.
 dados.acoes=[{id:'a1',nome:'Feira',tipo:'Feira de adoção',status:'Agendada',data:'2026-11-15'},{id:'a2',status:'Agendada',data:'2026-11-10'},
  {id:'a3',status:'Cancelada',data:'2026-11-20'},{id:'a4',status:'Agendada',data:'2026-11-11'}];
 assert.deepEqual(q.acoes('2026-11-11').map(x=>x.id),['a1','a4']);
 assert.equal(q.acoes('2026-11-11')[0].tipoAcao,'Feira de adoção');assert.equal(q.acoes('2026-11-11')[0].origemCamada,'acoes');
 const base={zona:'',situacao:'',busca:'',zonaDe:()=>''};
 assert.deepEqual(q.filtrar(q.incidentes(),{...base,mostrarEncerradas:false}).map(x=>x.id),['i1']);
 assert.deepEqual(q.filtrar(q.incidentes(),{...base,mostrarEncerradas:true}).map(x=>x.id),['i1','i2']);
 assert.deepEqual(q.filtrar([...q.relatos(),...q.incidentes()],{...base,situacao:'animal-perdido'}).map(x=>x.id),['r1']);
});
test('situações do fluxo do WhatsApp são as mesmas dos tipos do modelo',()=>{
 const wa=fs.readFileSync('supabase/migrations/20261108201500_whatsapp_fluxo_animal.sql','utf8');
 for(const t of modelo.tipos)assert.ok(wa.includes('"value":"'+t.situacao_whatsapp+'"'),t.situacao_whatsapp);
});
