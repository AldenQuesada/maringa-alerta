/* Recursos visuais de simulação. Nenhum dado é escrito no cadastro municipal. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LogisticaDemo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function selecionar(pontos,quantidade){
 const restantes=pontos.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 if(!restantes.length)return [];
 const escolhidos=[restantes.shift()];
 while(restantes.length&&escolhidos.length<quantidade){
  let idx=0,dist=-1;
  restantes.forEach((p,i)=>{const d=Math.min(...escolhidos.map(q=>(p.lat-q.lat)**2+(p.lng-q.lng)**2));if(d>dist){idx=i;dist=d;}});
  escolhidos.push(restantes.splice(idx,1)[0]);
 }
 return escolhidos;
}
function interpolar(a,b,progresso){const t=Math.max(0,Math.min(1,progresso));return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
return {selecionar,interpolar};
});
