/* Cadeia de integridade demonstrativa. A auditoria real pertence ao banco. */
(function(root){
'use strict';
function criar({armazenamento,chave,habilitado,crypto=root.crypto,agora=()=>Date.now(),onChange=()=>{}}){
 let entries=[],sequence=Promise.resolve();
 if(habilitado)try{const saved=JSON.parse(armazenamento.getItem(chave)||'[]');if(Array.isArray(saved))entries=saved;}catch{}
 const payload=({ts,ator,acao,detalhe,prev,territorios})=>JSON.stringify({ts,ator,acao,detalhe,prev,territorios});
 async function hash(value){const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function salvar(){try{armazenamento.setItem(chave,JSON.stringify(entries));}catch{}}
 function adicionar(ator,acao,detalhe,territorios){
  if(!habilitado)return Promise.resolve();
  const ts=agora();
  const next=sequence.then(async()=>{
   const entry={ts,ator,acao,detalhe,prev:entries.at(-1)?.hash||'0',territorios};
   entries.push({...entry,hash:await hash(payload(entry))});salvar();onChange();
  });
  sequence=next.catch(()=>{});return next;
 }
 async function verificar(){
  await sequence;
  for(let index=0;index<entries.length;index++){
   const entry=entries[index],prev=index?entries[index-1].hash:'0';
   if(!entry||entry.prev!==prev||await hash(payload({...entry,prev}))!==entry.hash)return {ok:false,indice:index};
  }
  return {ok:true};
 }
 function simularAdulteracao(){
  if(!habilitado||!entries.length)return false;
  entries[0].detalhe+=' (editado depois, sem recalcular o hash)';salvar();return true;
 }
 return {adicionar,verificar,simularAdulteracao,listar:()=>JSON.parse(JSON.stringify(entries))};
}
root.AlertaEventoAuditoriaLocal={criar};
})(globalThis);
