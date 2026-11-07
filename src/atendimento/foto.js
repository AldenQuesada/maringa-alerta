/* Tratamento de anexos com liberação da URL temporária. */
(function(root){'use strict';
function criar({document,URL,Image,limites}){
async function prepararFoto(arquivo){
 if(!arquivo||!arquivo.type.startsWith("image/"))throw Error("Selecione uma imagem.");
 if(arquivo.size>limites.fotoBytesMaximos)throw Error("A imagem deve ter no máximo "+(limites.fotoBytesMaximos/1024/1024)+" MB.");
 const url=URL.createObjectURL(arquivo);
 try{
  const imagem=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Não foi possível abrir a foto."));i.src=url;});
  const escala=Math.min(1,limites.fotoDimensaoMaxima/Math.max(imagem.naturalWidth,imagem.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(imagem.naturalWidth*escala));canvas.height=Math.max(1,Math.round(imagem.naturalHeight*escala));
  canvas.getContext("2d").drawImage(imagem,0,0,canvas.width,canvas.height);
  const dados=canvas.toDataURL("image/jpeg",limites.fotoQualidade);
  if(dados.length>limites.fotoTextoMaximo)throw Error("A foto é grande demais para este simulador local.");
  return {nome:arquivo.name,dados};
 }finally{URL.revokeObjectURL(url);}
}
return {prepararFoto};
}
root.AlertaAtendimentoFoto={criar};
})(globalThis);
