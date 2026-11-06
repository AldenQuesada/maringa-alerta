/* Consultas paginadas com escopo explícito por prefeitura. */
(function(root){
'use strict';
 async function pages(client,table,order,scope=null){
  const rows=[];
  for(let start=0;;start+=500){
   let q=client.from(table).select('*');
   if(scope)q=q.eq(table==='ma_prefeituras'?'id':'municipio_id',scope);
   for(const field of order)q=q.order(field);
   const response=await q.range(start,start+499);
   if(response.error)throw Error(response.error.message);
   const page=response.data;
   rows.push(...page);if(page.length<500)return rows;
  }
 }
root.AlertaRepositorioConsultas={pages};
})(globalThis);
