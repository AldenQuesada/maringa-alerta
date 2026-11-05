 function implantarPacote(pacote){
  refresh();
  if(scopedId)throw new Error("Implantação territorial inicial pertence ao Admin Geral.");
  if(estado.municipioAtivo!=="maringa"||municipioAtivo()?.codigo_ibge!=="4115200")throw new Error("Implantação automática disponível somente para Maringá.");
  if(!pacote||typeof pacote!=="object")throw new Error("Pacote de importação inválido.");
  const allowed=["bairros","zonas","bases","riscos","pontos","saude","emergencias","parceiros"];
  const grupos=pacote.grupos||{},tmp={value:JSON.stringify(estado)};
  const virtual={getItem:key=>key===CHAVE?tmp.value:null,setItem:(key,value)=>{if(key===CHAVE)tmp.value=String(value);}};
  const test=criar(virtual),totais={};
  for(const name of allowed){
   if(!Object.hasOwn(grupos,name))continue;
   totais[name]=test.importarLote(name,grupos[name]);
  }
  if(pacote.municipioGeo){
   if(pacote.municipioGeo.limite_geojson&&String(pacote.municipioGeo.limite_geojson).length>1350000)throw new Error("Malha municipal acima do limite.");
   test.atualizarGeo("maringa",pacote.municipioGeo);
  }
  test.gravar("implantacao",{nome:"Implantação territorial Maringá",status:"Conferência local",fonte:String(pacote.fonte||"IBGE/CNES/GeoMaringá"),criado_em:new Date().toISOString(),quantidade:Object.values(totais).reduce((a,x)=>a+x.novos+x.atualizados,0)});
  const velho=estado;
  estado=JSON.parse(tmp.value);
  try{salvar()}catch(e){estado=velho;throw e}
  return {totais,municipio:municipioAtivo()};
 }
 function excluir(modulo,id){
  refresh();
  const m=ESQUEMAS[modulo];if(scopedId&&m?.collection==="prefeituras")throw new Error("Somente Admin Geral pode excluir Prefeituras.");
  const old=registro(modulo,id);if(!old)return false;
  if(m.collection==="prefeituras"&&estado.prefeituras.length===1)throw new Error("É necessário manter pelo menos uma prefeitura.");
  estado[m.collection]=estado[m.collection].filter(x=>x.id!==id);
  if(m.collection==="prefeituras"){for(const k of COLLECTIONS.filter(x=>x!=="prefeituras"))estado[k]=estado[k].filter(x=>x.municipioId!==id);
   if(estado.municipioAtivo===id)estado.municipioAtivo=estado.prefeituras[0]?.id||"";}
  salvar();return true;
 }
 function estadoVisivel(){
  refresh();
  if(!scopedId)return JSON.parse(JSON.stringify(estado));
  const result=JSON.parse(JSON.stringify(estado));result.municipioAtivo=scopedId;
  for(const k of COLLECTIONS){
   result[k]=k==="prefeituras"?result[k].filter(x=>x.id===scopedId):result[k].filter(x=>x.municipioId===scopedId);
  }
  return result;
 }
 return {municipios,municipioAtivo,selecionarMunicipio,lista,registro,gravar,importarLote,implantarPacote,atualizarGeo,excluir,estado:estadoVisivel,modo:accessMode,municipioEscopo:scopedId};
}
const api={CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,criar};
global.AlertaGestaoDados=api;if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:window);
