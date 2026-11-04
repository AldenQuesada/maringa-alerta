"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const C=require("../implantacao-core.js");
const D=require("../dados.js");
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function novo(){const store=storage();return {db:D.criar(store),store};}
test("hierarquia única Brasil / Paraná / Maringá valida município",()=>{
 assert.equal(C.validarHierarquia({pais:"BR",uf:"PR",codigo:"4115200"}),true);
 assert.throws(()=>C.validarHierarquia({pais:"BR",uf:"SP",codigo:"4115200"}),/somente/);
 assert.deepEqual(C.validarMunicipioIBGE({id:4115200,nome:"Maringá"}).codigo_ibge,"4115200");
 assert.throws(()=>C.validarMunicipioIBGE({id:3550308,nome:"São Paulo"}),/diferente/);
});
test("malha IBGE exige polígono e recusa dados alheios",()=>{
 const geo={type:"FeatureCollection",features:[{type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[[[-51.9,-23.4],[-51.8,-23.4],[-51.9,-23.5],[-51.9,-23.4]]]}}]};
 const result=C.normalizaMalha(geo);
 assert.equal(result.type,"Polygon");
 assert.throws(()=>C.normalizaMalha({type:"Point",coordinates:[-51.9,-23.4]}),/polígono/);
});
test("CNES transforma tipos UBS, UPA, hospitais e rejeita outra cidade",()=>{
 const base={codigo_municipio:4115200,codigo_cnes:789,name:"test"};
 const ubs=C.cnesItem({...base,nome_fantasia:"UBS Zona 7",latitude_estabelecimento:"-23.401",longitude_estabelecimento:"-51.931"});
 assert.equal(ubs.tipo,"UBS");assert.equal(ubs.codigo_cnes,"789");assert.equal(ubs.lat,-23.401);
 assert.equal(C.cnesItem({...base,codigo_cnes:790,nome_fantasia:"UPA Zona Norte"}).tipo,"UPA");
 assert.equal(C.cnesItem({...base,codigo_cnes:791,nome_fantasia:"Hospital do Centro"}).tipo,"Hospital");
 assert.equal(C.cnesItem({...base,codigo_municipio:3550308,nome_fantasia:"Hospital de São Paulo"}),null);
});
test("CSV CNES com separador, aspas e cidade de Maringá",()=>{
 const csv='IBGE;UF;MUNICIPIO;CNES;NOME FANTASIA;LOGRADOURO;BAIRRO;LATITUDE;LONGITUDE\n4115200;PR;Maringá;1234567;"Hospital, Maringá";Rua Teste;Centro;-23.422;-51.94\n3550308;SP;São Paulo;7654321;Hospital SP;Rua Outra;Centro;-23.5;-46.6\n';
 const rows=C.parseCSV(csv);
 assert.equal(rows.length,2);const m=rows.map(C.linhaCSVParaCNES).filter(Boolean);
 assert.equal(m.length,1);assert.equal(m[0].nome,"Hospital, Maringá");assert.equal(m[0].codigo_cnes,"1234567");
});
test("GeoJSON cadastra bairros e pontos somente com geometria",()=>{
 const bairro=C.geoItems({type:"FeatureCollection",features:[{type:"Feature",properties:{NOME:"Zona Centro"},geometry:{type:"Polygon",coordinates:[[[-51.9,-23.4],[-51.8,-23.4],[-51.9,-23.5],[-51.9,-23.4]]]}}]},"bairros");
 assert.equal(bairro.length,1);assert.equal(bairro[0].nome,"Zona Centro");assert.ok(bairro[0].geojson);
 const point=C.geoItems({type:"FeatureCollection",features:[{type:"Feature",properties:{nome:"UBS Exemplo"},geometry:{type:"Point",coordinates:[-51.93,-23.43]}}]},"instituicoes");
 assert.equal(point[0].lat,-23.43);
});
test("estado antigo em localStorage é compatível e preservado",()=>{
 const {db,store}=novo();
 const existing=db.gravar("saude",{nome:"Hospital existente",tipo:"Hospital",codigo_cnes:"999",endereco:"A",telefone:"44"});
 const before=store.getItem(D.CHAVE);
 const after=D.criar(store);assert.equal(after.registro("saude",existing.id).nome,"Hospital existente");
 assert.ok(before.includes("Hospital existente"));
});
test("importação unificada salva bairros, CNES e limite sem mexer em doações e equipes",()=>{
 const {db,store}=novo();
 const equipe=db.gravar("equipes",{nome:"Brigada Municipal",tipo:"Logística",zona:"Zona 7"});
 const col=db.gravar("voluntarios",{nome:"Voluntário",tipo_pessoa:"FÍSICA",endereco:"Rua Teste",telefone:"44999990000"});
 const poly={type:"Polygon",coordinates:[[[-51.9,-23.4],[-51.8,-23.4],[-51.9,-23.5],[-51.9,-23.4]]]};
 const p=db.implantarPacote({grupos:{
  bairros:[{nome:"Centro",id:"bairro-centro",geojson:JSON.stringify(poly),externalId:"bairro:centro",verificacao:"Pendente"}],
  saude:[{nome:"UPA Nova",tipo:"UPA",categoria:"Saúde",codigo_cnes:"100",externalId:"cnes:100",lat:-23.4,lng:-51.93,verificacao:"Pendente"}],
  emergencias:[{nome:"Corpo de Bombeiros",tipo:"Bombeiros",categoria:"Emergência",verificacao:"Pendente"}]
 },municipioGeo:{limite_geojson:JSON.stringify(poly),fonte_geo:"IBGE"}});
 assert.equal(p.totais.saude.novos,1);
 assert.equal(db.lista("bairros").length,1);
 assert.equal(db.lista("saude").length,1);
 assert.equal(db.lista("emergencias").length,1);
 assert.equal(db.lista("equipes")[0].id,equipe.id);
 assert.equal(db.lista("voluntarios")[0].id,col.id);
 assert.ok(db.municipioAtivo().limite_geojson.includes("Polygon"));
 assert.ok(D.criar(store).municipioAtivo().limite_geojson);
});
test("reimportação é idempotente e preserva cadastro validado",()=>{
 const {db}=novo();const item={nome:"Hospital Exemplo",tipo:"Hospital",codigo_cnes:"101",externalId:"cnes:101",verificacao:"Pendente"};
 db.implantarPacote({grupos:{saude:[item]}});
 const old=db.lista("saude")[0];
 db.implantarPacote({grupos:{saude:[{...item,endereco:"Rua Nova"}]}});
 assert.equal(db.lista("saude").length,1);assert.equal(db.lista("saude")[0].id,old.id);
 const atual=db.lista("saude")[0];
 db.gravar("saude",{...atual,verificacao:"Validado",endereco:"Rua Confirmada"},atual.id);
 db.implantarPacote({grupos:{saude:[{...item,endereco:"Endereço indevido"}]}});
 assert.equal(db.lista("saude")[0].endereco,"Rua Confirmada");
});
test("erro de lote impede gravação parcial em múltiplas coleções",()=>{
 const {db,store}=novo(),before=store.getItem(D.CHAVE);
 assert.throws(()=>db.implantarPacote({grupos:{saude:[{nome:"UBS",codigo_cnes:"100"}],bairros:[{nome:""}]}}),/nome/);
 assert.equal(store.getItem(D.CHAVE),before);
});
test("fontes de outras cidades não entram e ponto distante é recusado",()=>{
 assert.equal(C.cnesItem({codigo_municipio:3550308,codigo_cnes:123,nome_fantasia:"UPA São Paulo"}),null);
 assert.equal(C.normalizeCoordinates(-22.9,-43.2),null);
});
test("pessoas e hierarquia convivem com telas legadas sem duplicação",()=>{
 const {db}=novo();
 const r=db.gravar("pessoas",{nome:"Responsável Teste",funcao:"responsavel",papeis:["coordenador"],zona:"Zona 7",orgao:"Defesa Civil"});
 assert.equal(db.lista("pessoas").length,1);
 assert.equal(db.lista("responsaveis")[0].id,r.id);
 assert.equal(db.lista("coordenadores")[0].id,r.id);
 assert.equal(db.lista("substitutos").length,0);
});
test("somente os dois primeiros grupos mudam e três mapas ficam intactos",()=>{
 const group=D.GROUPS;
 assert.deepEqual(group[1].items,["territorio","bairros","zonas","bases","riscos"]);
 assert.deepEqual(group[2].items,["pessoas"]);
 assert.ok(!group[1].items.includes("prefeituras")&&!group[1].items.includes("implantacao"),"provisionamento pertence ao Admin Geral");
 const legacy={"Equipes e comunidade":["equipes","integrantes","voluntarios"],
 "Ajuda e mobilização":["solicitacoes","mobilizacoes","apoios"],
 "Rede de emergência":["saude","emergencias","parceiros"],
 "Infraestrutura e recursos":["veiculos","equipamentos","estoques","abrigos","pontos"],
 "Regras e comunicação":["ocorrencias","canais","regras"]};
 for(const g of group.slice(3))assert.deepEqual(g.items,legacy[g.label],"grupo alterado: "+g.label);
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 assert.equal((html.match(/class="map-arrow"/g)||[]).length,3);
 assert.match(html,/implantacao-ui.js/);
 assert.match(html,/acoes-cabecalho.js/);
});
