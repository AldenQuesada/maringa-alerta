'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function carregar(){const ctx=vm.createContext({});for(const f of ['perfil','geometria','consultas'])vm.runInContext(fs.readFileSync('src/monitoramento-animal/'+f+'.js','utf8'),ctx);return ctx;}
const sql=fs.readFileSync('supabase/migrations/20261108194500_monitoramento_animal.sql','utf8');
const bloco=i=>{const a=sql.indexOf('$j$',sql.indexOf(i))+3;return JSON.parse(sql.slice(a,sql.indexOf('$j$',a)));};
const perfil=bloco("values('mapas'")['monitoramento-animal'],regras=bloco("'{protecaoAnimal}'"),modelo=bloco("values('modelos'")['protecao-animal'];
test('perfil do banco é válido e perfil ausente ou incompleto é recusado',()=>{
 const c=carregar();
 assert.equal(c.AlertaAnimalPerfil.validar(perfil,regras).perfil.camera,'ajuda');
 assert.throws(()=>c.AlertaAnimalPerfil.validar(undefined,regras),/não está configurado/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar({...perfil,camadas:[]},regras),/sem camadas/);
 assert.throws(()=>c.AlertaAnimalPerfil.validar(perfil,undefined),/protecaoAnimal/);
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
 const base={zona:'',situacao:'',busca:'',zonaDe:()=>''};
 assert.deepEqual(q.filtrar(q.incidentes(),{...base,mostrarEncerradas:false}).map(x=>x.id),['i1']);
 assert.deepEqual(q.filtrar(q.incidentes(),{...base,mostrarEncerradas:true}).map(x=>x.id),['i1','i2']);
 assert.deepEqual(q.filtrar([...q.relatos(),...q.incidentes()],{...base,situacao:'animal-perdido'}).map(x=>x.id),['r1']);
});
test('situações do fluxo do WhatsApp são as mesmas dos tipos do modelo',()=>{
 const wa=fs.readFileSync('supabase/migrations/20261108201500_whatsapp_fluxo_animal.sql','utf8');
 for(const t of modelo.tipos)assert.ok(wa.includes('"value":"'+t.situacao_whatsapp+'"'),t.situacao_whatsapp);
});
