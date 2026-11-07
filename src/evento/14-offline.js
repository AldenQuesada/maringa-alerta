/* ---------- modo offline: cache do shell + fila de mensagens ---------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* alguns navegadores/visualizacoes bloqueiam; segue sem offline */ });
}
const filaLocal=AlertaEventoFilaLocal.criar({armazenamento:localStorage,chave:storageKey('offline'),habilitado:!conectado});
const enfileirarOffline=filaLocal.enfileirar;

function atualizarBannerOffline(){
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
function processarFilaOffline(){
  const processados=filaLocal.processar(item=>{
    if(item.tipo!=='chat')return false;
    const id=item.dados.contatoId;
    chatHistorico[id]=chatHistorico[id]||[];
    const pendente=chatHistorico[id].find(m=>m.filaId===item.id);
    if(pendente){pendente.texto=item.dados.texto+' (reconexão simulada)';delete pendente.filaId;}
    else chatHistorico[id].push({de:'eu',texto:item.dados.texto+' (reconexão simulada)',ts:item.ts});
    return true;
  });
  if(processados){renderChatContacts();salvarPrototipo();}
}
window.addEventListener('offline', atualizarBannerOffline);
window.addEventListener('online', ()=>{ atualizarBannerOffline(); processarFilaOffline(); });
atualizarBannerOffline();

