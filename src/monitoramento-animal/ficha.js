/* ficha: detalhe do registro no painel lateral. Rótulos vêm de perfil.textos.ficha; as ações vêm do módulo de triagem. */
(function(root){'use strict';
function criar({$,esc,t,territorio,triagem,envio,aoFechar}){
 const linha=(r,v)=>v==null||v===""?"":"<dt>"+esc(t("ficha."+r))+"</dt><dd>"+esc(Array.isArray(v)?v.join(", "):v)+"</dd>";
 function abrir(x){
  const p=territorio.posicao(x);
  if(x.origemCamada==="acoes")return abrirAcao(x,p);
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
  envio?.montar($("ma-animal-ficha-envio"),x);
 }
 // Ação nos bairros: o cadastro e a situação são editados na Gestão; daqui sai o aviso aos inscritos.
 function abrirAcao(x,p){
  const l=(r,v)=>v==null||v===""?"":"<dt>"+esc(t(r))+"</dt><dd>"+esc(v)+"</dd>";
  $("ma-animal-ficha-tipo").textContent=t("acao.ficha")+" · "+(x.status||"");
  $("ma-animal-ficha-titulo").textContent=x.nome||t("lista.registroGenerico");
  $("ma-animal-ficha-dados").innerHTML=l("acao.tipo",x.tipoAcao)+l("acao.data",x.data)+l("acao.horario",x.horario)+l("ficha.endereco",x.endereco)+
   l("ficha.bairro",x.bairro||p?.bairro)+l("ficha.localizacao",t(p?(p.aproximada?"ficha.aproximada":"ficha.coordenadas"):"ficha.semPosicao"))+l("ficha.descricao",x.descricao);
  $("ma-animal-ficha-triagem").innerHTML="";
  envio?.montar($("ma-animal-ficha-envio"),x);
  $("ma-animal-ficha").hidden=false;$("ma-animal-ficha").scrollIntoView({block:"nearest"});
 }
 $("ma-animal-ficha-fechar").addEventListener("click",()=>{$("ma-animal-ficha").hidden=true;aoFechar?.();});
 return {abrir};
}
root.AlertaAnimalFicha={criar};
})(globalThis);
