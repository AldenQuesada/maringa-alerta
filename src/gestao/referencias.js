/* Importação de referências configuradas por código IBGE; sem dependência da tela. */
(function(root){
'use strict';
function criar({db,config,carregarPublica,fetch,onChange=()=>{},onError=()=>{}}){
let referenciasPublicasConsultadas=false,cnesConsultado=false;
async function importarBasesERiscosPublicos(){
 if(db.tipo==="supabase")return;
 const municipio=db.municipioAtivo();
 const referencia=config.referencias(municipio);
 if(referenciasPublicasConsultadas||!referencia.publicas?.length)return;
 referenciasPublicasConsultadas=true;
 const docs=referencia.publicas.map(path=>"../"+path);
 const results=await Promise.allSettled(docs.map(url=>carregarPublica(db,{url})));
 const alterados=results.some(r=>r.status==="fulfilled"&&(r.value.novos||r.value.atualizados));
 if(results.some(r=>r.status==="rejected"))console.warn("Algumas referências públicas ainda não estão disponíveis.");
 if(alterados)onChange();
}
async function importarUnidadesCNES(){
 if(db.tipo==="supabase")return;
 const municipio=db.municipioAtivo(),referencia=config.referencias(municipio).cnes;
 if(cnesConsultado||!referencia)return;
 cnesConsultado=true;
 const codigosExistentes=new Set(["saude","emergencias"].flatMap(modulo=>db.lista(modulo)).map(x=>String(x.codigo_cnes||"")).filter(Boolean));
 if(codigosExistentes.size>=referencia.quantidade)return;
 try{
  const r=await fetch("../"+referencia.url,{cache:"no-cache"});
  if(!r.ok)throw Error("Arquivo de referência CNES indisponível");
  const doc=await r.json();
  if(String(doc.municipio_ibge)!==String(municipio.codigo_ibge)||!Array.isArray(doc.unidades)||doc.unidades.length!==referencia.quantidade)throw Error("Base CNES inválida");
  for(const [grupo] of [["saude"],["emergencias"]]){
   const linhas=doc.unidades.filter(x=>x.grupo===grupo&&!codigosExistentes.has(String(x.codigo_cnes))).map(x=>({nome:x.nome,tipo:x.tipo,codigo_cnes:x.codigo_cnes,externalId:"cnes:"+x.codigo_cnes,fonte:"CNES · Ministério da Saúde",url_fonte:doc.url_fonte,verificacao:"Em conferência"}));
   if(linhas.length)await db.importarLote(grupo,linhas);
  }
  onChange();
 }catch(err){onError("Não foi possível importar unidades do CNES: "+err.message);}
}

return {importarBasesERiscosPublicos,importarUnidadesCNES};
}
root.AlertaGestaoReferencias={criar};
})(globalThis);
