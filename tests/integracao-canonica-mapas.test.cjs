"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const D=require("../gestao/dados.js"),M=require("../mapas/inventario.js"),I=require("../dados-territoriais/importacao-publica.js");
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}};
const seeds=[
 JSON.parse(read("dados-territoriais/maringa-bases-riscos-publicos.json")),
 JSON.parse(read("dados-territoriais/maringa-abrigos-publicos.json"))
];
function novo(){const db=D.criar(store(),{municipioId:"maringa"});seeds.forEach(x=>I.importar(db,x));return db;}
test("inventário central cobre todos os 24 cadastros operacionais por fonte única",()=>{
 const db=novo();const camadas=M.resumo(db);
 assert.equal(M.CAMADAS.length,24);
 assert.equal(camadas.length,24);
 for(const x of camadas)assert.equal(x.total,db.lista(x.id).filter(o=>o.verificacao!=="Rejeitado").length,x.id);
 assert.equal(camadas.find(x=>x.id==="bases").total,6);
 assert.equal(camadas.find(x=>x.id==="abrigos").total,4);
 assert.equal(camadas.find(x=>x.id==="bases").comPonto,5);
 assert.equal(camadas.find(x=>x.id==="abrigos").comPonto,1);
 const records=M.registros(db);
 assert.equal(records.filter(x=>x.georreferenciado).length,6);
 assert.equal(new Set(records.map(x=>x.chave)).size,records.length);
});
test("filtros por zona, categoria e texto funcionam sem copiar registros",()=>{
 const db=novo(),xs=M.registros(db);
 assert.equal(M.filtrar(xs,{modulo:"bases",zona:"Zona 07"}).filter(x=>x.nome.includes("Vila Olímpica")).length,1);
 assert.equal(M.filtrar(xs,{modulo:"abrigos",zona:"Zona 7"}).length,1);
 assert.equal(M.filtrar(xs,{modulo:"bases",busca:"sismmar"}).length,1);
 assert.equal(M.filtrar(xs,{modulo:"bases",classe:"Centro de coleta de donativos"}).length,5);
 assert.equal(M.filtrar(xs,{modulo:"bases",classe:"Em conferência"}).length,6);
 assert.equal(M.filtrar(xs,{modulo:"riscos"}).length,3);
});
test("equipe e veículo vinculados a uma base geográfica compartilham somente a localização da base",()=>{
 const db=novo();const base=db.lista("bases").find(x=>x.nome.startsWith("DSW"));
 assert.ok(base?.lat&&base?.lng);
 const eq=db.gravar("equipes",{nome:"Equipe de limpeza",tipo:"Logística",base:base.nome,status:"Disponível"});
 const car=db.gravar("veiculos",{identificacao:"Caminhão 01",base:base.id,status:"Disponível"});
 const items=M.registros(db),a=items.find(x=>x.chave==="equipes:"+eq.id),b=items.find(x=>x.chave==="veiculos:"+car.id);
 assert.equal(a.georreferenciado,true);
 assert.equal(b.georreferenciado,true);
 assert.equal(a.lat,base.lat);
 assert.equal(b.lng,base.lng);
 assert.match(a.precisao,/base vinculada/);
 assert.match(b.precisao,/não posição atual/);
 const sem=db.gravar("equipamentos",{nome:"Gerador não alocado"});
 assert.equal(M.registros(db).find(x=>x.chave==="equipamentos:"+sem.id).georreferenciado,false);
});
test("dados privados não criam marcadores nem divulgam endereço no inventário dos mapas",()=>{
 const item=M.transformar("solicitacoes",{id:"ped",nome:"Pessoa atendida",necessidade:"Abrigo e moradia",endereco:"Endereço privado",lat:-23.42,lng:-51.9,descricao:"Relato sensível"},new Map());
 assert.equal(item.georreferenciado,false);
 assert.equal(item.endereco,"");
 assert.doesNotMatch(item.detalhes,/Relato sensível|Endereço privado/);
});
test("três mapas têm seleção canônica, visibilidade e cartografia não simulada por padrão",()=>{
 const mapaEvento=read("evento/app.js"),aux=read("mapas/app.js"),html=read("index.html"),maps=read("mapas/index.html");
 assert.match(html,/filtros-cadastros\.js/);
 assert.match(maps,/filtros-cadastros\.js/);
 assert.match(read("filtros-cadastros.js"),/id="mun-mostrar"/);
 assert.match(html,/mapas\/inventario.js/);
 assert.match(maps,/id="camada"/);
 assert.match(maps,/id="mostrar-unidades"/);
 assert.match(aux,/function renderUnidadesMunicipais\(/);
 assert.match(aux,/MaringaBairros.carregar\(/);
 assert.doesNotMatch(aux,/const shapes=\[/);
 assert.match(mapaEvento,/const demoMode=new URLSearchParams/);
 assert.match(mapaEvento,/if\(recuperacao.estado==='vazio'&&demoMode\)/);
 assert.match(mapaEvento,/const listarRecursosPublicos=\(\)=>INVENTARIO.registros\(gestao\)/);
 assert.match(mapaEvento,/const linhasInventario/);
 assert.match(mapaEvento,/filtrosCadastros\?\.mostrar/);
});
