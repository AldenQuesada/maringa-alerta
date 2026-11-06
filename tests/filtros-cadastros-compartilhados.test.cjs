'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const M=require('../mapas/inventario.js');
function alvoFake(){
 const nodes=new Map(),botoes=[{dataset:{tipos:'todos'}},{dataset:{tipos:'nenhum'}}];
 return {classList:{add(){}},set innerHTML(v){this.html=v},querySelector(s){if(!nodes.has(s))nodes.set(s,{dataset:{},hidden:s==='#mun-body',checked:s==='#mun-mostrar',value:'',innerHTML:'',textContent:'',setAttribute(k,v){this[k]=v}});return nodes.get(s)},querySelectorAll(){return botoes},nodes,botoes};
}
test('o filtro compartilhado controla vários tipos sem alterar os cadastros',()=>{
 const window={},ctx={window};vm.runInNewContext(fs.readFileSync('filtros-cadastros.js','utf8'),ctx);
 const data={bases:[{id:'a',nome:'Água',tipo:'Água',lat:-23,lng:-51},{id:'b',nome:'Banho',tipo:'Banho',lat:-23,lng:-51},{id:'c',nome:'Doação',tipo:'Doação',lat:-23,lng:-51}],bairros:[]};
 const db={lista:(nome)=>data[nome]||[]},el=alvoFake();let mudancas=0;
 const f=window.FiltrosCadastros.montar({alvo:el,inventario:M,db,aoMudar:()=>mudancas++});
 assert.equal(f.rows().length,3);el.botoes[1].onclick();assert.equal(f.rows().length,0);
 const change=el.nodes.get('.mun-tipos').onchange;change({target:{dataset:{chave:'bases::Água'},checked:true}});change({target:{dataset:{chave:'bases::Banho'},checked:true}});
 assert.deepEqual(Array.from(f.rows(),x=>x.nome),['Água','Banho']);assert.equal(data.bases.length,3);assert.equal(mudancas,3);
 el.botoes[0].onclick();assert.equal(f.rows().length,3);
});
