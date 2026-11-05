'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ler}=require('../operacao-restauracao');
const key='operacao',municipio='maringa';
function store(value){let writes=0;return {getItem:()=>value,setItem:()=>{writes++},writes:()=>writes};}
function estado(){return {versao:1,tenantId:municipio,ocorrencias:[{id:'oc1',status:'ativa',pos:[-23.4,-51.9]}],voluntarios:[{id:'v1',bairro:'Bairro cadastrado fora da demonstração',pos:[-23.4,-51.9]}]};}
test('um bairro fora da lista de simulação não impede recuperar dados',()=>{const raw=JSON.stringify(estado()),s=store(raw),r=ler(s,key,municipio);assert.equal(r.estado,'restauravel');assert.equal(r.dados.voluntarios[0].bairro,'Bairro cadastrado fora da demonstração');assert.equal(r.original,raw);assert.equal(s.writes(),0);});
test('dados corrompidos ou de outra versão são bloqueados sem apagar o original',()=>{for(const raw of ['{', 'null',JSON.stringify({...estado(),versao:2}),JSON.stringify({...estado(),tenantId:'outra'}),JSON.stringify({...estado(),voluntarios:[{pos:null}]})]){const s=store(raw),r=ler(s,key,municipio);assert.equal(r.estado,'bloqueado');assert.equal(r.original,raw);assert.equal(s.writes(),0);}});
test('armazenamento ausente é distinto de falha de acesso',()=>{assert.equal(ler(store(null),key,municipio).estado,'vazio');assert.equal(ler({getItem(){throw Error('indisponível')}},key,municipio).estado,'bloqueado');});
