/* Tratamento de anexos com liberação da URL temporária. */
(function(root){'use strict';
function criar({document,URL,Image}){
async function prepararFoto(arquivo){
 if(!arquivo||!arquivo.type.startsWith("image/"))throw Error("Selecione uma imagem.");
 if(arquivo.size>8*1024*1024)throw Error("A imagem deve ter no máximo 8 MB.");
 const url=URL.createObjectURL(arquivo);
 try{
  const imagem=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Não foi possível abrir a foto."));i.src=url;});
  const escala=Math.min(1,920/Math.max(imagem.naturalWidth,imagem.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(imagem.naturalWidth*escala));canvas.height=Math.max(1,Math.round(imagem.naturalHeight*escala));
  canvas.getContext("2d").drawImage(imagem,0,0,canvas.width,canvas.height);
  const dados=canvas.toDataURL("image/jpeg",.67);
  if(dados.length>900000)throw Error("A foto é grande demais para este simulador local.");
  return {nome:arquivo.name,dados};
 }finally{URL.revokeObjectURL(url);}
}
return {prepararFoto};
}
root.AlertaAtendimentoFoto={criar};
})(globalThis);
