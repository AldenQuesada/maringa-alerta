/* Importação única das referências públicas para o cadastro municipal existente.
 * Não cria banco novo. Preserva campos preenchidos e registros homologados.
 */
(function(root,factory){
 const api=factory(root);
 root.AlertaImportacaoPublica=api;
 if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
const MODULES=["bases","riscos"];
const originalUrl=typeof document!=="undefined"&&document.currentScript?.src?
 new URL("maringa-bases-riscos-publicos.json",document.currentScript.src).href:null;
const normal=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const preenchido=x=>x!==undefined&&x!==null&&x!=="";
function importar(db,documento){
 if(db.municipioAtivo()?.codigo_ibge!=="4115200"||!documento||documento.municipio_ibge!=="4115200")return {novos:0,atualizados:0,preservados:0};
 const stats={novos:0,atualizados:0,preservados:0};
 for(const modulo of MODULES){
  if(!Array.isArray(documento[modulo]))throw Error("Referências públicas inválidas: "+modulo);
  const campos=new Set(db.esquema(modulo)?.fields?.map(f=>f.key)||[]);
  for(const src of documento[modulo]){
   if(!src.nome||!src.externalId||!src.url_fonte||src.verificacao!=="Em conferência")continue;
   const registro=db.lista(modulo).find(x=>x.externalId===src.externalId||normal(x.nome)===normal(src.nome));
   if(!registro){stats.novos+=db.importarLote(modulo,[src]).novos;continue;}
   if(["Validado","Rejeitado","Manual confirmado"].includes(registro.verificacao)){stats.preservados++;continue;}
   const novos={};
   for(const [key,value] of Object.entries(src)){
    if(campos.has(key)&&preenchido(value)&&!preenchido(registro[key]))novos[key]=value;
   }
   if(Object.keys(novos).length){
    db.gravar(modulo,{...registro,...novos},registro.id);
    stats.atualizados++;
   }else stats.preservados++;
  }
 }
 return stats;
}
async function carregar(db,{url=originalUrl,fetcher=root.fetch}={}){
 if(!url||typeof fetcher!=="function")throw Error("Importação pública indisponível");
 const response=await fetcher(url,{cache:"no-cache"});
 if(!response.ok)throw Error("Referências públicas não disponíveis");
 return importar(db,await response.json());
}
return {importar,carregar};
});