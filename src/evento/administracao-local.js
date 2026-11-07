/* Compatibilidade de cadastros locais; no modo conectado não acessa o armazenamento. */
(function(root){
'use strict';
function criar({armazenamento,chave,chaveLegada,habilitado}){
 function carregar(){
  if(!habilitado)return null;
  try{
   const raw=armazenamento.getItem(chave)||(chaveLegada?armazenamento.getItem(chaveLegada):null);
   const data=JSON.parse(raw||'null');
   if(!data||typeof data!=='object'||Array.isArray(data))return null;
   return {funcionarios:Array.isArray(data.funcionarios)?data.funcionarios.filter(x=>x&&typeof x==='object'):[],equipes:Array.isArray(data.equipes)?data.equipes.filter(x=>x&&typeof x==='object'):[]};
  }catch(_){return null;}
 }
 function salvar({funcionarios,equipes}){
  if(!habilitado)return false;
  try{armazenamento.setItem(chave,JSON.stringify({
   funcionarios:funcionarios.map(({id,nome,cargo,tel})=>({id,nome,cargo,tel})),
   equipes:equipes.map(({id,nome,zona,recursos,membros,status})=>({id,nome,zona,recursos,membros,status}))
  }));return true;}catch(_){return false;}
 }
 return {carregar,salvar};
}
root.AlertaEventoAdministracaoLocal={criar};
})(globalThis);
