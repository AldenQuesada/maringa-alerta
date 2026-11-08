'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const APROVADAS={
 ajuda:{lat:-23.4196153,lng:-51.9357534,zoom:13.5732},
 colaboradores:{lat:-23.4201743,lng:-51.9334015,zoom:12},
 evento:{lat:-23.4130978,lng:-51.9164556,zoom:13.8408}
};
function contexto(){
 const ctx=vm.createContext({});
 for(const path of ['config/cameras-mapas.js','config/municipios.js','src/cadastros/municipios.js'])
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
 return ctx;
}
const plain=value=>JSON.parse(JSON.stringify(value));

for(const [tipo,aprovada] of Object.entries(APROVADAS)){
 test('contrato aprovado em 07/11/2026: centro e zoom canônicos de '+tipo,()=>{
  const ctx=contexto();
  assert.deepEqual(plain(ctx.AlertaCamerasMapas['4115200'][tipo]),aprovada);
  for(const ativo of [false,true]){
   ctx.AlertaNuvem={ativo};
   assert.deepEqual(plain(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'4115200'},tipo)),aprovada);
  }
  assert.equal(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'4115200'},'inexistente'),null);
  assert.equal(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'1302603'},tipo),null);
 });
 test('referência de '+tipo+' não pode ser alterada, substituída ou removida durante a execução',()=>{
  const ctx=contexto();
  for(const code of [
   `AlertaCamerasMapas['4115200'].${tipo}.zoom=2`,
   `AlertaCamerasMapas['4115200'].${tipo}.lat=0`,
   `AlertaCamerasMapas['4115200'].${tipo}.lng=0`,
   `AlertaCamerasMapas['4115200'].${tipo}={}`,
   "AlertaCamerasMapas['4115200']={}",
   'globalThis.AlertaCamerasMapas={}'
  ])assert.throws(()=>vm.runInContext('"use strict";'+code,ctx),undefined,code);
  assert.equal(vm.runInContext(`Reflect.deleteProperty(AlertaCamerasMapas['4115200'],'${tipo}')`,ctx),false);
  assert.equal(vm.runInContext("Reflect.deleteProperty(globalThis,'AlertaCamerasMapas')",ctx),false);
  assert.deepEqual(plain(ctx.AlertaCamerasMapas['4115200'][tipo]),aprovada);
  const antes=ctx.AlertaCamerasMapas;
  vm.runInContext(fs.readFileSync('config/cameras-mapas.js','utf8'),ctx);
  assert.equal(ctx.AlertaCamerasMapas,antes,'recarregar o bundle não substitui a referência');
 });
 test('referências municipais e consumidores não sobrescrevem a câmera de '+tipo,()=>{
  const ctx=contexto(),config=ctx.AlertaMunicipios,cidade={codigo_ibge:'4115200'};
  ctx.AlertaMunicipiosConfiguracao.referencias={};
  const copia=config.vistaMapa(cidade,tipo);copia.zoom=2;copia.lat=0;copia.lng=0;
  assert.deepEqual(plain(config.vistaMapa(cidade,tipo)),aprovada);
 });
}

test('bundle publicado inclui a única fonte canônica antes do resolvedor municipal',()=>{
 const manifest=JSON.parse(fs.readFileSync('src/modulos.json','utf8'));
 const sources=manifest.bundles.find(b=>b.target==='gestao/dados.js').sources;
 assert.equal(sources.filter(s=>s==='config/cameras-mapas.js').length,1);
 assert.ok(sources.indexOf('config/cameras-mapas.js')<sources.indexOf('src/cadastros/municipios.js'));
 assert.doesNotMatch(fs.readFileSync('config/municipios.js','utf8'),/vistaAjuda/,'não manter uma segunda referência concorrente');
});
