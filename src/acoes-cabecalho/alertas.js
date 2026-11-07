/* alertas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,chaveAlertas,esc,getId,put,readIds,salvarLeituras,message,scopedDB,updateBadges,wrap}){
function alerts(){
 const db=scopedDB(),id=getId();
 const state=db.estado();
 const list=[];
 for(const x of state.solicitacoes||[]){
  if(x.municipioId!==id||x.status!=="Aguardando")continue;
  list.push({id:"pedido:"+x.id,kind:x.urgencia==="Crítica"?"critical":x.urgencia==="Alta"?"high":"normal",
    title:"Pedido aguardando · "+(x.necessidade||"Ajuda"),sub:"Zona "+(x.zona||"não informada")+" · "+(x.urgencia||"Normal"),href:(wrap.dataset.mapas||"../mapas/")+"?tipo=ajuda"});
 }
 for(const x of state.mobilizacoes||[]){
  if(x.municipioId!==id||x.status!=="Preparada")continue;
  list.push({id:"mobilizacao:"+x.id,kind:"high",title:"Brigada preparada",sub:x.zona||"Zona não informada",href:(wrap.dataset.mapas||"../mapas/")+"?tipo=colaboradores"});
 }
 for(const x of state.apoios||[]){
  if(x.municipioId!==id||x.status!=="Preparada")continue;
  list.push({id:"apoio:"+x.id,kind:"high",title:"Pedido intermunicipal preparado",sub:x.destino||"Prefeitura destinatária",href:(wrap.dataset.mapas||"../mapas/")+"?tipo=ajuda"});
 }
 const rank={critical:0,high:1,normal:2};
 return list.sort((a,b)=>rank[a.kind]-rank[b.kind]||a.title.localeCompare(b.title,"pt-BR"));
}
function renderAlerts(){
 const data=alerts(),seen=readIds();
 $("ma-dialog-body").innerHTML='<p class="ma-note">Alertas locais: pedidos de ajuda aguardando, brigadas e solicitações intermunicipais preparadas. Não substituem alertas oficiais da Defesa Civil ou do Mapa de Evento.</p>'+
 '<div class="ma-alert-summary"><strong>'+data.filter(x=>!seen.has(x.id)).length+' não lidos</strong><button type="button" class="ma-light" id="ma-mark-all">Marcar todos como lidos</button></div>'+
 (data.length?data.map(x=>'<div class="ma-alert-row '+esc(x.kind)+'"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></div><div class="ma-row-actions">'+(seen.has(x.id)?'<span class="ma-read">Lido</span>':'<button type="button" data-alert-read="'+esc(x.id)+'">Lido</button>')+'<a href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer">Abrir</a></div></div>').join(""):'<p class="ma-empty">Nenhum alerta de gestão pendente neste navegador.</p>')+
 '<a class="ma-map-link" href="../index.html" target="_blank" rel="noopener noreferrer">Abrir alertas e prontidão no Mapa de Evento</a><p id="ma-message" class="ma-notice" role="status" hidden></p>';
 $("ma-mark-all").onclick=async()=>{if(!await salvarLeituras([...new Set([...readIds(),...data.map(x=>x.id)])])){message("Falha ao salvar leitura.");return;}renderAlerts();updateBadges();};
 $("ma-dialog-body").querySelectorAll("[data-alert-read]").forEach(b=>b.onclick=async()=>{
  const seen=readIds();seen.add(b.dataset.alertRead);if(!await salvarLeituras([...seen])){message("Falha ao salvar leitura.");return;}renderAlerts();updateBadges();
 });
}
return {alerts,renderAlerts};
}
root.AlertaCabecalhoAlertas={criar};
})(globalThis);
