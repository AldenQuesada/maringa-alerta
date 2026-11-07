/* AlertaCadastrosConsultas: contrato independente, dependências recebidas na criação. */
(function(global){
'use strict';
function criar({store,scopedId,ESQUEMAS,COLLECTIONS}){
const {refresh,salvar}=store;
function municipioCorrente(){return scopedId||store.value.municipioAtivo;}
function municipios(){refresh();return store.value.prefeituras.filter(x=>!scopedId||x.id===scopedId).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"))}
function municipioAtivo(){refresh();return store.value.prefeituras.find(x=>x.id===municipioCorrente())||null}
function selecionarMunicipio(id){
  refresh();
  if(scopedId&&id!==scopedId)throw new Error("Município fora do escopo municipal.");
  if(!store.value.prefeituras.some(x=>x.id===id))throw new Error("Município não encontrado.");
  if(!scopedId){store.value.municipioAtivo=id;salvar();}
  return municipioAtivo();
 }
function lista(modulo,id=municipioCorrente()){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  return store.value[m.collection].filter(x=>m.collection==="prefeituras"?(!scopedId||x.id===scopedId):x.municipioId===(scopedId||id))
   .filter(x=>!m.role||x.funcao===m.role||(Array.isArray(x.papeis)&&x.papeis.includes(m.role))).filter(x=>!m.category||x.categoria===m.category)
   .sort((a,b)=>String(a.nome||a.identificacao||"").localeCompare(String(b.nome||b.identificacao||""),"pt-BR"));
 }
function registro(modulo,id){return lista(modulo).find(x=>x.id===id)||null}
function estadoVisivel(){
  refresh();
  if(!scopedId)return JSON.parse(JSON.stringify(store.value));
  const result=JSON.parse(JSON.stringify(store.value));result.municipioAtivo=scopedId;
  for(const k of COLLECTIONS){
   result[k]=k==="prefeituras"?result[k].filter(x=>x.id===scopedId):result[k].filter(x=>x.municipioId===scopedId);
  }
  return result;
 }
return {municipioCorrente,municipios,municipioAtivo,selecionarMunicipio,lista,registro,estadoVisivel};
}
global.AlertaCadastrosConsultas={criar};
})(globalThis);
