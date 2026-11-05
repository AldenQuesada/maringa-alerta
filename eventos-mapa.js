/* Relação entre eventos e sua visualização operacional compartilhada. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EventosMapa=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function raiz(id,eventos){const vistos=new Set(),porId=new Map(eventos.map(e=>[String(e.id),e]));let atual=String(id||'');while(atual){if(vistos.has(atual))return null;vistos.add(atual);const item=porId.get(atual);if(!item)return null;const prox=String(item.mapa_evento_id||'');if(!prox)return atual;atual=prox;}return null;}
function membros(id,eventos){const r=raiz(id,eventos);return r?eventos.filter(e=>raiz(e.id,eventos)===r).map(e=>String(e.id)):[];}
function corresponde(oc,selecionado,eventos){if(!selecionado)return true;if(selecionado.startsWith('mapa:'))return membros(selecionado.slice(5),eventos).includes(String(oc.eventoId||''));return String(oc.eventoId||'')===selecionado.replace(/^evento:/,'');}
function selecionadoIndividual(v){return !v||v.startsWith('mapa:')?'':v.replace(/^evento:/,'');}
function validarReferencia(id,ref,eventos){if(!ref)return true;if(String(id)===String(ref))return false;const porId=new Map(eventos.map(x=>[String(x.id),x]));const vistos=new Set(id?[String(id)]:[]);let atual=String(ref);while(atual){if(vistos.has(atual))return false;vistos.add(atual);const e=porId.get(atual);if(!e)return false;atual=String(e.mapa_evento_id||'');}return true;}
return {raiz,membros,corresponde,selecionadoIndividual,validarReferencia};
});
