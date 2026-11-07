/* AlertaCadastrosImportacao: contrato independente, dependências recebidas na criação. */
(function(global){
'use strict';
function criar({store,ESQUEMAS,read}){
const {refresh,salvar}=store;const {municipioCorrente}=read;
function importarLote(modulo,rows,{modo="revisado"}={}){
  refresh();
  const permitido=new Set(["bairros","zonas","bases","riscos","abrigos","pontos","saude","emergencias","parceiros"]);
  if(!permitido.has(modulo))throw new Error("Coleção não permitida para importação.");
  if(!Array.isArray(rows)||rows.length>5000)throw new Error("Lote inválido ou maior que 5.000 registros.");
  const m=ESQUEMAS[modulo],municipioId=municipioCorrente();
  if(!municipioId)throw new Error("Selecione o município.");
  const anterior=store.value;
  const clone=JSON.parse(JSON.stringify(store.value));
  const all=clone[m.collection],filtered=all.filter(x=>x.municipioId===municipioId);
  const byKey=new Map(filtered.filter(x=>x.externalId||x.codigo_cnes).map(x=>[String(x.externalId||"cnes:"+x.codigo_cnes),x]));
  const byName=new Map(filtered.filter(x=>x.nome).map(x=>[(String(x.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(x.tipo||"").toLowerCase()),x]));
  const idGen=()=>global.crypto&&typeof global.crypto.randomUUID==="function"?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const stats={novos:0,atualizados:0,preservados:0,duplicados:0};
  const batchSeen=new Set();
  for(const src of rows){
   if(!src||typeof src!=="object"||!String(src.nome||"").trim())throw new Error("Lote contém registro sem nome.");
   if(src.municipioId&&src.municipioId!==municipioId)throw new Error("Município divergente no lote.");
   if(m.category&&src.categoria&&src.categoria!==m.category)throw new Error("Categoria divergente no lote.");
   const exid=String(src.externalId||src.codigo_cnes&&"cnes:"+src.codigo_cnes||"");
   const fallback=String(src.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(src.tipo||"").toLowerCase();
   const unique=exid||fallback;
   if(batchSeen.has(unique)){stats.duplicados++;continue;}
   batchSeen.add(unique);
   const old=exid?byKey.get(exid)||byName.get(fallback):byName.get(fallback);
   if(old?.verificacao==="Validado"||old?.verificacao==="Manual confirmado"){
    stats.preservados++;continue;
   }
   const allowedFields=new Set([...m.fields.map(f=>f.key),"externalId","codigo_cnes","lat","lng","geojson","fonte","url_fonte","verificacao","atualizado_em","bairro","cep","observacoes","categoria"]);
   const cleaned=Object.fromEntries(Object.entries(src).filter(([k,v])=>allowedFields.has(k)&&v!==undefined&&v!==null));
   if(old){
    const idx=all.findIndex(x=>x.id===old.id);
    all[idx]={...old,...Object.fromEntries(Object.entries(cleaned).filter(([k,v])=>v!=="")),id:old.id,municipioId,categoria:m.category||old.categoria};
    stats.atualizados++;
   }else{
    const item={...cleaned,id:idGen(),municipioId,categoria:m.category||cleaned.categoria};
    all.push(item);byName.set(fallback,item);if(exid)byKey.set(exid,item);
    stats.novos++;
   }
  }
  store.value=clone;
  try{salvar();return stats}catch(e){store.value=anterior;throw e}
 }
return {importarLote};
}
global.AlertaCadastrosImportacao={criar};
})(globalThis);
