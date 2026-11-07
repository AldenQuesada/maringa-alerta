/* Fila exclusiva de demonstração. Nenhum envio de rede ou escrita em dados reais. */
(function(root){
'use strict';
function criar({armazenamento,chave,habilitado,uuid=()=>crypto.randomUUID(),agora=()=>Date.now()}){
 let items=[];
 if(habilitado)try{const saved=JSON.parse(armazenamento.getItem(chave)||'[]');if(Array.isArray(saved))items=saved.filter(x=>x&&typeof x.id==='string'&&x.tipo&&x.dados);}catch{}
 function salvar(){if(habilitado)try{armazenamento.setItem(chave,JSON.stringify(items));}catch{}}
 function enfileirar(tipo,dados){
  if(!habilitado)throw Error('Fila demonstrativa indisponível no modo conectado.');
  const id=uuid();items.push({id,tipo,dados:JSON.parse(JSON.stringify(dados)),ts:agora()});salvar();return id;
 }
 function processar(consume){
  if(!habilitado)return 0;let total=0;
  for(const item of [...items])if(consume(JSON.parse(JSON.stringify(item)))===true){items=items.filter(x=>x.id!==item.id);salvar();total++;}
  return total;
 }
 return {enfileirar,processar};
}
root.AlertaEventoFilaLocal={criar};
})(globalThis);
