/* Controlador offline: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('offline',{
 dependencias:{
  "conectado": "contexto",
  "storageKey": "contexto",
  "chatHistorico": "mensagens",
  "renderChatContacts": "mensagens",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let filaLocal,enfileirarOffline;
 function atualizarBannerOffline(){
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
function processarFilaOffline(){
  const processados=filaLocal.processar(item=>{
    if(item.tipo!=='chat')return false;
    const id=item.dados.contatoId;
    dependencias.chatHistorico[id]=dependencias.chatHistorico[id]||[];
    const pendente=dependencias.chatHistorico[id].find(m=>m.filaId===item.id);
    if(pendente){pendente.texto=item.dados.texto+' (reconexão simulada)';delete pendente.filaId;}
    else dependencias.chatHistorico[id].push({de:'eu',texto:item.dados.texto+' (reconexão simulada)',ts:item.ts});
    return true;
  });
  if(processados){dependencias.renderChatContacts();dependencias.salvarPrototipo();}
}
 async function iniciar(){
 if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* alguns navegadores/visualizacoes bloqueiam; segue sem offline */ });
}
(filaLocal=AlertaEventoFilaLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('offline'),habilitado:!dependencias.conectado}));
(enfileirarOffline=filaLocal.enfileirar);
window.addEventListener('offline', atualizarBannerOffline);
window.addEventListener('online', ()=>{ atualizarBannerOffline(); processarFilaOffline(); });
atualizarBannerOffline();
 return true;
 }
 return {iniciar,get filaLocal(){return filaLocal;},get enfileirarOffline(){return enfileirarOffline;},atualizarBannerOffline,processarFilaOffline};
 }
});
})(globalThis);
