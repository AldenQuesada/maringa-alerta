
(async function(){
"use strict";
const demoMode=new URLSearchParams(location.search).get('demo')==='1';
const tenantId='maringa';
const tenantConfig={nome:'Maringá',marca:'MARINGÁ ALERTA',prefixo:'MA'};
const storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`;
// O Mapa de Evento usa somente o contexto local de Maringá.


