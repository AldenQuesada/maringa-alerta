/* Composição dos serviços de assistência no cadastro canônico. */
(function(root){
'use strict';
const {COMPATIBILIDADE}=root.AlertaCriseConfiguracao;
const {norm,telefone,mesmoTelefone,waLink}=root.AlertaCriseUtilidades;
function criar({armazenamento=root.localStorage,municipioId=null,escopoMunicipal=false,repositorio=null}={}){
 const D=root.AlertaGestaoDados;
 if(!D)throw Error('Carregue gestao/dados.js primeiro.');
 const db=repositorio||D.criar(armazenamento,escopoMunicipal&&municipioId?{municipioId}:{});
 if(municipioId&&db.municipioAtivo()?.id!==municipioId&&!escopoMunicipal)db.selecionarMunicipio(municipioId);
 const deps={db,D,...root.AlertaCriseUtilidades,COMPATIBILIDADE};
 const consultas=root.AlertaCriseConsultas.criar(deps);Object.assign(deps,consultas);
 const presenca=root.AlertaCrisePresenca.criar(deps);
 const colaboradores=root.AlertaCriseColaboradores.criar(deps);
 const compatibilidade=root.AlertaCriseCompatibilidade.criar(deps);Object.assign(deps,compatibilidade);
 const pedidos=root.AlertaCrisePedidos.criar(deps);
 const mobilizacao=root.AlertaCriseMobilizacao.criar(deps);
 const api={db,...consultas,...presenca,...colaboradores,...pedidos,...mobilizacao,compatíveis:compatibilidade.compatíveis};
 if(db.tipo==='supabase')for(const name of ['registrarColaborador','registrarPedido','registrarFase','acionarBrigada','registrarCheckin','registrarSaida','solicitarOutraPrefeitura']){
  api[name]=(...args)=>db.transacao(draft=>criar({repositorio:draft,municipioId,escopoMunicipal})[name](...args));
 }
 return api;
}
const api={criar,COMPATIBILIDADE,norm,telefone,mesmoTelefone,waLink};
root.AlertaCrise=api;root.MaringaCrise=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
