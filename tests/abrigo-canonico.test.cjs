"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const D=require("../gestao/dados.js"),I=require("../dados-territoriais/importacao-publica.js");
const seed=JSON.parse(read("dados-territoriais/maringa-abrigos-publicos.json"));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
test("abrigo emergencial da Vila Olímpica tem capacidade divulgada sem atribuir vagas livres",()=>{
 assert.equal(seed.municipio_ibge,"4115200");
 assert.equal(seed.abrigos.length,4);
 assert.equal(new Set(seed.abrigos.map(x=>x.externalId)).size,4);
 const emergenciais=seed.abrigos.filter(x=>x.tipo==="Abrigo emergencial");
 assert.equal(emergenciais.length,1);
 const vila=emergenciais[0];
 assert.equal(vila.capacidade,75);
 assert.equal(vila.zona,"Zona 7");
 assert.equal(vila.contato,"(44) 98418-0579");
 assert.ok(Number.isFinite(vila.lat)&&Number.isFinite(vila.lng));
 assert.match(vila.geo_status,/aproximad/i);
 for(const abrigo of seed.abrigos){
  assert.equal(abrigo.status,"A confirmar");
  assert.equal(abrigo.verificacao,"Em conferência");
  assert.ok(abrigo.disponiveis===""||abrigo.disponiveis==null);
  assert.ok(abrigo.url_fonte.startsWith("https://"));
  assert.ok(abrigo.endereco);
 }
 for(const x of seed.abrigos.filter(x=>x.tipo!=="Abrigo emergencial"))assert.match(x.acesso,/não (?:é|há)|não confirmado|não é abrigo/i);
});
test("abrigos são importados no cadastro municipal único sem cópias ou sobrescrever homologações",()=>{
 const db=D.criar(store(),{municipioId:"maringa"});
 const primeira=I.importar(db,seed);
 assert.equal(primeira.novos,4);
 assert.equal(db.lista("abrigos").length,4);
 assert.equal(I.importar(db,seed).novos,0);
 assert.equal(db.lista("abrigos").length,4);
 const vila=db.lista("abrigos").find(x=>x.nome.includes("Vila Olímpica"));
 assert.ok(vila);
 db.gravar("abrigos",{...vila,verificacao:"Validado",status:"Indisponível"},vila.id);
 I.importar(db,seed);
 assert.equal(db.registro("abrigos",vila.id).status,"Indisponível");
 assert.equal(db.registro("abrigos",vila.id).verificacao,"Validado");
});
test("Gestão e Mapa de Evento consultam a mesma coleção de abrigos",()=>{
 const gestao=read("gestao/gestao.js"),evento=read("evento/app.js");
 assert.match(gestao,/maringa-abrigos-publicos\.json/);
 assert.match(evento,/maringa-abrigos-publicos\.json/);
 assert.match(evento,/INVENTARIO\.simbolo\(r\)/);
 assert.equal(require('../mapas/inventario.js').simbolo({modulo:'abrigos'}),'🛏️');
 assert.match(evento,/Vagas livres/);
 assert.match(evento,/listarRecursosPublicos/);
 assert.match(read("gestao/index.html"),/importacao-publica\.js/);
 assert.match(read("gestao/dados.js"),/abrigos:\{label:/);
});
