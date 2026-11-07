/* AlertaCadastrosImplantacao: contrato independente, dependências recebidas na criação. */
(function(global){
'use strict';
function criar({store,scopedId,CHAVE,read,criar}){
const {refresh,salvar}=store;const {municipioAtivo}=read;
function implantarPacote(pacote){
  refresh();
  if(scopedId)throw new Error("Implantação territorial inicial pertence ao Admin Geral.");
  if(!pacote||typeof pacote!=="object")throw new Error("Pacote de importação inválido.");
  const municipio=municipioAtivo();
  if(!municipio)throw new Error("Selecione o município de implantação.");
  if(String(pacote.codigo_ibge||pacote.municipioGeo?.codigo_ibge||"")!==String(municipio.codigo_ibge))throw new Error("Código IBGE divergente ou ausente no pacote.");
  const allowed=["bairros","zonas","bases","riscos","pontos","saude","emergencias","parceiros"];
  const grupos=pacote.grupos||{},tmp={value:JSON.stringify(store.value)};
  const virtual={getItem:key=>key===CHAVE?tmp.value:null,setItem:(key,value)=>{if(key===CHAVE)tmp.value=String(value);}};
  const test=criar(virtual,{semBootstrap:true}),totais={};
  for(const name of allowed){
   if(!Object.hasOwn(grupos,name))continue;
   totais[name]=test.importarLote(name,grupos[name]);
  }
  if(pacote.municipioGeo){
   if(pacote.municipioGeo.limite_geojson&&String(pacote.municipioGeo.limite_geojson).length>1350000)throw new Error("Malha municipal acima do limite.");
   test.atualizarGeo(municipio.id,pacote.municipioGeo);
  }
  test.gravar("implantacao",{nome:"Implantação territorial "+municipio.nome,status:"Conferência local",fonte:String(pacote.fonte||"Fonte municipal"),criado_em:new Date().toISOString(),quantidade:Object.values(totais).reduce((a,x)=>a+x.novos+x.atualizados,0)});
  const velho=store.value;
  store.value=JSON.parse(tmp.value);
  try{salvar()}catch(e){store.value=velho;throw e}
  return {totais,municipio:municipioAtivo()};
 }
return {implantarPacote};
}
global.AlertaCadastrosImplantacao={criar};
})(globalThis);
