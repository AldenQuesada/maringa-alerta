/* Filtros por tipo, derivados do inventário municipal, sem cadastro paralelo. */
(function(root){
 'use strict';
 const MODULOS=new Set(['saude','emergencias','parceiros','bases','abrigos']);
 const chave=x=>x.modulo+'::'+(x.categoria||'Não informado');
 function criar({alvo,ler,aoMudar}){
  const ocultos=new Set();
  function aceita(x){return !MODULOS.has(x.modulo)||!ocultos.has(chave(x));}
  function atualizar(){
   const registros=ler().filter(x=>MODULOS.has(x.modulo)&&!x.privado), tipos=new Map();
   for(const x of registros){const id=chave(x),item=tipos.get(id)||{id,nome:x.categoria||'Não informado',grupo:x.moduloNome,total:0,pontos:0};item.total++;if(x.georreferenciado)item.pontos++;tipos.set(id,item);}
   alvo.replaceChildren();
   if(!tipos.size){alvo.textContent='Nenhuma unidade cadastrada para este município.';return;}
   const grupos=new Map();for(const item of [...tipos.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))){if(!grupos.has(item.grupo))grupos.set(item.grupo,[]);grupos.get(item.grupo).push(item)}
   for(const [grupo,itens] of grupos){const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=grupo;field.append(legend);for(const item of itens){const label=document.createElement('label'),check=document.createElement('input'),texto=document.createElement('span');check.type='checkbox';check.checked=!ocultos.has(item.id);texto.textContent=item.nome+' · '+item.total+' ('+item.pontos+' no mapa)';label.append(check,texto);field.append(label);check.addEventListener('change',()=>{if(check.checked)ocultos.delete(item.id);else ocultos.add(item.id);aoMudar()})}alvo.append(field)}
  }
  return {aceita,atualizar};
 }
 root.FiltrosUnidades={criar};
})(window);
