const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function elemento(){return {hidden:false,style:{},attrs:{},listeners:{},classList:{add(){},remove(){}},addEventListener(n,f){this.listeners[n]=f},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true},click(){this.listeners.click?.({})}}}
test('minimizar e expandir preserva filtros; fechar e abrir continua funcionando',()=>{
 const painel=elemento(),barra=elemento(),abrir=elemento(),fechar=elemento(),botao=elemento(),corpo=elemento();
 painel.hidden=true;painel.querySelector=s=>s==='#eventos-minimizar'?botao:corpo;
 const context={window:{}};vm.runInNewContext(fs.readFileSync('painel-eventos.js','utf8'),context);
 let atualizacoes=0;context.window.PainelEventos.iniciar({painel,barra,abrir,fechar,area:{},aoAbrir:()=>atualizacoes++});
 abrir.click();assert.equal(painel.hidden,false);assert.equal(atualizacoes,1);
 corpo.filtro='alta';botao.click();assert.equal(corpo.hidden,true);assert.equal(botao.attrs['aria-expanded'],'false');assert.equal(botao.attrs['aria-label'],'Expandir filtros de eventos');
 botao.click();assert.equal(corpo.hidden,false);assert.equal(corpo.filtro,'alta');assert.equal(botao.attrs['aria-expanded'],'true');
 fechar.click();assert.equal(painel.hidden,true);assert.equal(abrir.focused,true);abrir.click();assert.equal(painel.hidden,false);assert.equal(corpo.filtro,'alta');
});
