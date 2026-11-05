/* ---------- modo offline: cache do shell + fila de mensagens ---------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* alguns navegadores/visualizacoes bloqueiam; segue sem offline */ });
}
const OFFLINE_QUEUE_KEY = storageKey('offline');
let filaOffline = [];
try{ filaOffline = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }catch(e){ filaOffline = []; }

function atualizarBannerOffline(){
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
function enfileirarOffline(tipo,dados){
  const id=crypto.randomUUID();
  filaOffline.push({id,tipo,dados,ts:Date.now()});
  try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(filaOffline));}catch(e){}
  return id;
}
function processarFilaOffline(){
  if(!filaOffline.length)return;
  filaOffline=filaOffline.filter(item=>{
    if(item.tipo!=='chat')return true;
    const id=item.dados.contatoId;
    chatHistorico[id]=chatHistorico[id]||[];
    const pendente=chatHistorico[id].find(m=>m.filaId===item.id);
    if(pendente){pendente.texto=item.dados.texto+' (reconexão simulada)';delete pendente.filaId;}
    else chatHistorico[id].push({de:'eu',texto:item.dados.texto+' (reconexão simulada)',ts:item.ts});
    return false;
  });
  try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(filaOffline));}catch(e){}
  renderChatContacts();salvarPrototipo();
}
window.addEventListener('offline', atualizarBannerOffline);
window.addEventListener('online', ()=>{ atualizarBannerOffline(); processarFilaOffline(); });
atualizarBannerOffline();

