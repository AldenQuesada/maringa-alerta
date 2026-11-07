/* Controles refletem capacidades fornecidas pelo servidor. A autorização permanece no banco. */
(function(root){
'use strict';
function podeRota(db,route){
 const groups={inicio:[],territorio:['prefeituras'],geoterritorialidade:['bairros','zonas'],estruturas:['instituicoes'],conversas:['voluntarios']};
 return route==='inicio'||(groups[route]||[route]).some(c=>db.pode(c,'ler'));
}
function regra(el,route){
 const d=el.dataset||{};
 if('permissionCollection' in d)return [d.permissionCollection,d.permissionAction||'gravar'];
 if('new' in d)return [d.new,'gravar'];
 if('canonEdit' in d)return [d.canonEdit,'gravar'];
 if('geoEdit' in d||'geoRef' in d)return [d.geoModule||'bairros','gravar'];
 if('edit' in d)return [route,'gravar'];
 if('delete' in d)return [route,'excluir'];
 if('cvNew' in d||'cvEdit' in d||'checkin' in d||'saida' in d)return ['voluntarios','gravar'];
 return null;
}
function instalar({document,db,location,MutationObserver}){
 const originais=new WeakMap();
 function permitir(el,allowed){
  if(!allowed){if(!originais.has(el))originais.set(el,{hidden:el.hidden,disabled:el.disabled});el.hidden=true;if('disabled' in el)el.disabled=true;el.setAttribute('aria-disabled','true');}
  else if(originais.has(el)){const old=originais.get(el);el.hidden=old.hidden;if('disabled' in el)el.disabled=old.disabled;el.removeAttribute('aria-disabled');originais.delete(el);}
 }
 const selectors='[data-new],[data-edit],[data-delete],[data-canon-edit],[data-geo-edit],[data-geo-ref],[data-cv-new],[data-cv-edit],[data-checkin],[data-saida],[data-permission-collection]';
 function aplicar(){
  const route=decodeURIComponent(location.hash.slice(1))||'inicio';
  for(const el of document.querySelectorAll(selectors)){
   const r=regra(el,route),allowed=r&&db.pode(...r);
   permitir(el,allowed);
  }
  for(const el of document.querySelectorAll('a[href]')){
   const href=el.getAttribute('href')||'';
   if(href.startsWith('#')&&href.length>1)permitir(el,podeRota(db,decodeURIComponent(href.slice(1))));
   if(/\/atendimento\//.test(href)||el.hasAttribute('data-importar-tornado'))el.hidden=true;
   if(/\/plataforma\//.test(href)&&!db.pode('prefeituras','gravar'))el.hidden=true;
  }
  for(const el of document.querySelectorAll('[data-importar-tornado]')){el.hidden=true;el.disabled=true;}
 }
 const observer=new MutationObserver(aplicar);observer.observe(document.body,{subtree:true,childList:true});
 root.addEventListener('hashchange',aplicar);root.addEventListener('backend:permissoes',aplicar);aplicar();
 return ()=>{observer.disconnect();root.removeEventListener('hashchange',aplicar);root.removeEventListener('backend:permissoes',aplicar);};
}
function campo(field,item,collection,regras){
 const result={...field},flow=regras?.transicoes?.[collection],number=regras?.numeros?.[collection]?.[field.key];
 if(field.key==='status'&&flow){const current=item?.status||flow.inicial[0];result.options=item?[current,...(flow.estados[current]||[])]:flow.inicial;result.required=true;}
 if(number){result.min=number.min;result.step=number.inteiro?1:'any';}
 return result;
}
const api={regra,podeRota,instalar,campo};root.AlertaPermissoesUI=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
