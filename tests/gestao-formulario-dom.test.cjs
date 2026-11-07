const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const D=require('../gestao/dados.js');
const cidade={id:'manaus',nome:'Manaus',uf:'AM',codigo_ibge:'1302603',status:'ativa'};
function ambiente(){
 const {document,HTMLElement,Event}=parseHTML(fs.readFileSync('gestao/index.html','utf8'));
 Object.defineProperty(document,'activeElement',{writable:true,value:null});
 HTMLElement.prototype.scrollTo=function(){};
 HTMLElement.prototype.focus=function(){document.activeElement=this;};
 // O DOM de teste não implementa a propriedade setter de HTMLSelectElement.
 const prototype=Object.getPrototypeOf(document.createElement('select'));
 Object.defineProperty(prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||''},set(value){for(const option of this.querySelectorAll('option')){if(option.value===value)option.setAttribute('selected','');else option.removeAttribute('selected');}}});
 let serialized=JSON.stringify({version:1,municipioAtivo:cidade.id,prefeituras:[cidade]});
 const storage={getItem:()=>serialized,setItem:(_,value)=>serialized=value};
 const scope={document,console,Event,Option:function(text){const o=document.createElement('option');o.textContent=text;return o;},URL,URLSearchParams,
 localStorage:storage,sessionStorage:{getItem:()=>cidade.id},location:{hash:'#bases',search:'?modo=demo'},setTimeout:()=>1,clearTimeout(){},
 addEventListener(){},dispatchEvent(){},matchMedia:()=>({matches:false}),fetch:()=>{throw Error('Não deve buscar referência de outra cidade');}};
 scope.window=scope;vm.createContext(scope);
 vm.runInContext(fs.readFileSync('gestao/dados.js','utf8'),scope);
 return {scope,document,storage};
}
test('Gestão inicia com contexto não paranaense e abre edição pelo módulo extraído',()=>{
 const {scope,document}=ambiente();
 vm.runInContext(fs.readFileSync('gestao/gestao.js','utf8'),scope);
 assert.match(document.querySelector('#page').textContent,/Bases de apoio/);
 assert.match(document.querySelector('#municipio-switch').textContent,/Manaus/);
 const novo=document.querySelector('[data-new="bases"]');novo.click();
 assert.equal(document.querySelector('#drawer-overlay').hidden,false);
 assert.match(document.querySelector('#drawer-title').textContent,/Base/);
 assert.ok(document.querySelector('#field-nome'));
 document.querySelector('#drawer-cancel').click();
 assert.equal(document.querySelector('#drawer-overlay').hidden,true);
});
test('formulário preserva ID de edição, conteúdo escapado e foco sem depender do controlador principal',()=>{
 const {scope,document,storage}=ambiente();
 vm.runInContext(fs.readFileSync('src/gestao/formulario.js','utf8'),scope);
 const db=D.criarLocal(storage,{semBootstrap:true,municipioId:cidade.id});
 const item=db.gravar('bases',{nome:'Base <script>teste</script>',tipo:'Base logística'});
 const trigger=document.getElementById('drawer-close');trigger.focus();
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const form=scope.AlertaGestaoFormulario.criar({db,D,document,esc,structures:()=>[],getCurrentPage:()=> 'bases'});
 form.abrirDrawer(item.id,'bases');
 assert.equal(form.edicao,item.id);assert.equal(form.modulo,'bases');
 assert.equal(document.getElementById('field-nome').value,item.nome);
 assert.equal(document.getElementById('cadastro-campos').querySelectorAll('script').length,0);
 form.fecharDrawer();assert.equal(form.edicao,null);assert.equal(form.modulo,null);assert.equal(document.activeElement,trigger);
});
