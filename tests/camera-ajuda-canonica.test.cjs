'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const APROVADA={lat:-23.4196153,lng:-51.9357534,zoom:13.5732};
function contexto(){
 const ctx=vm.createContext({});
 for(const path of ['config/cameras-mapas.js','config/municipios.js','src/cadastros/municipios.js'])
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
 return ctx;
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('contrato aprovado: centro e zoom canônicos do Pra Somar em 07/11/2026',()=>{
 const ctx=contexto();
 assert.deepEqual(plain(ctx.AlertaCamerasMapas['4115200'].ajuda),APROVADA);
 for(const ativo of [false,true]){
  ctx.AlertaNuvem={ativo};
  assert.deepEqual(plain(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'4115200'},'ajuda')),APROVADA);
 }
 assert.equal(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'4115200'},'colaboradores'),null);
 assert.equal(ctx.AlertaMunicipios.vistaMapa({codigo_ibge:'1302603'},'ajuda'),null);
});

test('referência canônica não pode ser alterada, substituída ou removida durante a execução',()=>{
 const ctx=contexto();
 for(const code of [
  "AlertaCamerasMapas['4115200'].ajuda.zoom=2",
  "AlertaCamerasMapas['4115200'].ajuda.lat=0",
  "AlertaCamerasMapas['4115200'].ajuda.lng=0",
  "AlertaCamerasMapas['4115200'].ajuda={}",
  "AlertaCamerasMapas['4115200']={}",
  'globalThis.AlertaCamerasMapas={}'
 ])assert.throws(()=>vm.runInContext('"use strict";'+code,ctx),undefined,code);
 assert.equal(vm.runInContext("Reflect.deleteProperty(globalThis,'AlertaCamerasMapas')",ctx),false);
 assert.deepEqual(plain(ctx.AlertaCamerasMapas['4115200'].ajuda),APROVADA);
 const antes=ctx.AlertaCamerasMapas;
 vm.runInContext(fs.readFileSync('config/cameras-mapas.js','utf8'),ctx);
 assert.equal(ctx.AlertaCamerasMapas,antes,'recarregar o bundle não substitui a referência');
});

test('referências municipais e consumidores não sobrescrevem a câmera canônica',()=>{
 const ctx=contexto(),config=ctx.AlertaMunicipios,cidade={codigo_ibge:'4115200'};
 ctx.AlertaMunicipiosConfiguracao.referencias={};
 const copia=config.vistaMapa(cidade,'ajuda');copia.zoom=2;copia.lat=0;copia.lng=0;
 assert.deepEqual(plain(config.vistaMapa(cidade,'ajuda')),APROVADA);
});

test('bundle publicado inclui a única fonte canônica antes do resolvedor municipal',()=>{
 const manifest=JSON.parse(fs.readFileSync('src/modulos.json','utf8'));
 const sources=manifest.bundles.find(b=>b.target==='gestao/dados.js').sources;
 assert.equal(sources.filter(s=>s==='config/cameras-mapas.js').length,1);
 assert.ok(sources.indexOf('config/cameras-mapas.js')<sources.indexOf('src/cadastros/municipios.js'));
 assert.doesNotMatch(fs.readFileSync('config/municipios.js','utf8'),/vistaAjuda/,'não manter uma segunda referência concorrente');
});
