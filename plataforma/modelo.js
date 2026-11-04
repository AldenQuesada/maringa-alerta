/* Administração central demonstrativa do SaaS — independente de município.
 * A sessão local NÃO autentica usuários; produção precisa de backend e RLS.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 root.AlertaAdminPlataforma=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
const SESSION="alerta_admin_plataforma_demo_v1";
const MUNICIPIO_CTX="alerta_contexto_municipal_demo_v1";
const STATUSES=["implantacao","ativa","suspensa"];
const normalize=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function criar({armazenamento=root.localStorage,sessoes=root.sessionStorage,dados=root.AlertaGestaoDados}={}){
 if(!dados)throw Error("Carregue o modelo de dados antes da Administração Geral.");
 const db=dados.criar(armazenamento);
 function sessaoAtiva(){return sessoes.getItem(SESSION)==="ativa";}
 function entrarDemonstracao(){sessoes.setItem(SESSION,"ativa");return true;}
 function sairDemonstracao(){sessoes.removeItem(SESSION);}
 function assertSession(){ /* O catálogo público do protótipo é consultável sem sessão simulada. Não representa autorização de produção. */ }
 function municipios(){assertSession();return db.municipios();}
 function validarUF(uf){if(!dados.UFS.includes(uf))throw Error("UF inválida.");}
 function normalizarCidade(oficial,uf){
  if(!oficial||typeof oficial!=="object")throw Error("Selecione município retornado pelo IBGE.");
  const nome=String(oficial.nome||"").trim(),codigo=String(oficial.id||oficial.codigo_ibge||"").trim();
  if(!nome||!/^\d{7}$/.test(codigo))throw Error("Dados oficiais incompletos.");
  if(uf==="PR"&&!codigo.startsWith("41"))throw Error("Município fora do Paraná.");
  const returnedUF=oficial?.microrregiao?.mesorregiao?.UF?.sigla||
    oficial?.["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla||
    oficial?.uf?.sigla;
  if(returnedUF&&returnedUF!==uf)throw Error("Município pertence a outra UF.");
  return {nome,codigo};
 }
 function gravarPrefeitura({pais="BR",uf,estado="",cidade,telefone="",email="",adminMunicipal="",status="implantacao"}={},id=null){
  assertSession();
  if(pais!=="BR")throw Error("País não habilitado nesta implantação.");
  validarUF(uf);
  if(!STATUSES.includes(status))throw Error("Situação inválida.");
  const c=normalizarCidade(cidade,uf);
  const current=id?db.municipios().find(x=>x.id===id):null;
  if(id&&!current)throw Error("Prefeitura não encontrada.");
  if(current&&current.codigo_ibge!==c.codigo)throw Error("Não é permitido alterar o código IBGE de uma Prefeitura existente.");
  if(db.municipios().some(x=>x.codigo_ibge===c.codigo&&x.id!==id))throw Error("Prefeitura já cadastrada.");
  const input={uf,nome:c.nome,codigo_ibge:c.codigo,pais:"Brasil",paisId:"BR",estado:String(estado).trim(),codigo_uf:c.codigo.slice(0,2),
   status,responsavel:String(adminMunicipal).trim(),admin_municipal_email:String(email).trim(),
   telefone:String(telefone).trim(),email:String(email).trim(),origem_provisionamento:"Admin Geral · IBGE"};
  return db.gravar("prefeituras",input,id);
 }
 function mudarSituacao(id,status){
  assertSession();if(!STATUSES.includes(status))throw Error("Situação inválida.");
  const old=db.municipios().find(x=>x.id===id);if(!old)throw Error("Prefeitura não encontrada.");
  const form=Object.fromEntries(dados.ESQUEMAS.prefeituras.fields.map(f=>[f.key,old[f.key]??""]));
  form.status=status;return db.gravar("prefeituras",form,id);
 }
 function registrarGeo(id,{lat,lng,bbox=null,limite_geojson=null,fonte="IBGE",geo_atualizado=new Date().toISOString()}={}){
  assertSession();
  const p=db.municipios().find(x=>x.id===id);if(!p)throw Error("Prefeitura não encontrada.");
  const la=Number(lat),lo=Number(lng);
  if(!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90||Math.abs(lo)>180||la===0&&lo===0)throw Error("Centro geográfico inválido.");
  const geo={lat:la,lng:lo,fonte_geo:String(fonte),geo_atualizado};
  if(bbox){if(!Array.isArray(bbox)||bbox.length!==4||bbox.some(x=>!Number.isFinite(Number(x))))throw Error("Caixa geográfica inválida.");geo.bbox=bbox.map(Number);}
  if(limite_geojson){
   if(typeof limite_geojson!=="string"||limite_geojson.length>1250000)throw Error("Geometria acima do limite local.");
   const geometry=JSON.parse(limite_geojson);
   if(!["Polygon","MultiPolygon"].includes(geometry?.type))throw Error("Geometria não poligonal.");
   geo.limite_geojson=limite_geojson;
  }
  return db.atualizarGeo(id,geo);
 }
 function acessarMunicipio(id){
  assertSession();
  const item=db.municipios().find(x=>x.id===id);if(!item)throw Error("Prefeitura não encontrada.");
  if(item.status==="suspensa")throw Error("Prefeitura suspensa.");
  sessoes.setItem(MUNICIPIO_CTX,id);
  return item;
 }
 function contextoMunicipal(){return sessoes.getItem(MUNICIPIO_CTX)||"maringa";}
 return {entrarDemonstracao,sairDemonstracao,sessaoAtiva,municipios,gravarPrefeitura,mudarSituacao,registrarGeo,acessarMunicipio,contextoMunicipal,db,SESSION,MUNICIPIO_CTX};
}
return {criar,SESSION,MUNICIPIO_CTX,STATUSES};
});