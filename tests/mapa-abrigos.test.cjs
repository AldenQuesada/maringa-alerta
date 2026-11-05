"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const D=require("../gestao/dados.js");
const I=require("../dados-territoriais/importacao-publica.js");
const dados=JSON.parse(read("dados-territoriais/maringa-abrigos-publicos.json"));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
test("Abrigos institucionais públicos permanecem distintos do abrigo emergencial confirmado",()=>{
 assert.equal(dados.municipio_ibge,"4115200");
 assert.equal(dados.abrigos.length,4);
 assert.equal(new Set(dados.abrigos.map(x=>x.externalId)).size,4);
 const emergenciais=dados.abrigos.filter(x=>x.tipo==="Abrigo emergencial");
 assert.equal(emergenciais.length,1);
 assert.match(emergenciais[0].nome,/Vila Olímpica/);
 assert.equal(emergenciais[0].capacidade,75);
 assert.equal(emergenciais[0].zona,"Zona 7");
 assert.equal(emergenciais[0].contato,"(44) 98418-0579");
 for(const abrigo of dados.abrigos){
  assert.equal(abrigo.verificacao,"Em conferência");
  assert.equal(abrigo.status,"A confirmar");
  assert.ok(abrigo.url_fonte.startsWith("https://"));
  assert.ok(abrigo.endereco);
  assert.ok(abrigo.disponiveis===""||abrigo.disponiveis==null,"Sem vagas livres inventadas");
 }
 for(const x of dados.abrigos.filter(x=>x.tipo!=="Abrigo emergencial")){
  assert.match(x.acesso,/não (?:é|há)|não confirmado|não é abrigo/i);
 }
});
test("Abrigos entram uma única vez no cadastro municipal existente e preservam homologação",()=>{
 const db=D.criar(storage(),{municipioId:"maringa"});
 const a=I.importar(db,dados);
 assert.equal(a.novos,4);
 assert.equal(db.lista("abrigos").length,4);
 const b=I.importar(db,dados);
 assert.equal(b.novos,0);
 assert.equal(db.lista("abrigos").length,4);
 const vila=db.lista("abrigos").find(x=>x.nome.includes("Vila Olímpica"));
 assert.ok(vila);
 assert.equal(vila.capacidade,75);
 assert.equal(vila.status,"A confirmar");
 db.gravar("abrigos",{...vila,status:"Indisponível",verificacao:"Validado"},vila.id);
 I.importar(db,dados);
 assert.equal(db.registro("abrigos",vila.id).status,"Indisponível");
});
test("Abrigos são consultados no dashboard e em todas as camadas dos três mapas",()=>{
 const db=D.criar(storage(),{municipioId:"maringa"});
 I.importar(db,dados);
 const M=require("../mapas/inventario.js");
 const abrigos=M.registros(db).filter(x=>x.modulo==="abrigos");
 assert.equal(abrigos.length,4);
 assert.equal(abrigos.filter(x=>x.georreferenciado).length,1);
 assert.equal(M.filtrar(abrigos,{modulo:"abrigos",zona:"Zona 7"}).length,1);
 const aux=read("mapas/app.js"),event=read("evento/app.js");
 assert.match(aux,/AlertaImportacaoPublica|INVENTARIO/);
 assert.match(read("mapas/index.html"),/inventario.js/);
 assert.match(event,/r\.modulo==='abrigos'\?'🛏️'/);
 assert.match(event,/Vagas livres/);
 assert.match(read("index.html"),/mun-camada/);
 assert.match(read("gestao/index.html"),/importacao-publica\.js/);
});
