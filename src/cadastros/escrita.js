/* AlertaCadastrosEscrita: contrato independente, dependências recebidas na criação. */
(function(global){
'use strict';
function criar({store,scopedId,ESQUEMAS,COLLECTIONS,read}){
const {refresh,salvar}=store;const {registro,municipioCorrente}=read;
function gravar(modulo,form,id){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  if(scopedId&&m.collection==="prefeituras")throw new Error("Somente o Admin Geral pode criar ou alterar Prefeituras.");
  const atual=id?registro(modulo,id):null;if(id&&!atual)throw new Error("Registro não encontrado neste município.");
  const campos={};for(const f of m.fields){let val=form[f.key];if(typeof val==="string")val=val.trim();if(val===undefined||val===null)val="";if(f.required&&!String(val).trim())throw new Error("Preencha: "+f.label+".");campos[f.key]=val;}
  if(modulo==="eventos"&&campos.mapa_evento_id){
   const listaEventos=store.value.eventos.filter(e=>e.municipioId===municipioCorrente());
   const visitados=new Set(id?[String(id)]:[]);let ref=String(campos.mapa_evento_id);
   while(ref){if(visitados.has(ref))throw new Error("O evento não pode formar um vínculo circular de mapas.");visitados.add(ref);const alvo=listaEventos.find(e=>e.id===ref);if(!alvo)throw new Error("Evento de referência não encontrado neste município.");ref=String(alvo.mapa_evento_id||"");}
  }
  if(m.collection==="prefeituras"){
   if(!/^\d{7}$/.test(String(campos.codigo_ibge)))throw new Error("Informe um código IBGE válido.");
   if(store.value.prefeituras.some(x=>x.id!==id&&x.codigo_ibge===campos.codigo_ibge))throw new Error("Esta prefeitura já está cadastrada.");
  } else if(!municipioCorrente())throw new Error("Cadastre primeiro uma prefeitura.");
  const generated=(global.crypto&&typeof global.crypto.randomUUID==="function")?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const item={...(atual||{}),...campos,id:id||generated,municipioId:m.collection==="prefeituras"?undefined:municipioCorrente()};
  if(m.role)item.funcao=m.role;if(m.category)item.categoria=m.category;
  if(!atual){store.value[m.collection].push(item)}else{const idx=store.value[m.collection].findIndex(x=>x.id===id);store.value[m.collection][idx]=item}
  salvar();return item;
 }
function atualizarGeo(id,geo){refresh();if(scopedId)throw new Error("Georreferenciamento inicial pertence ao Admin Geral.");const p=store.value.prefeituras.find(x=>x.id===id);if(!p)return null;for(const k of ["lat","lng","zoom","bbox","limite_geojson","fonte_geo","geo_atualizado","pais","paisId","estado","codigo_uf"]){if(geo[k]!==undefined)p[k]=geo[k]}salvar();return p;}
function excluir(modulo,id){
  refresh();
  const m=ESQUEMAS[modulo];if(scopedId&&m?.collection==="prefeituras")throw new Error("Somente Admin Geral pode excluir Prefeituras.");
  const old=registro(modulo,id);if(!old)return false;
  if(m.collection==="prefeituras"&&store.value.prefeituras.length===1)throw new Error("É necessário manter pelo menos uma prefeitura.");
  store.value[m.collection]=store.value[m.collection].filter(x=>x.id!==id);
  if(m.collection==="prefeituras"){for(const k of COLLECTIONS.filter(x=>x!=="prefeituras"))store.value[k]=store.value[k].filter(x=>x.municipioId!==id);
   if(store.value.municipioAtivo===id)store.value.municipioAtivo=store.value.prefeituras[0]?.id||"";}
  salvar();return true;
 }
return {gravar,atualizarGeo,excluir};
}
global.AlertaCadastrosEscrita={criar};
})(globalThis);
