
(async function(){
"use strict";
const conectado=!!globalThis.AlertaNuvem?.ativo;
const demoMode=!conectado&&(new URLSearchParams(location.search).get('demo')==='1'||new URLSearchParams(location.search).get('modo')==='demo');
const tenantId=conectado?(sessionStorage.getItem('alerta_contexto_municipal_demo_v1')||'maringa'):'maringa';
const tenantConfig={nome:conectado?AlertaGestaoDados.criar(undefined,{municipioId:tenantId}).municipioAtivo().nome:'Maringá',marca:'MARINGÁ ALERTA',prefixo:'MA'};
const storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`;
 // O cadastro operacional salvo antes da migração continua visível no modo normal.
 // A ausência de ?demo=1 não apaga nem oculta equipes que já estavam salvas.
 const estadoAnterior=conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
 const exibirEquipesLegadas=demoMode||
   (estadoAnterior.estado==='restauravel'&&estadoAnterior.dados.voluntarios.length>0);

// O Mapa de Evento usa somente o contexto local de Maringá.


