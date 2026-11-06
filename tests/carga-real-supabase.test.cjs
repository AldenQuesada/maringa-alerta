'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../mapas/inventario.js');
const bases=require('../dados-territoriais/maringa-apoios-conferidos.json').bases;
const cnes=require('../dados-territoriais/maringa-cnes-georreferencias.json').unidades;

test('carga real mostra 71 estruturas e mantém sete apoios pesquisáveis sem fabricar pontos',()=>{
 const itens=bases.map(b=>M.transformar('bases',b,new Map()));
 assert.equal(itens.length,17);
 assert.equal(itens.filter(x=>x.georreferenciado).length,10);
 assert.equal(cnes.length,61);
 assert.equal(new Set(cnes.map(x=>x.id)).size,61);
 for(const unidade of cnes){
  assert.ok(unidade.lat < -23 && unidade.lat > -24);
  assert.ok(unidade.lng < -51 && unidade.lng > -53);
  assert.ok(unidade.url_fonte.startsWith('https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/'));
 }
 const semPonto=itens.filter(x=>!x.georreferenciado);
 assert.equal(semPonto.length,7);
 for(const item of semPonto){
  assert.equal(item.lat,null);assert.equal(item.lng,null);
  assert.equal(M.filtrar(itens,{busca:item.nome}).length,1);
 }
 assert.equal(M.filtrar(itens,{busca:'CRAS'}).length,12);
 assert.equal(M.filtrar(itens,{busca:'CRAS'}).filter(x=>x.georreferenciado).length,9);
});

test('verificação do estabelecimento não confirma a oferta temporária de água ou banho',()=>{
 for(const base of bases){
  assert.equal(base.disponibilidade,'A confirmar');
  const item=M.transformar('bases',base,new Map());
  assert.match(item.detalhes,/Disponibilidade do apoio: A confirmar/);
  assert.match(base.observacoes,/disponibilidade atual do apoio precisam ser confirmados/);
 }
 const rio=bases.find(x=>x.nome.startsWith('Rio Hotel'));
 assert.equal(rio.verificacao,'Validado');
 assert.match(M.transformar('bases',rio,new Map()).detalhes,/A confirmar/);
});
