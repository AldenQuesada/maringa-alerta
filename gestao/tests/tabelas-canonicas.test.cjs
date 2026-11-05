"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const D=require("../dados.js");
const read=p=>fs.readFileSync(path.join(__dirname,"../..",p),"utf8");
const app=read("gestao/gestao.js");
const catalogo=read("gestao/catalogo-bairros.js");
const unidades=JSON.parse(read("dados-territoriais/maringa-unidades-cnes.json"));
const basesRiscos=JSON.parse(read("dados-territoriais/maringa-bases-riscos-publicos.json"));
function store(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};}
test("prefeitura usa abas diretas com tabelas e botão no topo",()=>{
 assert.match(app,/const PREF_TABS=\[\["territorio","Gerais"\],\["geoterritorialidade","Geoterritorialidade"\],\["estruturas","Estruturas"\],\["bases","Bases"\],\["riscos","Riscos"\]\]/);
 assert.match(app,/topo\("Gerais"[^;]+"pessoas"\)/);
 assert.match(app,/topo\("Estruturas"[^;]+m\)/);
 assert.match(app,/topo\("Geoterritorialidade"[^;]+geoTipo\)/);
 assert.match(app,/abrirDrawer\(null,novo\.dataset\.new\)/);
 assert.match(app,/data-canon-edit="pessoas"/);
 assert.match(app,/<th>Nome<\/th><th>Cargo<\/th><th>Função<\/th><th>Estrutura representada<\/th>/);
 assert.match(app,/esc\(x\.cargo\|\|"Não informado"\)/);
 assert.match(app,/esc\(x\.funcao\|\|"—"\)/);
 assert.doesNotMatch(app,/pref-member-grid|renderRH\(\)/);
});
test("a geoterritorialidade prioriza zonas numeradas oficiais, sem criar outro cadastro",()=>{
 assert.match(app,/geoTipo="zonas"/);
 assert.match(catalogo,/localidades\/municipios\/.*subdistritos/);
 assert.match(catalogo,/db\(\)\.lista\(type\)/);
 assert.match(catalogo,/gestao:referencia-territorial/);
 assert.match(catalogo,/data-geo-edit/);
 assert.match(catalogo,/data-geo-ref/);
 assert.doesNotMatch(catalogo,/mi-official-catalog|mi-zone-list/);
});
test("referência CNES contém 69 unidades distintas verificáveis",()=>{
 assert.equal(unidades.municipio_ibge,"4115200");
 assert.equal(unidades.unidades.length,69);
 assert.equal(new Set(unidades.unidades.map(x=>x.codigo_cnes)).size,69);
 assert.equal(unidades.unidades.filter(x=>x.grupo==="saude").length,65);
 assert.equal(unidades.unidades.filter(x=>x.grupo==="emergencias").length,4);
});
test("as 69 unidades utilizam coleções existentes e não duplicam ao importar",()=>{
 const db=D.criar(store(),{municipioId:"maringa"});
 for(const modulo of ["saude","emergencias"]){
  const dados=unidades.unidades.filter(x=>x.grupo===modulo).map(x=>({nome:x.nome,tipo:x.tipo,codigo_cnes:x.codigo_cnes,externalId:"cnes:"+x.codigo_cnes,fonte:unidades.fonte,verificacao:"Em conferência"}));
  const primeiro=db.importarLote(modulo,dados);
  assert.equal(primeiro.novos,dados.length);
  assert.equal(db.lista(modulo).length,dados.length);
  const segundo=db.importarLote(modulo,dados);
  assert.equal(segundo.novos,0);
  assert.equal(db.lista(modulo).length,dados.length);
 }
 assert.equal(db.estado().instituicoes.length,69);
});

