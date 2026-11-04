"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const D=require("../dados.js");

function storage(){const m=new Map();return {
 getItem:k=>m.has(k)?m.get(k):null,
 setItem:(k,v)=>m.set(k,String(v)),
 removeItem:k=>m.delete(k)
};}
const novo=()=>{const s=storage();return {db:D.criar(s),storage:s};};
test("prefeitura padrão é Maringá",()=>{
 const {db}=novo();
 assert.deepEqual(db.municipios().map(x=>x.nome),["Maringá"]);
 assert.equal(db.municipioAtivo().codigo_ibge,"4115200");
});
test("todos os submenus possuem cadastro associado",()=>{
 const modulos=D.GROUPS.flatMap(g=>g.items).filter(x=>x!=="inicio");
 assert.ok(modulos.length>=20);
 for(const id of modulos){assert.ok(D.ESQUEMAS[id],"esquema ausente: "+id);
  assert.ok(D.ESQUEMAS[id].fields.length>0,"cadastro sem campos: "+id);}
});
test("cadastro de prefeitura usa IBGE e não duplica o município",()=>{
 const {db}=novo();
 const p=db.gravar("prefeituras",{uf:"SC",nome:"Florianópolis",codigo_ibge:"4205407"});
 assert.equal(db.municipios().length,2);
 assert.equal(p.uf,"SC");
 assert.throws(()=>db.gravar("prefeituras",{uf:"SC",nome:"Duplicada",codigo_ibge:"4205407"}),/já está/);
 assert.throws(()=>db.gravar("prefeituras",{uf:"SP",nome:"Sem IBGE",codigo_ibge:"123"}),/IBGE/);
});
test("responsáveis, substitutos, coordenadores e administradores compartilham coleção com filtro de papel",()=>{
 const {db}=novo();
 for(const id of ["administradores","responsaveis","substitutos","coordenadores","operadores"])db.gravar(id,{nome:"Pessoa "+id});
 assert.equal(db.estado().usuarios.length,5);
 for(const id of ["administradores","responsaveis","substitutos","coordenadores","operadores"])
  assert.equal(db.lista(id).length,1);
});
test("instituições são separadas por tipo sem duplicar a entidade",()=>{
 const {db}=novo();
 db.gravar("saude",{nome:"Hospital A",tipo:"Hospital"});
 db.gravar("emergencias",{nome:"Bombeiros B",tipo:"Bombeiros"});
 db.gravar("parceiros",{nome:"Água C",tipo:"Água"});
 assert.equal(db.lista("saude").length,1);
 assert.equal(db.lista("emergencias").length,1);
 assert.equal(db.lista("parceiros").length,1);
 assert.equal(db.estado().instituicoes.length,3);
});
test("cadastros de equipes isolados por prefeitura",()=>{
 const {db}=novo();
 db.gravar("equipes",{nome:"Equipe Maringá"});
 const outra=db.gravar("prefeituras",{uf:"SC",nome:"Florianópolis",codigo_ibge:"4205407"});
 db.selecionarMunicipio(outra.id);
 assert.equal(db.lista("equipes").length,0);
 db.gravar("equipes",{nome:"Equipe Florianópolis"});
 assert.equal(db.lista("equipes").length,1);
 db.selecionarMunicipio("maringa");
 assert.equal(db.lista("equipes").length,1);
 assert.equal(db.lista("equipes")[0].nome,"Equipe Maringá");
});
test("criar, editar e excluir recursos reutiliza o mesmo registro",()=>{
 const {db}=novo();
 const a=db.gravar("equipamentos",{nome:"Motosserra",quantidade:"2"});
 const b=db.gravar("equipamentos",{nome:"Motosserra elétrica",quantidade:"3"},a.id);
 assert.equal(a.id,b.id);
 assert.equal(db.lista("equipamentos").length,1);
 assert.equal(db.lista("equipamentos")[0].quantidade,"3");
 assert.equal(db.excluir("equipamentos",a.id),true);
 assert.equal(db.lista("equipamentos").length,0);
});
test("recarregar mantém os cadastros no armazenamento local",()=>{
 const s=storage(),a=D.criar(s);
 a.gravar("zonas",{nome:"Zona 7",tipo:"Urbana"});
 const b=D.criar(s);
 assert.equal(b.lista("zonas")[0].nome,"Zona 7");
});
test("excluir prefeitura apaga apenas seus registros e preserva a última prefeitura",()=>{
 const {db}=novo();
 db.gravar("equipes",{nome:"Equipe Maringá"});
 const outra=db.gravar("prefeituras",{uf:"SC",nome:"Florianópolis",codigo_ibge:"4205407"});
 db.selecionarMunicipio(outra.id);
 db.gravar("equipes",{nome:"Equipe Florianópolis"});
 assert.equal(db.excluir("prefeituras",outra.id),true);
 assert.equal(db.municipioAtivo().id,"maringa");
 assert.equal(db.lista("equipes").length,1);
 assert.throws(()=>db.excluir("prefeituras","maringa"),/pelo menos uma/);
});
test("nova gestão chama o mapa original sem copiar seu HTML para dentro dela",()=>{
 const admin=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const old=fs.readFileSync(path.join(__dirname,"../../index.html"),"utf8");
 const code=fs.readFileSync(path.join(__dirname,"../gestao.js"),"utf8");
 assert.match(admin,/id="abrir-mapa"[^>]*href="\.\.\/index\.html"[^>]*target="_blank"/);
 assert.match(code,/window\.open\(abrirMapa\.href/);
 assert.match(admin,/id="sidebar-nav"/);
 assert.match(admin,/id="session-anchor"/);
 assert.match(old,/L\.map\('map'/);
 assert.match(old,/id="heat-toggle"/);
 assert.doesNotMatch(admin,/id="mapwrap"/);
});
