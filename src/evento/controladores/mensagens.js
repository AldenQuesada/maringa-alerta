/* Controlador mensagens: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('mensagens',{
 dependencias:{
  "pick": "contexto",
  "escHtml": "contexto",
  "pessoasPainel": "pessoas",
  "enfileirarOffline": "offline",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let chatOverlay,chatHistorico,respostasAuto,chatContatoAtivo;
 function chatContatos(){
  return dependencias.pessoasPainel().map(p=>({id:p.id,nome:p.nome,sub:[p.sub,p.zona].filter(Boolean).join(' · ')}));
}
function renderChatContacts(){
  const el = document.getElementById('chat-contacts');
  if(!el) return;
  el.innerHTML = chatContatos().map(c=>`
    <div class="chat-contact${chatContatoAtivo===c.id?' active':''}" data-id="${c.id}">
      <div>${dependencias.escHtml(c.nome)}</div>
      <div class="cc-role">${dependencias.escHtml(c.sub)}</div>
    </div>
  `).join('');
  el.querySelectorAll('.chat-contact').forEach(elm=>{
    elm.onclick = ()=>{ chatContatoAtivo = elm.dataset.id; renderChatContacts(); openChatThread(elm.dataset.id); };
  });
}
function openChatThread(id){
  const contato = chatContatos().find(c=>c.id===id);
  if(!contato) return;
  if(!chatHistorico[id]){
    chatHistorico[id] = [
      { de:'eles', texto:`Oi, aqui é ${contato.nome.split(' ')[0]}. Pode me passar instruções?`, ts: Date.now()-9*60000 },
    ];
  }
  const thread = document.getElementById('chat-thread');
  thread.innerHTML = `
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Mensagem para ${dependencias.escHtml(contato.nome.split(' ')[0])}...">
      <button id="chat-send">Enviar</button>
    </div>
  `;
  renderChatMessages(id);
  document.getElementById('chat-send').onclick = ()=>sendChatMsg(id);
  document.getElementById('chat-input').addEventListener('keydown', e=>{ if(e.key==='Enter') sendChatMsg(id); });
}
function renderChatMessages(id){
  const box = document.getElementById('chat-messages');
  if(!box) return;
  box.innerHTML = (chatHistorico[id]||[]).map(m=>`
    <div class="chat-bubble ${m.de==='eu'?'me':'them'}">${dependencias.escHtml(m.texto)}<span class="cb-time">${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}
function sendChatMsg(id){
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if(!texto) return;
  input.value = '';
  if(!navigator.onLine){
    const filaId=dependencias.enfileirarOffline('chat', { contatoId:id, texto });
    chatHistorico[id].push({ de:'eu', texto:texto+' ⏳ (aguardando reconexão simulada)', ts:Date.now(),filaId });
    dependencias.salvarPrototipo();
    renderChatMessages(id);
    return;
  }
  chatHistorico[id].push({ de:'eu', texto, ts:Date.now() });
  renderChatMessages(id);
  setTimeout(()=>{
    chatHistorico[id].push({ de:'eles', texto: dependencias.pick(respostasAuto), ts:Date.now() });
    if(chatContatoAtivo===id)renderChatMessages(id);
    dependencias.salvarPrototipo();
  }, 1400 + Math.random()*1600);
}
 async function iniciar(){
 (chatOverlay=document.getElementById('chat-overlay'));
(chatHistorico={});
(respostasAuto=[
  "Recebido, chegando em breve.",
  "Estou a caminho, deve levar uns 10 minutos.",
  "Mensagem recebida. Vou conferir a informação.",
  "Vou enviar a foto da situação em seguida.",
  "Precisamos de mais um caminhão aqui, pode verificar disponibilidade?",
  "Obrigado por avisar.",
]);
(chatContatoAtivo=null);
document.getElementById('open-chat').onclick = ()=>{ chatOverlay.hidden=false; renderChatContacts(); };
document.getElementById('chat-close').onclick = ()=>{ chatOverlay.hidden=true; };
chatOverlay.addEventListener('click', e=>{ if(e.target===chatOverlay) chatOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get chatOverlay(){return chatOverlay;},get chatHistorico(){return chatHistorico;},get respostasAuto(){return respostasAuto;},get chatContatoAtivo(){return chatContatoAtivo;},set chatContatoAtivo(valor){chatContatoAtivo=valor;},chatContatos,renderChatContacts,openChatThread,renderChatMessages,sendChatMsg};
 }
});
})(globalThis);
