const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('configuração recebida substitui catálogos e esquemas locais',()=>{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'gestao/dados.js'),'utf8'),context);
 const d=context.AlertaGestaoDados;
 assert.throws(()=>d.aplicarConfiguracao({}),/Configuração inválida/);
 d.aplicarConfiguracao({esquemas:{bases:{collection:'bases',fields:[]}},catalogos:{origem:['Servidor']},grupos:[]});
 assert.deepEqual(Object.keys(d.ESQUEMAS),['bases']);
 assert.equal(d.CATALOGOS.origem[0],'Servidor');assert.equal(d.GROUPS.length,0);
});
test('mapa conectado usa apenas polígonos do município consultado e não baixa arquivos locais',async()=>{
 let fetches=0;const scopes=[];
 const geometry={type:'Polygon',coordinates:[[[0,0],[0,1],[1,1],[0,0]]]};
 const context={URL,document:{currentScript:{src:'https://local.invalid/dados-territoriais/camadas-mapas.js'}},sessionStorage:{getItem:()=> 'municipio-autorizado'},fetch:()=>{fetches++;throw Error('Fallback proibido');},AlertaNuvem:{ativo:true,repositorio(scope){scopes.push(scope);return {lista:c=>c==='bairros'?[{id:'confirmado',nome:'Cadastro autorizado',geojson:JSON.stringify(geometry)},{id:'rejeitado',verificacao:'Rejeitado',geojson:JSON.stringify(geometry)}]:[]};}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'dados-territoriais/camadas-mapas.js'),'utf8'),context);
 const data=await context.MaringaBairros.carregar();
 assert.equal(data.bairros.count,1);assert.equal(data.bairros.features[0].id,'confirmado');assert.equal(data.zonas.count,0);assert.equal(fetches,0);assert.equal(scopes[0].municipioId,'municipio-autorizado');
});
