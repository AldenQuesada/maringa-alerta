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
