/* textos: toda a copy do mapa vem de perfil.textos no banco. Texto ausente é erro visível, nunca um valor de reserva. */
(function(root){'use strict';
function criar(textos){
 if(!textos||typeof textos!=="object")throw Error("Perfil do mapa incompleto: falta textos.");
 function t(caminho,vars){
  const v=String(caminho).split(".").reduce((o,k)=>o&&typeof o==="object"?o[k]:undefined,textos);
  if(typeof v!=="string")throw Error("Texto ausente no perfil do mapa: "+caminho+".");
  return vars?v.replace(/\{(\w+)\}/g,(_,k)=>String(vars[k]??"")):v;
 }
 // HTML declara só a chave: data-texto (conteúdo) e data-texto-<atributo> (aria-label, title, placeholder).
 function aplicar(doc){
  doc.querySelectorAll("[data-texto]").forEach(el=>{el.textContent=t(el.dataset.texto);});
  for(const attr of ["aria-label","title","placeholder"])
   doc.querySelectorAll("[data-texto-"+attr+"]").forEach(el=>el.setAttribute(attr,t(el.getAttribute("data-texto-"+attr))));
 }
 return {t,aplicar};
}
root.AlertaAnimalTextos={criar};
})(globalThis);
