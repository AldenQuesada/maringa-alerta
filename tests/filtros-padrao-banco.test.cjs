const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs');
function abrir(padrao){
 const {window,document}=parseHTML('<div id="filtros"></div>');
 // linkedom não implementa o setter de select.value.
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this._value||''},set(v){this._value=v}});
 vm.runInNewContext(fs.readFileSync('filtros-cadastros.js','utf8'),{window});
 const items=[{modulo:'saude',categoria:'UBS',nome:'Saúde',georreferenciado:true},{modulo:'bases',categoria:'Ponto de banho',nome:'Banho',georreferenciado:true}];
 const api=window.FiltrosCadastros.montar({alvo:document.querySelector('#filtros'),db:{municipioAtivo:()=>({mapa_filtros_padrao:padrao})},inventario:{registros:()=>items,filtrar:x=>x,resumo:()=>[],classes:()=>[]}});
 return {api,document,items};
}
test('padrão municipal oculta saúde e mantém a opção para reativar',()=>{
 const {api,document,items}=abrir({tipos_visiveis:['bases::Ponto de banho']});
 assert.equal(api.aceita(items[0]),false);assert.equal(api.aceita(items[1]),true);
 const saude=document.querySelector('[data-chave="saude::UBS"]');assert.ok(saude);assert.equal(saude.hasAttribute('checked'),false);
 document.querySelector('.mun-tipos').onchange({target:{dataset:{chave:'saude::UBS'},checked:true}});
 assert.equal(api.aceita(items[0]),true);
 assert.equal(abrir({tipos_visiveis:['bases::Ponto de banho']}).api.rows().length,1,'nova abertura restaura o padrão do banco');
});
test('município sem padrão preserva todos e lista vazia oculta estruturas',()=>{
 assert.equal(abrir(undefined).api.rows().length,2);
 assert.equal(abrir({tipos_visiveis:[]}).api.rows().length,0);
 const {api,document}=abrir({tipos_visiveis:[]});document.querySelector('[data-tipos="todos"]').onclick();assert.equal(api.rows().length,2);
});
