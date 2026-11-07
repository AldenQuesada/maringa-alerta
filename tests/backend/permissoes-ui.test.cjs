const {test}=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../../backend/permissoes-ui.js');
test('ações de estruturas, território, exclusão e presença resolvem a coleção correta',()=>{
 for(const [dataset,route,expected] of [
  [{new:'bases'},'inicio',['bases','gravar']],
  [{canonEdit:'saude'},'estruturas',['saude','gravar']],
  [{geoEdit:'b1',geoModule:'zonas'},'geoterritorialidade',['zonas','gravar']],
  [{delete:'b1'},'bases',['bases','excluir']],
  [{checkin:'v1'},'inicio',['voluntarios','gravar']],
  [{permissionCollection:'mobilizacoes'},'inicio',['mobilizacoes','gravar']]
 ])assert.deepEqual(UI.regra({dataset},route),expected);
});
test('rotas agrupadas respeitam capacidades sem converter leitura em escrita',()=>{
 const db={pode:(c,a)=>['bairros','instituicoes'].includes(c)&&a==='ler'};
 assert.equal(UI.podeRota(db,'geoterritorialidade'),true);
 assert.equal(UI.podeRota(db,'estruturas'),true);
 assert.equal(UI.podeRota(db,'conversas'),false);
 assert.equal(UI.podeRota(db,'estoques'),false);
});
test('formulário reflete transições e números do banco sem alterar configuração original',()=>{
 const regras={transicoes:{solicitacoes:{inicial:['Aguardando'],estados:{Aguardando:['Encaminhada'],Atendida:[]}}},numeros:{abrigos:{capacidade:{min:0,inteiro:true}}}};
 const field={key:'status',options:['TODOS']};
 assert.deepEqual(UI.campo(field,{status:'Atendida'},'solicitacoes',regras).options,['Atendida']);
 assert.deepEqual(UI.campo(field,null,'solicitacoes',regras).options,['Aguardando']);
 assert.equal(UI.campo({key:'capacidade'},null,'abrigos',regras).step,1);
 assert.deepEqual(field.options,['TODOS']);
});
test('controles são ocultados na revogação e não reativam botão ocupado',()=>{
 let callback,allowed=true;
 const button={dataset:{new:'bases'},hidden:false,disabled:true,setAttribute(){},removeAttribute(){}};
 const doc={body:{},querySelectorAll:s=>s.startsWith('[data-new]')?[button]:[]};
 global.addEventListener=()=>{};global.removeEventListener=()=>{};
 const stop=UI.instalar({document:doc,db:{pode:()=>allowed},location:{hash:'#bases'},MutationObserver:class{constructor(cb){callback=cb;}observe(){}disconnect(){}}});
 assert.equal(button.disabled,true);
 allowed=false;callback();assert.equal(button.hidden,true);
 allowed=true;callback();assert.equal(button.hidden,false);assert.equal(button.disabled,true);
 stop();delete global.addEventListener;delete global.removeEventListener;
});
