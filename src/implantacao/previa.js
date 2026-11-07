/* previa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({D,TAB,esc,normal,stage,state}){
function notify(msg){state.ctx?.toast?.(msg);}
function log(source,msg,status="info"){stage.logs.push({source,msg,status,time:new Date().toLocaleTimeString("pt-BR")});stage.updated=new Date().toISOString();}
function addStage(modulo,items){if(!TAB.includes(modulo))return;const list=stage.grupos[modulo]||[];
 const byKey=new Map(list.map(x=>[state.C.uniqueKey(x),x]));
 for(const x of items){if(x?.nome)byKey.set(state.C.uniqueKey(x),x);}
 stage.grupos[modulo]=[...byKey.values()];
}
function ready(){return !!state.ctx?.db?.municipioAtivo()?.codigo_ibge;}
function locState(){const p=state.ctx.db.municipioAtivo();return '<div class="mi-context"><strong>'+esc(p?.pais||'Brasil')+'</strong><strong>'+esc(p?.estado||p?.uf||'')+'</strong><strong>'+esc(p?.nome||'Município')+'</strong><span class="mi-code">IBGE '+esc(p?.codigo_ibge||'')+'</span></div>';}
function summary(){
 const registros=state.ctx.db.estado(),id=state.ctx.db.municipioAtivo()?.id;
 const count=k=>(registros[D.ESQUEMAS[k].collection]||[]).filter(x=>x.municipioId===id&&(!D.ESQUEMAS[k].category||x.categoria===D.ESQUEMAS[k].category)).length;
 const num=Object.values(stage.grupos).reduce((n,list)=>n+list.length,0);
 return '<div class="mi-summary">'+
 [['Município',1],['Bairros',count("bairros")],['Unidades de saúde',count("saude")],['Serviços e segurança',count("emergencias")+count("parceiros")],['Prontos para conferir',num]].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+b+'</strong></div>').join("")+'</div>';
}
function previewRows(k){
 const fromDB=state.ctx.db.lista(k);
 const staged=stage.grupos[k]||[];
 const map=new Map(fromDB.map(x=>[state.C.uniqueKey(x),{...x,_pending:false}]));
 for(const x of staged){
  const key=state.C.uniqueKey(x),old=map.get(key);
  map.set(key,{...(old||{}),...x,_pending:true});
 }
 return [...map.values()];
}
function selectedRows(){
 return previewRows(state.tab).filter(x=>{
  const needle=normal(state.search.trim());
  return !needle||[x.nome,x.tipo,x.bairro,x.zona,x.endereco,x.fonte,x.codigo_cnes].some(v=>normal(v).includes(needle));
 });
}
return {notify,log,addStage,ready,locState,summary,previewRows,selectedRows};
}
root.AlertaImplantacaoPrevia={criar};
})(globalThis);
