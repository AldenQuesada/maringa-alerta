/* Composição dos serviços de assistência no cadastro canônico. */
(function(root){
'use strict';
const COMPATIBILIDADE=root.AlertaRegrasOperacionais?.compatibilidade||root.AlertaCriseConfiguracao.COMPATIBILIDADE;
const {norm,telefone,mesmoTelefone,waLink}=root.AlertaCriseUtilidades;
function criar({armazenamento=root.localStorage,municipioId=null,escopoMunicipal=false,repositorio=null}={}){
 const D=root.AlertaGestaoDados;
 if(!D)throw Error('Carregue gestao/dados.js primeiro.');
 const db=repositorio||D.criar(armazenamento,escopoMunicipal&&municipioId?{municipioId}:{});
 if(municipioId&&db.municipioAtivo()?.id!==municipioId&&!escopoMunicipal)db.selecionarMunicipio(municipioId);
 const deps={db,D,limitesGPS:D.parametros.gps,...root.AlertaCriseUtilidades,COMPATIBILIDADE};
 const consultas=root.AlertaCriseConsultas.criar(deps);Object.assign(deps,consultas);
 const presenca=root.AlertaCrisePresenca.criar(deps);
 const colaboradores=root.AlertaCriseColaboradores.criar(deps);
 const compatibilidade=root.AlertaCriseCompatibilidade.criar(deps);Object.assign(deps,compatibilidade);
 const pedidos=root.AlertaCrisePedidos.criar(deps);
 const mobilizacao=root.AlertaCriseMobilizacao.criar(deps);
 const api={db,...consultas,...presenca,...colaboradores,...pedidos,...mobilizacao,compatíveis:compatibilidade.compatíveis};
 if(db.tipo==='supabase')for(const name of ['registrarColaborador','registrarPedido','registrarFase','acionarBrigada','registrarCheckin','registrarSaida','solicitarOutraPrefeitura']){
  api[name]=async(...args)=>{
   const result=await db.transacao(draft=>criar({repositorio:draft,municipioId,escopoMunicipal})[name](...args));
   if(name==='acionarBrigada'){
    result.mobilizacao=db.registro('mobilizacoes',result.mobilizacao.id);
    result.destinatarios=JSON.parse(result.mobilizacao.destinatarios);
    result.envios=result.destinatarios.map(x=>({nome:x.nome,tipo:x.tipo,link:waLink(x.telefone,result.mensagem)}));
   }else if(['registrarCheckin','registrarSaida','registrarColaborador'].includes(name))return db.registro('voluntarios',result.id);
   else if(name==='registrarFase')return db.registro('solicitacoes',result.id);
   else if(name==='registrarPedido')result.pedido=db.registro('solicitacoes',result.pedido.id);
   return result;
  };
 }
 return api;
}
const api={criar,COMPATIBILIDADE,norm,telefone,mesmoTelefone,waLink};
root.AlertaCrise=api;root.MaringaCrise=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
