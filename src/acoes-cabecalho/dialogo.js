/* dialogo: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,alerts,defs,getPref,overlay,readIds,renderAlerts,renderEmergency,renderTasks,state,tasks,wrap}){
function open(id){
 state.lastFocus=document.activeElement;state.active=id;overlay.hidden=false;
 wrap.querySelectorAll("[data-header-action]").forEach(b=>b.setAttribute("aria-expanded",String(b.dataset.headerAction===id)));
 const d=defs.find(x=>x.id===id);
 $("ma-dialog-title").textContent=d?.label||"Ações";
 $("ma-eyebrow").textContent="GESTÃO MUNICIPAL · "+(getPref()?.nome||"Município");
 if(id==="tasks")renderTasks();
 else if(id==="alerts")renderAlerts();
 else renderEmergency(id);
 $("ma-dialog-close").focus({preventScroll:true});
}
function close(){
 if(overlay.hidden)return;overlay.hidden=true;
 wrap.querySelectorAll("[data-header-action]").forEach(b=>b.setAttribute("aria-expanded","false"));
 state.active=null;
 if(state.lastFocus?.isConnected)state.lastFocus.focus({preventScroll:true});
 state.lastFocus=null;
}
function updateBadges(){
 const n=tasks().filter(t=>t.status!=="done").length;
 const a=alerts();const seen=readIds(),unread=a.filter(x=>!seen.has(x.id)).length;
 for(const [id,count] of [["tasks",n],["alerts",unread]]){
  const el=$("ma-count-"+id);if(!el)continue;
  el.hidden=count===0;el.textContent=count>99?"99+":String(count);
 }
}
return {open,close,updateBadges};
}
root.AlertaCabecalhoDialogo={criar};
})(globalThis);
