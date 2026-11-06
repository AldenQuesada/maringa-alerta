"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const data=JSON.parse(read("dados-territoriais/maringa-bairros-ibge2022.geojson"));
const manifest=JSON.parse(read("dados-territoriais/maringa-ibge2022-fonte.json"));
const feature=data.features;
const norm=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
test("arquivo versionado IBGE 2022 contém bairros de Maringá com nomes corretos",()=>{
 assert.equal(data.type,"FeatureCollection");
 assert.equal(feature.length,113);
 assert.equal(manifest.feicoes,113);
 assert.equal(new Set(feature.map(x=>x.properties.nome)).size,113);
 assert.ok(feature.some(x=>x.properties.nome.includes("João")));
 assert.ok(feature.some(x=>x.properties.nome.includes("Guaiapó")));
 assert.ok(feature.every(x=>x.properties.codigo_municipio==="4115200"));
 assert.ok(feature.every(x=>!/[Ã][©£¡º¼]|Ã£|Ã¡|Ã´|Ã§/.test(x.properties.nome)));
});
test("cada bairro tem geometria georreferenciada para Maringá e identificador",()=>{
 for(const f of feature){
  assert.match(f.id,/^ibge2022-/);
  assert.match(f.properties.nome,/\S/);
  assert.ok(["Polygon","MultiPolygon"].includes(f.geometry.type));
  const first=f.geometry.type==="Polygon"?f.geometry.coordinates[0][0]:f.geometry.coordinates[0][0][0];
  assert.ok(first[0] < -51.5 && first[0] > -52.4);
  assert.ok(first[1] < -23 && first[1] > -23.9);
 }
});
test("bairros municipais não disponíveis não são apresentados como homologados",()=>{
 const municipal=JSON.parse(read("dados-territoriais/maringa-municipal-fonte.json"));
 assert.equal(municipal.camadas["bairros-municipais"].status,"indisponivel");
 assert.equal(municipal.camadas["zonas-cartograficas"].status,"sucesso");
 assert.match(municipal.nota,/não são zonas operacionais/i);
});
test("os três mapas carregam a mesma camada de bairros",()=>{
 const mapaEvento=read("index.html")+"\n"+read("evento/app.js");
 const mapas=read("mapas/index.html"),app=read("mapas/app.js");
 assert.match(mapaEvento,/dados-territoriais\/camadas-mapas.js/);
 assert.match(mapaEvento,/MaringaBairros.carregar/);
 assert.match(mapas,/\.\.\/dados-territoriais\/camadas-mapas.js/);
 assert.match(app,/MaringaBairros.iniciar/);
 assert.match(mapaEvento,/Zona demonstrativa/);
 assert.match(mapaEvento,/new URLSearchParams\(location.search\).get\('bairro'\)/);
});
test("Geoterritorialidade usa tabela única, zonas numeradas e cadastro existente",()=>{
 const admin=read("gestao/index.html"),ui=read("gestao/catalogo-bairros.js"),gestao=read("gestao/gestao.js");
 assert.match(admin,/\.\.\/dados-territoriais\/camadas-mapas.js/);
 assert.match(admin,/catalogo-bairros.js/);
 assert.match(gestao,/\["geoterritorialidade","Geoterritorialidade"\]/);
 assert.match(gestao,/id="geo-rows"/);
 assert.match(gestao,/id="geo-search"/);
 assert.match(ui,/gestao:geo-render/);
 assert.match(ui,/data-geo-edit/);
 assert.match(ui,/data-geo-ref/);
 assert.match(ui,/zonasOficiais/);
 assert.match(ui,/db\(\)\.lista\(type\)/);
});

test("o controlador seleciona o bairro por nome e aceita deep links",()=>{
 const src=read("dados-territoriais/camadas-mapas.js");
 assert.match(src,/name="selecionar-bairro"/);
 assert.match(src,/focus\(select.value\)/);
 assert.match(src,/new URLSearchParams\(location.search\).get\("bairro"\)/);
 assert.ok(src.includes("GeoMaringá / Prefeitura de Maringá"));
});
test("carregador usa IBGE preferencialmente quando GeoMaringá não responde",async()=>{
 const source=read("dados-territoriais/camadas-mapas.js");
 const context={
  document:{currentScript:{src:"https://example.com/maringa-alerta/dados-territoriais/camadas-mapas.js"}},
  location:{href:"https://example.com/maringa-alerta/",search:""},
  URL,
  fetch:async(input)=>{
   const name=new URL(input).pathname.split("/").at(-1);
   if(name==='maringa-municipal-fonte.json')return {ok:true,json:async()=>({camadas:{}})};
   const found=fs.existsSync(path.join(root,"dados-territoriais",name));
   return {ok:found,json:async()=>JSON.parse(read("dados-territoriais/"+name))};
  }
 };
 context.globalThis=context;
 vm.runInNewContext(source,context,{filename:"camadas-mapas.js"});
 const r=await context.MaringaBairros.carregar();
 assert.equal(r.bairros.count,113);
 assert.equal(r.bairros.kind,"ibge2022");
 assert.equal(r.zonas,null);
 assert.match(r.bairros.source,/Censo 2022/);
});
