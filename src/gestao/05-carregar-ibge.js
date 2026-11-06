async function carregarIBGE(uf){
 if(!D.UFS.includes(uf))return;
 const lista=$("ibge-cidades");if(!lista)return;
 let cidades=cidadesPorUf.get(uf);
 try{
  if(!cidades){
   const res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+encodeURIComponent(uf)+"/municipios",{cache:"force-cache"});
   if(!res.ok)throw Error("Não foi possível consultar o IBGE.");
   cidades=await res.json();cidadesPorUf.set(uf,cidades);
  }
  if(!DRAWER.hidden&&$("field-uf")?.value===uf&&$("ibge-cidades")){
   $("ibge-cidades").innerHTML=cidades.map(x=>'<option value="'+esc(x.nome)+'"></option>').join("");
   atualizarCodigoIBGE();
  }
 }catch(_){/* Permitir preenchimento manual do código IBGE quando a API estiver indisponível. */}
}
function atualizarCodigoIBGE(){
 const uf=$("field-uf")?.value,cidade=$("field-nome")?.value?.trim(),codigo=$("field-codigo_ibge");
 if(!uf||!cidade||!codigo)return;
 const normal=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
 const found=(cidadesPorUf.get(uf)||[]).find(x=>normal(x.nome)===normal(cidade));
 if(found)codigo.value=String(found.id);
}
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
  if(atual==="prefeituras")renderModulo();
 }catch(_){/* O cadastro permanece salvo mesmo sem geocodificação externa. */}
}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;},2800);
}
async function excluir(id){
 const item=db.registro(atual,id);if(!item)return;
 const label=item.nome||item.identificacao||"este registro";
 if(!confirm('Excluir "'+label+'"?'))return;
 try{const anterior=db.municipioAtivo()?.id;await db.excluir(atual,id);if(atual==="prefeituras"){renderMunicipios();if(anterior!==db.municipioAtivo()?.id){location.reload();return;}}render();if(atual==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro excluído.");}catch(e){toast(e.message);}
}
FORM.addEventListener("submit",async e=>{
 e.preventDefault();const modulo=drawerModulo||atual;
 const data={};
 for(const [k,v] of new FormData(FORM).entries()){if(Object.hasOwn(data,k))data[k]=[].concat(data[k],v);else data[k]=v;}
 for(const f of D.ESQUEMAS[modulo].fields)if(f.type==="multi")data[f.key]=Array.isArray(data[f.key])?data[f.key]:data[f.key]?[data[f.key]]:[];
 try{
  const item=await db.gravar(modulo,data,edicao);
  const novo=!edicao;
  fecharDrawer();
  if(modulo==="prefeituras")renderMunicipios();
  render();if(modulo==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro salvo.");
  if(novo&&modulo==="prefeituras")geocodificarPrefeitura(item);
 }catch(err){$("form-error").textContent=err.message;}
});
PAGE.addEventListener("click",async e=>{
 if(e.target.closest('[data-importar-tornado]')){try{if(db.tipo==="supabase")throw Error("Eventos demonstrativos não são enviados ao Supabase.");EventoTornado2026.importar(db);render();toast('Evento histórico disponível no cadastro.');}catch(err){toast(err.message||'Não foi possível importar.');}return;}

 const novo=e.target.closest("[data-new]");
 const edit=e.target.closest("[data-edit]");
 const del=e.target.closest("[data-delete]");
 const canon=e.target.closest("[data-canon-edit]");
 const geoEdit=e.target.closest("[data-geo-edit]");
 if(canon){abrirDrawer(canon.dataset.id,canon.dataset.canonEdit);return;}
 if(geoEdit){abrirDrawer(geoEdit.dataset.geoEdit,geoEdit.dataset.geoModule||geoTipo);return;}
 if(novo){
  e.preventDefault();
  if(atual==="inicio")location.hash="#"+novo.dataset.new;
  else abrirDrawer(null,novo.dataset.new);
  return;
 }
 if(edit){abrirDrawer(edit.dataset.edit);return;}
 if(del){excluir(del.dataset.delete);return;}
});
window.addEventListener("gestao:referencia-territorial",e=>{
 const {modulo,source}=e.detail||{};
 if(atual!=="geoterritorialidade"||!["zonas","bairros"].includes(modulo)||!source)return;
 abrirDrawer(null,modulo,source);
});
$("drawer-close").onclick=fecharDrawer;
$("drawer-cancel").onclick=fecharDrawer;
DRAWER.addEventListener("click",e=>{if(e.target===DRAWER)fecharDrawer();});
document.addEventListener("keydown",e=>{
 if(DRAWER.hidden)return;
 if(e.key==="Escape"){e.preventDefault();fecharDrawer();}
 if(e.key==="Tab"){
  const items=[...DRAWER.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])")].filter(x=>!x.closest("[hidden]"));
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
 }
});
$("toggle-sidebar").onclick=()=>{
 const isMobile=window.matchMedia("(max-width:850px)").matches;
 if(isMobile){FRAME.classList.toggle("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded",String(FRAME.classList.contains("mobile-open")));}
 else{FRAME.classList.toggle("collapsed");$("toggle-sidebar").setAttribute("aria-expanded",String(!FRAME.classList.contains("collapsed")));}
};
$("sidebar-scrim").onclick=()=>{FRAME.classList.remove("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded","false");};
window.addEventListener("hashchange",()=>{pesquisa="";render();});
renderMunicipios();
const abrirMapa=$("abrir-mapa");
// O Mapa de Evento original contém apenas simulação de Maringá;
// não mostrar ocorrências de Maringá a uma Prefeitura recém-provisionada.
if(db.municipioAtivo()?.id!=="maringa"){
 abrirMapa.href="#";
 abrirMapa.title="Mapa de Evento deste município requer implantação operacional.";
 abrirMapa.setAttribute("aria-disabled","true");
 abrirMapa.addEventListener("click",e=>{e.preventDefault();toast("O Mapa de Evento desta Prefeitura ainda precisa ser configurado. Não serão mostradas ocorrências de Maringá.");},true);
}
abrirMapa.addEventListener("click",e=>{
 if(window.matchMedia("(max-width:850px)").matches)return; // navegador móvel controla a janela
 e.preventDefault();
 const largura=Math.max(760,Math.min(1500,screen.availWidth-70));
 const altura=Math.max(550,Math.min(950,screen.availHeight-70));
 const esquerda=Math.max(0,Math.round((screen.availWidth-largura)/2));
 const topo=Math.max(0,Math.round((screen.availHeight-altura)/2));
 const win=window.open(abrirMapa.href,"MaringaAlertaMapaOperacional",
  "popup=yes,width="+largura+",height="+altura+",left="+esquerda+",top="+topo);
 if(win){try{win.opener=null;win.focus();}catch(_){}}
 else{const fallback=document.createElement("a");fallback.href=abrirMapa.href;fallback.target="_blank";fallback.rel="noopener noreferrer";document.body.appendChild(fallback);fallback.click();fallback.remove();}
});
if(!window.AlertaNuvem?.ativo&&globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&db.municipioAtivo()){
 try{
  const local=AlertaSessao.criar({municipioId:db.municipioAtivo().id});
  AlertaSessaoUI.criar({target:$("session-anchor"),sessao:local,municipio:db.municipioAtivo().nome,zonas:db.lista("zonas").map(x=>x.nome),aoMudar:()=>{}});
 }catch(error){$("session-anchor").textContent="Minha sessão";}
}
render();
void importarUnidadesCNES();
void importarBasesERiscosPublicos();
// Ao trocar para uma prefeitura nova, tentar localizar seu mapa automaticamente.
const prefeituraInicial=db.municipioAtivo();
// Georreferenciamento inicial exclusivo da Administração Geral.
})();
