/* resultados: lista lateral e indicadores. */
(function(root){'use strict';
function criar({$,esc,t,perfil,aoAbrir,aoLocalizar}){
 function indicadores(todos){
  $("metric-one").textContent=todos.filter(x=>x.origemCamada==="triagem").length;
  $("metric-two").textContent=todos.filter(x=>x.origemCamada==="ocorrencias"&&!perfil.estadosEncerrados.includes(x.status)).length;
  $("metric-three").textContent=todos.filter(x=>x.visibilidade==="restrita").length;
 }
 function lista(xs,semPosicao){
  $("list-count").textContent=xs.length+" "+t(xs.length===1?"lista.registro":"lista.registros")+(semPosicao?" · "+t("lista.semPosicao",{n:semPosicao}):"");
  const el=$("results");
  if(!xs.length){el.innerHTML='<div class="empty">'+esc(t("lista.vazioTitulo"))+"<p>"+esc(t("lista.vazioDetalhe"))+"</p></div>";return;}
  el.innerHTML=xs.map((x,i)=>'<button type="button" class="result ma-animal-result" data-i="'+i+'"><div class="result-top"><span>'+esc(t(x.origemCamada==="triagem"?"lista.relato":"lista.ocorrencia"))+(x.protocolo?" · "+esc(x.protocolo):"")+'</span>'+
   '<span class="result-tag'+(x.visibilidade==="restrita"?" urgente":"")+'">'+esc(x.status||"")+'</span></div>'+
   '<strong>'+esc(x.tipo?.nome||x.situacao||t("lista.registroGenerico"))+(x.especie?" · "+esc(x.especie):"")+'</strong><small>'+esc(x.bairro||x.endereco||t("lista.localNaoInformado"))+'</small></button>').join("");
  el.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const x=xs[Number(b.dataset.i)];aoLocalizar(x);aoAbrir(x);});
 }
 return {indicadores,lista};
}
root.AlertaAnimalResultados={criar};
})(globalThis);
