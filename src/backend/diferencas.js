/* Cálculo puro de alterações e chaves; sem acesso ao banco. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const key=(collection,item)=>JSON.stringify([collection,item.municipioId||'',item.id]);
function indexState(state,collections){
 const result=new Map();
 for(const collection of collections)for(const item of state[collection]||[])result.set(key(collection,item),{collection,item});
 return result;
}
function changes(before,after,collections,versions){
 const a=indexState(before,collections),b=indexState(after,collections),result=[];
 for(const [id,{collection,item}] of b){
  const old=a.get(id);
  if(old&&JSON.stringify(old.item)===JSON.stringify(item))continue;
  result.push({colecao:collection,id:item.id,municipio_id:item.municipioId||null,dados:item,operacao:old?'atualizar':'inserir',versao:old?versions.get(id):null});
 }
 for(const [id,{collection,item}] of a)if(!b.has(id))result.push({colecao:collection,id:item.id,municipio_id:item.municipioId||null,operacao:'excluir',versao:versions.get(id)});
 return result;
}
root.AlertaRepositorioDiff={copy,key,changes};
})(globalThis);
