/* ficha: detalhe do registro no painel lateral. Somente leitura nesta etapa; ações de triagem vêm na etapa D. */
(function(root){'use strict';
function criar({$,esc,territorio,aoFechar}){
 const linha=(r,v)=>v==null||v===""?"":"<dt>"+esc(r)+"</dt><dd>"+esc(Array.isArray(v)?v.join(", "):v)+"</dd>";
 function abrir(x){
  const p=territorio.posicao(x);
  $("ma-animal-ficha-tipo").textContent=(x.origemCamada==="triagem"?"RELATO · ":"OCORRÊNCIA · ")+(x.status||"");
  $("ma-animal-ficha-titulo").textContent=x.tipo?.nome||x.situacao||"Registro";
  $("ma-animal-ficha-dados").innerHTML=
   linha("Protocolo",x.protocolo)+linha("Espécie",x.especie)+linha("Endereço",x.endereco)+linha("Bairro",x.bairro||p?.bairro)+
   linha("Localização",p?(p.aproximada?"Aproximada pelo bairro":"Coordenadas registradas"):"Sem posição no mapa")+
   linha("Descrição",x.descricao)+linha("Origem",x.origem)+linha("Registrado em",x.criado_em||x.quando)+
   linha("Sigilo",x.visibilidade==="restrita"?"Denúncia restrita":"")+linha("Denunciante",x.anonimo===true?"Anônimo":x.nome)+linha("Desfecho",x.desfecho);
  $("ma-animal-ficha").hidden=false;$("ma-animal-ficha").scrollIntoView({block:"nearest"});
 }
 $("ma-animal-ficha-fechar").addEventListener("click",()=>{$("ma-animal-ficha").hidden=true;aoFechar?.();});
 return {abrir};
}
root.AlertaAnimalFicha={criar};
})(globalThis);