test("Bases e Riscos públicos têm origem rastreável, não simulam coordenadas nem homologação",()=>{
 assert.equal(basesRiscos.municipio_ibge,"4115200");
 assert.equal(basesRiscos.bases.length,6);
 assert.equal(basesRiscos.bases.filter(x=>x.tipo==="Centro de coleta de donativos").length,5);
 assert.equal(basesRiscos.riscos.length,3);
 for(const [modulo,items] of [["bases",basesRiscos.bases],["riscos",basesRiscos.riscos]]){
  assert.equal(new Set(items.map(x=>x.externalId)).size,items.length);
  for(const x of items){
   assert.ok(x.nome&&x.url_fonte.startsWith("https://")&&x.fonte,x.nome);
   assert.equal(x.verificacao,"Em conferência");
   if(modulo==="bases"&&x.tipo==="Centro de coleta de donativos"){
    assert.ok(Number.isFinite(x.lat)&&Number.isFinite(x.lng),"Centro com referência de endereço: "+x.nome);
    assert.match(x.geo_status,/aproximad/i,"A coordenada não é o imóvel confirmado");
    assert.match(x.geo_fonte,/^https:\/\//);
   }else{
    assert.equal(x.lat,undefined);
    assert.equal(x.lng,undefined);
   }
   assert.equal(x.geojson,undefined);
  }
  assert.ok(D.ESQUEMAS[modulo].columns.includes("verificacao"));
 }
});
test("Importação de fontes públicas reutiliza cadastro existente e respeita verificação manual",()=>{
 const db=D.criar(store(),{municipioId:"maringa"});
 for(const modulo of ["bases","riscos"]){
  const regs=basesRiscos[modulo];
  const primeiro=db.importarLote(modulo,regs);
  assert.equal(primeiro.novos,regs.length);
  assert.equal(db.lista(modulo).length,regs.length);
  const segundo=db.importarLote(modulo,regs);
  assert.equal(segundo.novos,0);
  assert.equal(db.lista(modulo).length,regs.length);
  const registro=db.lista(modulo)[0];
  db.gravar(modulo,{...registro,verificacao:"Validado",fonte:"Validação municipal"},registro.id);
  db.importarLote(modulo,regs);
  assert.equal(db.registro(modulo,registro.id).verificacao,"Validado");
  assert.equal(db.registro(modulo,registro.id).fonte,"Validação municipal");
 }
});

test("Importador central reutiliza registros antigos, preenche georreferenciamento e preserva validação municipal",()=>{
 const I=require("../../dados-territoriais/importacao-publica.js");
 const db=D.criar(store(),{municipioId:"maringa"});
 const antigo=basesRiscos.bases.find(x=>x.nome.startsWith("SISMMar"));
 const salvo=db.importarLote("bases",[{nome:antigo.nome,externalId:antigo.externalId,fonte:"Registro anterior",verificacao:"Em conferência"}]);
 assert.equal(salvo.novos,1);
 const primeira=I.importar(db,basesRiscos);
 assert.equal(db.lista("bases").length,6);
 assert.equal(db.lista("riscos").length,3);
 const sismmar=db.lista("bases").find(x=>x.externalId===antigo.externalId);
 assert.equal(sismmar.id,db.lista("bases").find(x=>x.nome===antigo.nome).id);
 assert.ok(sismmar.lat&&sismmar.lng);
 assert.equal(sismmar.fonte,"Registro anterior","Fonte de uma edição existente não deve ser apagada");
 assert.equal(sismmar.tipo,"Centro de coleta de donativos");
 assert.equal(primeira.novos,8);
 const segunda=I.importar(db,basesRiscos);
 assert.equal(segunda.novos,0);
 assert.equal(segunda.atualizados,0);
 db.gravar("bases",{...sismmar,verificacao:"Validado",lat:"-23.1",lng:"-51.9"},sismmar.id);
 I.importar(db,basesRiscos);
 assert.equal(db.registro("bases",sismmar.id).lat,"-23.1");
 assert.equal(db.registro("bases",sismmar.id).verificacao,"Validado");
 const outroMunicipio=D.criar(store(),{municipioId:"maringa"});
 assert.equal(I.importar(outroMunicipio,{...basesRiscos,municipio_ibge:"4113700"}).novos,0);
});
