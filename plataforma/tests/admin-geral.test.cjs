"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const D=require("../../gestao/dados.js");
const P=require("../modelo.js");
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function novo(){const local=storage(),session=storage(),central=P.criar({armazenamento:local,sessoes:session,dados:D});return {local,session,central};}
const londrina={id:4113700,nome:"Londrina",uf:{sigla:"PR"}};
test("a Administração Geral é independente da Prefeitura e exige sessão explícita",()=>{
 const {central,session}=novo();
 assert.equal(central.sessaoAtiva(),false);
 assert.throws(()=>central.municipios(),/sessão/);
 central.entrarDemonstracao();assert.equal(central.sessaoAtiva(),true);
 assert.equal(central.municipios().length,1);
 central.sairDemonstracao();assert.equal(central.sessaoAtiva(),false);
 assert.equal(session.getItem(P.SESSION),null);
});
test("Admin Geral provisiona Londrina e preserva Maringá",()=>{
 const {central,local}=novo();central.entrarDemonstracao();
 const p=central.gravarPrefeitura({uf:"PR",estado:"Paraná",cidade:londrina,adminMunicipal:"Gestor da cidade",email:"gestor@example.invalid"});
 assert.equal(p.nome,"Londrina");assert.equal(p.codigo_ibge,"4113700");
 assert.equal(p.paisId,"BR");assert.equal(p.uf,"PR");assert.equal(p.status,"implantacao");
 assert.equal(central.municipios().length,2);
 assert.equal(D.criar(local).municipios().find(x=>x.id==="maringa").nome,"Maringá");
 assert.equal(central.municipios().find(x=>x.id===p.id).admin_municipal_email,"gestor@example.invalid");
});
test("não duplica prefeitura nem aceita município de UF inválida",()=>{
 const {central}=novo();central.entrarDemonstracao();
 central.gravarPrefeitura({uf:"PR",cidade:londrina});
 assert.throws(()=>central.gravarPrefeitura({uf:"PR",cidade:londrina}),/já cadastrada/);
 assert.throws(()=>central.gravarPrefeitura({uf:"SP",cidade:londrina}),/outra UF/);
 assert.throws(()=>central.gravarPrefeitura({pais:"AR",uf:"PR",cidade:londrina}),/País não habilitado/);
});
test("Admin Geral pode ativar e suspender uma Prefeitura sem apagar dados",()=>{
 const {central,local}=novo();central.entrarDemonstracao();
 const p=central.gravarPrefeitura({uf:"PR",cidade:londrina});
 const u=D.criar(local,{municipioId:p.id}).gravar("pessoas",{nome:"Coordenador",funcao:"coordenador",zona:"Centro"});
 assert.equal(central.mudarSituacao(p.id,"ativa").status,"ativa");
 assert.equal(central.mudarSituacao(p.id,"suspensa").status,"suspensa");
 assert.equal(D.criar(local,{municipioId:p.id}).registro("pessoas",u.id).nome,"Coordenador");
 assert.throws(()=>central.acessarMunicipio(p.id),/suspensa/);
});
test("cada Prefeitura acessa só seu escopo, independente do município global",()=>{
 const {central,local}=novo();central.entrarDemonstracao();
 const lon=central.gravarPrefeitura({uf:"PR",cidade:londrina,status:"ativa"});
 const mg=D.criar(local,{municipioId:"maringa"});
 const ld=D.criar(local,{municipioId:lon.id});
 const userMG=mg.gravar("pessoas",{nome:"Responsável Maringá",funcao:"responsavel"});
 const userLD=ld.gravar("pessoas",{nome:"Responsável Londrina",funcao:"responsavel"});
 assert.deepEqual(mg.municipios().map(x=>x.nome),["Maringá"]);
 assert.deepEqual(ld.municipios().map(x=>x.nome),["Londrina"]);
 assert.equal(mg.lista("pessoas").length,1);
 assert.equal(ld.lista("pessoas").length,1);
 assert.equal(mg.registro("pessoas",userLD.id),null);
 assert.equal(ld.registro("pessoas",userMG.id),null);
 assert.equal(ld.estado().prefeituras.length,1);
 assert.equal(ld.estado().usuarios.length,1);
 D.criar(local).selecionarMunicipio("maringa");
 assert.equal(ld.municipioAtivo().nome,"Londrina");
 assert.throws(()=>ld.selecionarMunicipio("maringa"),/fora do escopo/);
 assert.throws(()=>ld.gravar("prefeituras",{uf:"PR",nome:"Cidade falsa",codigo_ibge:"4113700"}),/Admin Geral/);
 assert.throws(()=>ld.excluir("prefeituras",lon.id),/Admin Geral/);
 assert.throws(()=>ld.atualizarGeo(lon.id,{lat:-23.3,lng:-51.1}),/Admin Geral/);
});
test("georreferenciamento fica no Admin Geral, com geometria verificada",()=>{
 const {central,local}=novo();central.entrarDemonstracao();
 const p=central.gravarPrefeitura({uf:"PR",cidade:londrina});
 const geom=JSON.stringify({type:"Polygon",coordinates:[[[-51.2,-23.3],[-51.1,-23.3],[-51.1,-23.2],[-51.2,-23.3]]]});
 const updated=central.registrarGeo(p.id,{lat:-23.25,lng:-51.15,bbox:[-23.3,-23.2,-51.2,-51.1],limite_geojson:geom});
 assert.equal(updated.fonte_geo,"IBGE");
 assert.equal(updated.lat,-23.25);
 assert.equal(D.criar(local,{municipioId:p.id}).municipioAtivo().limite_geojson,geom);
 assert.throws(()=>central.registrarGeo(p.id,{lat:999,lng:999}),/inválido/);
});
test("contexto municipal escolhe Prefeitura na sessão, não altera banco global",()=>{
 const {central,session,local}=novo();central.entrarDemonstracao();
 const p=central.gravarPrefeitura({uf:"PR",cidade:londrina,status:"ativa"});
 central.acessarMunicipio(p.id);
 assert.equal(central.contextoMunicipal(),p.id);
 assert.equal(session.getItem(P.MUNICIPIO_CTX),p.id);
 assert.equal(D.criar(local).municipioAtivo().id,"maringa");
});
test("menu municipal não oferece implantar município e não altera grupos inferiores",()=>{
 const group=D.GROUPS;
 assert.deepEqual(group[1].items,["territorio","bairros","zonas","bases","riscos"]);
 assert.deepEqual(group[2].items,["pessoas"]);
 assert.deepEqual(group[3].items,["equipes","integrantes","voluntarios"]);
 assert.deepEqual(group[4].items,["solicitacoes","mobilizacoes","apoios"]);
 assert.deepEqual(group[5].items,["saude","emergencias","parceiros"]);
 assert.deepEqual(group[6].items,["veiculos","equipamentos","estoques","abrigos","pontos"]);
 assert.deepEqual(group[7].items,["ocorrencias","canais","regras"]);
 const municipal=fs.readFileSync(path.join(__dirname,"../../gestao/gestao.js"),"utf8");
 assert.match(municipal,/renderTerritorioMunicipal/);
 assert.match(municipal,/municipioId:CIDADE_DEMO/);
 assert.doesNotMatch(municipal,/\["Implantar Maringá"/);
 const platform=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.match(platform,/Administração Geral da Plataforma/);
 assert.doesNotMatch(platform,/Admin Geral de Maringá Alerta/);
});
