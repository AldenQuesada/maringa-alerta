/* ficha: detalhe do registro no painel lateral. Rótulos vêm de perfil.textos.ficha; as ações vêm do módulo de triagem. */
(function(root){'use strict';
function criar({$,esc,t,territorio,triagem,aoFechar}){
 const linha=(r,v)=>v==null||v===""?"":"<dt>"+esc(t("ficha."+r))+"</dt><dd>"+esc(Array.isArray(v)?v.join(", "):v)+"</dd>";
 function abrir(x){
  const p=territorio.posicao(x);
  $("ma-animal-ficha-tipo").textContent=t(x.origemCamada==="triagem"?"ficha.relato":"ficha.ocorrencia")+" · "+(x.status||"");
  $("ma-animal-ficha-titulo").textContent=x.tipo?.nome||x.situacao||t("lista.registroGenerico");
  $("ma-animal-ficha-dados").innerHTML=
   linha("protocolo",x.protocolo)+linha("especie",x.especie)+linha("endereco",x.endereco)+linha("bairro",x.bairro||p?.bairro)+
   linha("localizacao",t(p?(p.aproximada?"ficha.aproximada":"ficha.coordenadas"):"ficha.semPosicao"))+
   linha("descricao",x.descricao)+linha("origem",x.origem)+linha("registradoEm",x.criado_em||x.quando)+
   linha("sigilo",x.visibilidade==="restrita"?t("ficha.sigiloRestrito"):"")+linha("denunciante",x.anonimo===true?t("ficha.anonimo"):x.nome)+
   linha("desfecho",x.desfecho)+linha("motivo",x.motivo_arquivamento)+linha("triadoEm",x.triado_em)+linha("ocorrenciaGerada",x.incidente_id);
  $("ma-animal-ficha").hidden=false;$("ma-animal-ficha").scrollIntoView({block:"nearest"});
  triagem.montar($("ma-animal-ficha-triagem"),x);
 }
 $("ma-animal-ficha-fechar").addEventListener("click",()=>{$("ma-animal-ficha").hidden=true;aoFechar?.();});
 return {abrir};
}
root.AlertaAnimalFicha={criar};
})(globalThis);
