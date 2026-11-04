'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {defaults,corresponde,situacao}=require('../filtros-ocorrencias');
const agora=Date.parse('2026-11-04T16:00:00Z');
const o={tipo:'Árvore caída',gravidade:3,status:'ativa',confirmado:true,reportadoEm:agora-45*60000,responsabilidade:'publica',origem:'WhatsApp',organizacoes:[{id:'equipes:1',nome:'Equipe A'}]};
test('campos selecionados combinam dentro de cada filtro e são cruzados entre filtros',()=>{
 const f={...defaults(),tipos:['Alagamento','Árvore caída'],gravidades:['3'],situacoes:['aguardando'],origem:'WhatsApp',organizacao:'equipes:1',espera:'30'};
 assert.equal(corresponde(o,f,agora),true);assert.equal(corresponde({...o,origem:'Telefone'},f,agora),false);assert.equal(corresponde({...o,gravidade:2},f,agora),false);assert.equal(corresponde({...o,status:'em_atendimento'},f,agora),false);
});
test('triagem, histórico, tempo e atribuição não confundem ocorrências',()=>{
 assert.equal(situacao({...o,confirmado:false}),'triagem');assert.equal(corresponde(o,{...defaults(),horas:'2'},agora),true);assert.equal(corresponde({...o,reportadoEm:agora-3*3600000},{...defaults(),horas:'2'},agora),false);
 assert.equal(corresponde({...o,status:'resolvida'},{...defaults(),situacoes:['resolvida'],espera:'30'},agora),false);
 assert.equal(corresponde({...o,organizacoes:[]},{...defaults(),atribuicao:'sem'},agora),true);assert.equal(corresponde(o,{...defaults(),atribuicao:'sem'},agora),false);
});
