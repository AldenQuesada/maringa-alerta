'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element{constructor(tag){this.tagName=tag;this.children=[];this.events={};this.textContent='';this.checked=false;}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}addEventListener(event,fn){this.events[event]=fn}}
const sandbox={window:{},document:{createElement:tag=>new Element(tag)}};vm.runInNewContext(fs.readFileSync('mapas/filtros-unidades.js','utf8'),sandbox);
test('tipos registrados aparecem automaticamente e cada seleção controla apenas o tipo escolhido',()=>{
 const data=[{modulo:'bases',moduloNome:'Bases',categoria:'Ponto de água potável',georreferenciado:true},{modulo:'bases',moduloNome:'Bases',categoria:'Ponto de banho',georreferenciado:true},{modulo:'saude',moduloNome:'Saúde',categoria:'UBS',georreferenciado:false}];let changes=0;const alvo=new Element('div'),f=sandbox.window.FiltrosUnidades.criar({alvo,ler:()=>data,aoMudar:()=>changes++});f.atualizar();
 assert.equal(alvo.children.length,2);const tipo=alvo.children[0].children.find(x=>x.tagName==='label');const input=tipo.children[0];assert.equal(input.checked,true);input.checked=false;input.events.change();assert.equal(changes,1);
 const desativado=data.find(x=>tipo.children[1].textContent.startsWith(x.categoria));assert.equal(f.aceita(desativado),false);assert.equal(f.aceita(data.find(x=>x!==desativado)),true);f.atualizar();assert.equal(alvo.children[0].children.find(x=>x.tagName==='label').children[0].checked,false);
 f.selecionarTodos(false);assert.ok(data.every(x=>!f.aceita(x)));f.selecionarTodos(true);assert.ok(data.every(x=>f.aceita(x)));
 data.push({modulo:'bases',moduloNome:'Bases',categoria:'Cozinha comunitária',georreferenciado:true});f.atualizar();assert.ok(alvo.children.flatMap(x=>x.children).some(x=>x.tagName==='label'&&x.children[1].textContent.startsWith('Cozinha comunitária')));
});
