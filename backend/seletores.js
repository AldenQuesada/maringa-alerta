/* Seletores remotos limitados; a escolha existente não depende da primeira página. */
(function(root){
'use strict';
function montar({alvo,client,municipio,modulo,nome,rotulo,valor='',texto='',excluir='',valorNome=false}){
 const doc=alvo.ownerDocument,searchLabel=doc.createElement('label'),input=doc.createElement('input'),selectLabel=doc.createElement('label'),select=doc.createElement('select'),next=doc.createElement('button'),status=doc.createElement('span');
 searchLabel.textContent='Buscar '+rotulo.toLocaleLowerCase('pt-BR');input.type='search';input.autocomplete='off';input.maxLength=100;input.id='buscar-'+nome+'-'+root.crypto.randomUUID();searchLabel.htmlFor=input.id;
 selectLabel.textContent=rotulo;select.name=nome;select.id='selecionar-'+nome+'-'+root.crypto.randomUUID();selectLabel.htmlFor=select.id;next.type='button';next.textContent='Mais opções';next.hidden=true;status.setAttribute('role','status');
 alvo.replaceChildren(searchLabel,input,selectLabel,select,next,status);
 let epoch=0,timer,cursor=null,chosen={id:valor,nome:texto||valor};
 function options(items){
  const current=select.value||chosen.id;select.replaceChildren(new Option('Não definido',''));
  const rows=items.filter(x=>x.id!==excluir).map(x=>({id:valorNome?x.nome:x.id,nome:x.nome||x.identificacao||x.id}));
  if(current&&!rows.some(x=>x.id===current))rows.unshift(chosen.id===current?chosen:{id:current,nome:current});
  for(const row of rows)select.add(new Option(row.nome,row.id));select.value=current;
 }
 options([]);
 select.onchange=()=>{chosen={id:select.value,nome:select.selectedOptions[0]?.textContent||''};};
 async function load(after=null){
  const request=++epoch;next.disabled=true;status.textContent='Buscando opções…';
  try{
   const r=await client.rpc('ma_cadastros_pagina',{municipio,modulo,busca:input.value.trim(),apos:after,tamanho:20,projecao:'seletor'});
   if(request!==epoch||!alvo.isConnected)return;
   if(r.error)throw Error(r.error.message);
   if(!Array.isArray(r.data?.itens))throw Error('Não foi possível consultar as opções.');
   options(r.data.itens.map(x=>x.dados));cursor=r.data.proxima;next.hidden=!cursor;
   status.textContent=r.data.itens.length+' opções nesta página'+(cursor?'. Refine a busca ou consulte mais opções.':'.');
  }catch(error){if(request===epoch)status.textContent=error.message;}
  finally{if(request===epoch)next.disabled=false;}
 }
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);void load();}};
 input.oninput=()=>{++epoch;clearTimeout(timer);timer=setTimeout(()=>void load(),250);};next.onclick=()=>void load(cursor);
 void load();return {select,destroy(){++epoch;clearTimeout(timer);}};
}
root.AlertaSeletoresRemotos={montar};
})(globalThis);
