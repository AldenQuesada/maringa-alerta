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
test("Mapa de Evento carrega CSS e JS externos versionados e com cache correspondente",()=>{
 const html=file("index.html"),sw=file("sw.js");
 const script=html.match(/<script type="application\/x-maringa-modulo" src="evento\/app\.js\?v=([^"]+)"><\/script>/);
 const stylesheet=html.match(/<link rel="stylesheet" href="evento\/style\.css\?v=([^"]+)">/);
 assert.ok(script&&stylesheet,"Bundle e estilos externos");
 const hash=p=>{const data=fs.readFileSync(path.join(root,p));return require('node:crypto').createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex').slice(0,12);};
 assert.equal(script[1],hash('evento/app.js'),"Versão corresponde ao conteúdo do runtime");
 assert.equal(stylesheet[1],hash('evento/style.css'),"Versão corresponde ao conteúdo do CSS");
 assert.ok(sw.includes("evento/app.js?v="+script[1]),"Service Worker contém runtime atual");
 assert.ok(sw.includes("evento/style.css?v="+stylesheet[1]),"Service Worker contém CSS atual");
 assert.doesNotMatch(html,/<style\b|<script>\s*\(async function/);
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
