/* Ações de cabeçalho inspiradas na organização do ClinicAI V2.
 * Adaptação exclusiva à gestão de crise; sem alertas sanitários nem chamada interna.
 * Dados demonstrativos no navegador. Ligações somente por gesto explícito do usuário.
 */
(function (global) {
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const D=global.AlertaGestaoDados;
if(!D||!$("header-actions"))return;
const TKEY="maringa_alerta_tarefas_gestao_v1_";
const LKEY="maringa_alerta_alertas_lidos_v1_";
const paths={
 tasks:'<path d="m9 11 2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
 alerts:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 samu:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2c-8.6-.9-16.8-9.1-17.7-17.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.8 10a16 16 0 0 0 6.2 6.2l1.4-1.5a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 bombeiros:'<path d="M12 22c4.4 0 7-3 7-7 0-3.3-1.9-5.3-4-7-.1 2-1 3.1-2.5 3.8.3-3.6-.7-6.4-3.6-9.8 0 3.7-1.6 5.1-3.2 7.6C4.4 11.8 5 14 5 15c0 4 2.6 7 7 7z"/><path d="M12 22c2 0 3-1.4 3-3 0-1.2-.9-2.3-2.3-3.4.2 2-.6 2.2-1.4 2.7-.4-1.2-1.4-2-2-2.9 0 1.7-1.3 2.1-1.3 3.6 0 1.6 1 3 4 3z"/>'
};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+paths[k]+'</svg>';
const defs=[
 {id:"tasks",label:"Tarefas",title:"Abrir painel de tarefas",cls:""},
 {id:"alerts",label:"Alertas",title:"Ver alertas locais",cls:""},
 {id:"samu",label:"SAMU 192",title:"Orientações para ligar ao SAMU 192",cls:"emergency"},
 {id:"bombeiros",label:"Bombeiros 193",title:"Orientações para ligar aos Bombeiros 193",cls:"emergency"}
];
const wrap=$("header-actions");
wrap.innerHTML=defs.map(d=>'<button type="button" class="ma-action '+d.cls+'" data-header-action="'+d.id+'" title="'+esc(d.title)+'" aria-label="'+esc(d.title)+'" aria-haspopup="dialog" aria-expanded="false">'+icon(d.id)+'<span class="ma-action-label">'+esc(d.label)+'</span><span class="ma-count" id="ma-count-'+d.id+'" hidden></span></button>').join("");
const overlay=document.createElement("div");
overlay.className="ma-overlay";overlay.hidden=true;
overlay.innerHTML='<section class="ma-dialog" role="dialog" aria-modal="true" aria-labelledby="ma-dialog-title"><header class="ma-dialog-head"><div><span class="ma-eyebrow" id="ma-eyebrow">GESTÃO MUNICIPAL</span><h2 id="ma-dialog-title">Ações</h2></div><button class="ma-close" type="button" aria-label="Fechar painel" id="ma-dialog-close">×</button></header><div class="ma-dialog-body" id="ma-dialog-body"></div></section>';
document.body.appendChild(overlay);
let active=null,lastFocus=null,lastMsg="";
const scopedDB=()=>D.criar(undefined,{municipioId:D.config.selecionar(D,global.sessionStorage)});
const getPref=()=>scopedDB().municipioAtivo();
const getId=()=>getPref()?.id||"";
const read=(key,def)=>{try{const x=JSON.parse(global.localStorage.getItem(key)||"null");return x??def;}catch(_){return def;}};
const put=(key,x)=>{try{global.localStorage.setItem(key,JSON.stringify(x));return true;}catch(_){return false;}};
const tasks=()=>{const x=global.AlertaNuvem?.ativo?global.AlertaNuvem.painel.ler(getId(),"tasks"):read(TKEY+getId(),[]);return Array.isArray(x)?x:[];};
const taskSave=async x=>{try{return global.AlertaNuvem?.ativo?await global.AlertaNuvem.painel.salvar(getId(),"tasks",x):put(TKEY+getId(),x);}catch(error){message(error.message);return false;}};
const safeDate=iso=>{if(!iso)return "";const d=new Date(iso);return Number.isNaN(d.valueOf())?String(iso):d.toLocaleDateString("pt-BR")};
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
const chaveAlertas=()=>LKEY+getId()+(wrap.dataset.escopo?":"+wrap.dataset.escopo:"");
const readIds=()=>{const x=global.AlertaNuvem?.ativo?global.AlertaNuvem.painel.ler(getId(),"alerts"):read(chaveAlertas(),[]);return new Set(Array.isArray(x)?x:[])};
const salvarLeituras=async ids=>{try{return global.AlertaNuvem?.ativo?await global.AlertaNuvem.painel.salvar(getId(),"alerts",ids):put(chaveAlertas(),ids);}catch(error){message(error.message);return false;}};
function updateBadges(){
 const n=tasks().filter(t=>t.status!=="done").length;
 const a=alerts();const seen=readIds(),unread=a.filter(x=>!seen.has(x.id)).length;
 for(const [id,count] of [["tasks",n],["alerts",unread]]){
  const el=$("ma-count-"+id);if(!el)continue;
  el.hidden=count===0;el.textContent=count>99?"99+":String(count);
 }
}
function close(){
 if(overlay.hidden)return;overlay.hidden=true;
 wrap.querySelectorAll("[data-header-action]").forEach(b=>b.setAttribute("aria-expanded","false"));
 active=null;
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 lastFocus=null;
}
function open(id){
 lastFocus=document.activeElement;active=id;overlay.hidden=false;
 wrap.querySelectorAll("[data-header-action]").forEach(b=>b.setAttribute("aria-expanded",String(b.dataset.headerAction===id)));
 const d=defs.find(x=>x.id===id);
 $("ma-dialog-title").textContent=d?.label||"Ações";
 $("ma-eyebrow").textContent="GESTÃO MUNICIPAL · "+(getPref()?.nome||"Município");
 if(id==="tasks")renderTasks();
 else if(id==="alerts")renderAlerts();
 else renderEmergency(id);
 $("ma-dialog-close").focus({preventScroll:true});
}
const message=(txt)=>{lastMsg=txt;const el=$("ma-message");if(el){el.textContent=txt;el.hidden=false;}};
function renderTasks(){
 const activeTasks=tasks().filter(x=>x.status!=="done").sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
 const done=tasks().filter(x=>x.status==="done");
 $("ma-dialog-body").innerHTML=
 '<p class="ma-note">Tarefas pessoais nesta Prefeitura, sem envio de mensagens.</p>'+
 '<form id="ma-task-form" class="ma-task-form"><label for="ma-task-title">Nova tarefa</label><input id="ma-task-title" name="title" required maxlength="140" placeholder="Ex.: conferir equipamentos da Zona 7">'+
 '<div class="ma-form-line"><label>Prazo <input type="date" name="date"></label><label>Prioridade <select name="priority"><option>Normal</option><option>Alta</option><option>Crítica</option></select></label></div><button type="submit" class="ma-primary" aria-label="Adicionar tarefa">+ Adicionar tarefa</button></form>'+
 '<h3 class="ma-section-title">Pendentes ('+activeTasks.length+')</h3>'+
 (activeTasks.length?activeTasks.map(t=>taskRow(t,false)).join(""):'<p class="ma-empty">Nenhuma tarefa pendente.</p>')+
 (done.length?'<h3 class="ma-section-title">Concluídas ('+done.length+')</h3>'+done.slice(0,10).map(t=>taskRow(t,true)).join(""):"")+
 '<p id="ma-message" class="ma-notice" role="status" hidden></p>';
 $("ma-task-form").onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,data=new FormData(form);
  const title=String(data.get("title")||"").trim();
  if(!title)return;
  const id=global.crypto?.randomUUID?.()||"task-"+Date.now()+"-"+Math.random().toString(36).slice(2);
  const ok=await taskSave([...tasks(),{id,title,date:String(data.get("date")||""),priority:String(data.get("priority")||"Normal"),status:"open",createdAt:new Date().toISOString()}]);
  if(!ok){message("Não foi possível salvar. Atualize a página antes de tentar novamente.");return;}
  renderTasks();updateBadges();
 };
 $("ma-dialog-body").querySelectorAll("[data-task-done]").forEach(b=>b.onclick=async()=>{
  const rows=tasks(),item=rows.find(x=>x.id===b.dataset.taskDone);if(!item)return;
  item.status="done";item.closedAt=new Date().toISOString();
  if(!await taskSave(rows)){message("Falha ao salvar.");return;}renderTasks();updateBadges();
 });
 $("ma-dialog-body").querySelectorAll("[data-task-delete]").forEach(b=>b.onclick=async()=>{
  if(!confirm("Excluir esta tarefa?"))return;
  if(!await taskSave(tasks().filter(x=>x.id!==b.dataset.taskDelete))){message("Falha ao excluir.");return;}
  renderTasks();updateBadges();
 });
}
function taskRow(t,done){
 return '<div class="ma-task-row"><div><strong>'+esc(t.title)+'</strong><small>'+esc(t.priority||"Normal")+(t.date?" · até "+esc(safeDate(t.date)):"")+'</small></div><div class="ma-row-actions">'+(done?'': '<button type="button" data-task-done="'+esc(t.id)+'" title="Marcar como concluída">Concluir</button>')+'<button type="button" data-task-delete="'+esc(t.id)+'" title="Excluir tarefa">Excluir</button></div></div>';
}
function renderAlerts(){
 const data=alerts(),seen=readIds();
 $("ma-dialog-body").innerHTML='<p class="ma-note">Alertas locais: pedidos de ajuda aguardando, brigadas e solicitações intermunicipais preparadas. Não substituem alertas oficiais da Defesa Civil ou do Mapa de Evento.</p>'+
 '<div class="ma-alert-summary"><strong>'+data.filter(x=>!seen.has(x.id)).length+' não lidos</strong><button type="button" class="ma-light" id="ma-mark-all">Marcar todos como lidos</button></div>'+
 (data.length?data.map(x=>'<div class="ma-alert-row '+esc(x.kind)+'"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></div><div class="ma-row-actions">'+(seen.has(x.id)?'<span class="ma-read">Lido</span>':'<button type="button" data-alert-read="'+esc(x.id)+'">Lido</button>')+'<a href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer">Abrir</a></div></div>').join(""):'<p class="ma-empty">Nenhum alerta de gestão pendente neste navegador.</p>')+
 '<a class="ma-map-link" href="../index.html" target="_blank" rel="noopener noreferrer">Abrir alertas e prontidão no Mapa de Evento</a><p id="ma-message" class="ma-notice" role="status" hidden></p>';
 $("ma-mark-all").onclick=async()=>{if(!await salvarLeituras([...new Set([...readIds(),...data.map(x=>x.id)])]))return;renderAlerts();updateBadges();};
 $("ma-dialog-body").querySelectorAll("[data-alert-read]").forEach(b=>b.onclick=async()=>{
  const seen=readIds();seen.add(b.dataset.alertRead);if(!await salvarLeituras([...seen]))return;renderAlerts();updateBadges();
 });
}
function renderEmergency(id){
 const samu=id==="samu",service=samu?"SAMU":"Corpo de Bombeiros",number=samu?"192":"193";
 $("ma-dialog-body").innerHTML=
 '<p class="ma-note">Atalho de emergência, conforme o padrão do ClinicAI V2. Não realiza ligações automaticamente.</p>'+
 '<div class="ma-emergency-box"><span>'+service+'</span><strong>'+number+'</strong><p>'+esc(samu?"Urgências clínicas e atendimento pré-hospitalar.":"Incêndio, resgate, salvamento e acidentes com risco imediato.")+'</p></div>'+
 '<div class="ma-location"><strong>Município: '+esc(getPref()?.nome||"Não configurado")+' / '+esc(getPref()?.uf||"")+'</strong>'+
 '<p>Informe o endereço exato e um ponto de referência da ocorrência diretamente ao atendente. O cadastro municipal não substitui a localização do incidente.</p></div>'+
 '<div class="ma-emergency-actions"><a class="ma-call" href="tel:'+number+'">Abrir discagem '+number+'</a><button id="ma-copy" type="button" class="ma-light">Copiar orientação</button></div>'+
 '<p class="ma-note">Informe o que aconteceu, a localização, quantas pessoas precisam de ajuda e os riscos presentes. A central confirmará o atendimento; abrir a discagem não significa despacho realizado.</p><p id="ma-message" class="ma-notice" role="status" hidden></p>';
 $("ma-copy").onclick=async()=>{
  const msg="Emergência · "+service+" "+number+"\nMunicípio: "+(getPref()?.nome||"Não informado")+"\nLocal da ocorrência: [informar endereço exato]\nDescrição: [informar o ocorrido e pessoas afetadas]";
  try{await navigator.clipboard.writeText(msg);message("Orientação copiada.");}
  catch(_){message("Não foi possível copiar automaticamente.");}
 };
}
wrap.querySelectorAll("[data-header-action]").forEach(b=>b.onclick=async()=>open(b.dataset.headerAction));
$("ma-dialog-close").onclick=close;
overlay.addEventListener("mousedown",e=>{if(e.target===overlay)close();});
document.addEventListener("keydown",e=>{
 if(overlay.hidden)return;
 if(e.key==="Escape"){e.preventDefault();close();return;}
 if(e.key==="Tab"){
  const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(x=>!x.closest('[hidden]'));
  if(!focusable.length)return;
  if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
 }
});
global.addEventListener("storage",e=>{if(e.key===D.CHAVE||e.key?.startsWith(TKEY)||e.key?.startsWith(LKEY))updateBadges();});
global.addEventListener("focus",()=>updateBadges());
updateBadges();
})(typeof globalThis!=="undefined"?globalThis:window);
