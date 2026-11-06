/* Composição das páginas. Serviços, formulários e visualizações têm contratos próprios. */
(function(root){
'use strict';
const ui=root.AlertaPlataformaUI,el=document.getElementById('screen');
const service=root.AlertaNuvem?.ativo?root.AlertaNuvem.admin:ui.criarDemo();
const state={filtros:{busca:'',uf:'',pagina:0},acessosPagina:0,auditoriaPagina:0};
const cache=new Map();let epoch=0,noticeTimer;
function notice(message){
  const target=document.getElementById('notification');target.textContent=message;target.hidden=false;
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>target.hidden=true,7000);
}
async function catalogo(uf=''){
  if(!cache.has(uf))cache.set(uf,service.catalogo(uf).catch(error=>{cache.delete(uf);throw error;}));
  return cache.get(uf);
}
async function render(){
  const current=++epoch;
  const parts=location.hash.slice(1).split('/');
  const page=parts[0]||'dashboard';let id;
  try{id=parts[1]?decodeURIComponent(parts[1]):null;}catch{notice('Endereço inválido.');return;}
  const active=['nova','editar','acessos','territorio'].includes(page)?'municipios':page;
  document.querySelectorAll('[data-page]').forEach(link=>{
    link.classList.toggle('active',link.dataset.page===active);
    if(link.dataset.page===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  el.setAttribute('aria-busy','true');el.innerHTML='<p role="status">Carregando…</p>';
  const ctx={el,service,state,catalogo,notice,render,show(markup){
    if(epoch!==current)return false;
    el.innerHTML=(!service.remoto?'<div class="notice">Demonstração local · nenhum dado é gravado no banco.</div>':'')+markup;
    el.removeAttribute('aria-busy');return true;
  }};
  try{
    if(page==='nova')await ui.editor(ctx,null);
    else if(page==='editar'&&id)await ui.editor(ctx,id);
    else if(page==='acessos'&&id)await ui.acessos(ctx,id);
    else if(page==='administradores')await ui.acessos(ctx,null);
    else if(page==='auditoria')await ui.auditoria(ctx);
    else if(page==='territorio'&&id)await ui.territorio(ctx,id);
    else if(page==='municipios'||page==='territorios')await ui.municipios(ctx);
    else await ui.dashboard(ctx);
  }catch(error){
    if(ctx.show(ui.heading('Não foi possível carregar',error.message)+'<button class="btn" id="retry">Tentar novamente</button>'))el.querySelector('#retry').onclick=render;
  }
}
window.addEventListener('hashchange',()=>{state.acessosPagina=0;render();});
render();
})(globalThis);
