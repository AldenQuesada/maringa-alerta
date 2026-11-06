
(async function(){
"use strict";
const demoMode=new URLSearchParams(location.search).get('demo')==='1';
const tenantId='maringa';
const tenantConfig={nome:'Maringá',marca:'MARINGÁ ALERTA',prefixo:'MA'};
const storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`;
 // O cadastro operacional salvo antes da migração continua visível no modo normal.
 // A ausência de ?demo=1 não apaga nem oculta equipes que já estavam salvas.
 const estadoAnterior=OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
 const exibirEquipesLegadas=demoMode||
   (estadoAnterior.estado==='restauravel'&&estadoAnterior.dados.voluntarios.length>0);

// O Mapa de Evento usa somente o contexto local de Maringá.


