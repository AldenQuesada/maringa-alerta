/* tarefas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,esc,global,message,safeDate,taskSave,tasks,updateBadges}){
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
return {renderTasks,taskRow};
}
root.AlertaCabecalhoTarefas={criar};
})(globalThis);
