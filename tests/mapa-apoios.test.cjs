"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const D=require("../gestao/dados.js");
const I=require("../dados-territoriais/importacao-publica.js");
const data=JSON.parse(read("dados-territoriais/maringa-bases-riscos-publicos.json"));
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))}};
test("mapa cadastra 5 pontos de coleta sem duplicar o cadastro da Prefeitura",()=>{
 const banco=D.criar(store(),{municipioId:"maringa"});
 const stats=I.importar(banco,data);
 assert.equal(stats.novos,9);
 assert.equal(banco.lista("bases").filter(x=>x.tipo==="Centro de coleta de donativos").length,5);
 const app=read("evento/app.js");
 const begin=app.indexOf("const listarRecursosPublicos=()");
 const end=app.indexOf("function incluirTerritorio(territorio){",begin);
 assert.ok(begin>=0&&end>begin);
 const script=app.slice(begin,end);
 const pins=[];
 const L={
  layerGroup:()=>({addTo(){return this},clearLayers(){pins.splice(0,pins.length)}}),
  divIcon:o=>o,
  marker:(location,opts)=>({bindPopup(html){this.html=html;return this},addTo(){pins.push({location,opts,html:this.html});return this}})
 };
 const scope={L,map:{},gestao:banco,tenantId:"maringa",escHtml:x=>String(x),encodeURIComponent,
  AlertaImportacaoPublica:{carregar:()=>Promise.resolve({novos:0})},buscaMapa:{value:""},
  console};
 vm.runInNewContext(script,scope);
 const count=vm.runInContext("montarMarcadoresPublicos()",scope);
 assert.equal(count,5);
 assert.equal(pins.length,5);
 assert.equal(new Set(pins.map(x=>x.opts.title)).size,5);
 for(const pin of pins){
  assert.match(pin.html,/aproximad/i);
  assert.match(pin.html,/Ver endereço no mapa/);
  assert.match(pin.html,/Fonte pública/);
  assert.match(pin.html,/Em conferência/);
  assert.ok(pin.location[0]>-24&&pin.location[0]< -23);
 }
 assert.equal(vm.runInContext("montarMarcadoresPublicos()",scope),5);
 assert.equal(pins.length,5,"A atualização substitui os marcadores sem duplicar");
 const scripts=read("index.html");
 assert.match(scripts,/dados-territoriais\/importacao-publica\.js/);
 assert.match(scripts,/evento\/app\.js\?v=dash-mapas-2/);
 assert.match(read("gestao/index.html"),/importacao-publica\.js/);
});
test("bases sem coordenadas continuam consultáveis, sem pin fictício",()=>{
 const banco=D.criar(store(),{municipioId:"maringa"});
 I.importar(banco,data);
 const sem=banco.lista("bases").filter(x=>!x.lat||!x.lng);
 assert.equal(sem.length,1);
 assert.match(sem[0].nome,/Vila Olímpica/);
 assert.ok(read("evento/app.js").includes("listarRecursosPublicos().map(r=>"));
 assert.ok(read("evento/app.js").includes("if(x.lat===undefined||x.lat===null"));
});
