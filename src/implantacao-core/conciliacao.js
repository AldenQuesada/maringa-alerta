/* conciliacao: domínio independente com dependências explícitas. */
(function(root){
'use strict';
function criar({norm,str}){
function uniqueKey(x){return str(x.externalId||x.codigo_cnes&&"cnes:"+x.codigo_cnes||x.id||"n:"+norm(x.nome)+"|"+norm(x.endereco));}
function merge(existing,incoming,{preserveVerified=true}={}){
 const current=new Map(existing.map(x=>[uniqueKey(x),x]));
 const names=new Map(existing.filter(x=>x.nome).map(x=>[norm(x.nome)+"|"+norm(x.tipo)+"|"+norm(x.endereco),x]));
 const result=[],seen=new Set(),stats={new:0,updated:0,preserved:0,duplicates:0};
 for(const raw of incoming){
  if(!raw?.nome)continue;
  const key=uniqueKey(raw),nk=norm(raw.nome)+"|"+norm(raw.tipo)+"|"+norm(raw.endereco);
  if(seen.has(key)){stats.duplicates++;continue;}seen.add(key);
  const old=current.get(key)||names.get(nk);
  if(!old){stats.new++;result.push({...raw});continue;}
  if(preserveVerified&&["Validado","Manual confirmado"].includes(old.verificacao)){stats.preserved++;result.push({...old});continue;}
  stats.updated++;result.push({...old,...Object.fromEntries(Object.entries(raw).filter(([k,v])=>v!==""&&v!==null&&v!==undefined)),id:old.id,municipioId:old.municipioId});
 }
 return {items:result,stats};
}
return {uniqueKey,merge};
}
root.AlertaImplantacaoConciliacao={criar};
})(globalThis);
