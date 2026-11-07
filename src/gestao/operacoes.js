/* operacoes: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({$,db,render,renderModulo,renderMunicipios,state,toastTimer}){
async function geocodificarPrefeitura(item) {
 if(item.lat!==undefined||!item.nome||!item.uf)return;
 try{
  const params=new URLSearchParams({q:item.nome+", "+item.uf+", Brasil",format:"json",limit:"1"});
  const res=await fetch("https://nominatim.openstreetmap.org/search?"+params.toString(),{headers:{"Accept":"application/json"}});
  if(!res.ok)return;
  const list=await res.json(),x=list[0];if(!x)return;
  const lat=Number(x.lat),lng=Number(x.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const bb=(x.boundingbox||[]).map(Number);
  const geo={lat,lng};
  if(bb.length===4&&bb.every(Number.isFinite)){
   const [south,north,west,east]=bb,dy=Math.max((north-south)*.06,.002),dx=Math.max((east-west)*.06,.002);
   geo.bbox=[south-dy,north+dy,west-dx,east+dx];
  }
  await db.atualizarGeo(item.id,geo);
  if(state.atual==="prefeituras")renderModulo();
 }catch(_){/* O cadastro permanece salvo mesmo sem geocodificação externa. */}
}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;},2800);
}
async function excluir(id){
 if(db.tipo==='supabase'&&!db.pode(state.atual,'excluir')){toast('Você não tem permissão para excluir este cadastro.');return;}
 const item=db.registro(state.atual,id);if(!item)return;
 const label=item.nome||item.identificacao||"este registro";
 if(!confirm('Excluir "'+label+'"?'))return;
 try{const anterior=db.municipioAtivo()?.id;await db.excluir(state.atual,id);if(state.atual==="prefeituras"){renderMunicipios();if(anterior!==db.municipioAtivo()?.id){location.reload();return;}}render();if(state.atual==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro excluído.");}catch(e){toast(e.message);}
}
return {geocodificarPrefeitura,toast,excluir};
}
root.AlertaGestaoOperacoes={criar};
})(globalThis);
