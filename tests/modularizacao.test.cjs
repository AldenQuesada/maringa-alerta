"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const file=p=>fs.readFileSync(path.join(root,p),"utf8");
const manifest=JSON.parse(file("src/modulos.json"));
test("todos os bundles publicados correspondem byte a byte aos módulos de origem",()=>{
 assert.equal(manifest.schema,1);
 assert.ok(manifest.bundles.length>=9,"Cobertura dos serviços principais");
 const paths=new Set();
 for(const bundle of manifest.bundles){
  assert.ok(bundle.sources.length>1,bundle.target);
  assert.ok(!paths.has(bundle.target),"Saída não pode ter duas fontes paralelas");
  paths.add(bundle.target);
  const rebuilt=bundle.sources.map(file).join("");
  assert.equal(file(bundle.target),rebuilt,"Bundle divergiu: "+bundle.target);
 }
});
test("Mapa de Evento carrega CSS e JS externos sem segundo runtime paralelo",()=>{
 const html=file("index.html");
 assert.match(html,/<link rel="stylesheet" href="evento\/style.css\?v=modular-1"/);
 assert.match(html,/<script src="evento\/app.js\?v=modular-1"><\/script>/);
 assert.doesNotMatch(html,/<style\b|<script>\s*\(async function/);
 assert.match(file("sw.js"),/evento\/app.js\?v=modular-1/);
 assert.match(file("sw.js"),/evento\/style.css\?v=modular-1/);
});
test("a modularização não cria armazenamento nem páginas canônicas alternativas",()=>{
 const outputs=manifest.bundles.map(x=>x.target);
 assert.equal(new Set(outputs).size,outputs.length);
 for(const required of ["evento/app.js","gestao/gestao.js","gestao/dados.js","plataforma/app.js","mapas/app.js","atendimento/chat.js","crise/core.js"]){
  assert.ok(outputs.includes(required),required);
 }
 assert.match(file("gestao/dados.js"),/alerta_painel_gestao_v1/);
 assert.match(file("evento/app.js"),/href="gestao\/#voluntarios"/);
});
