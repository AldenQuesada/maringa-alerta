/* Componentes visuais sem dependência de dados ou autorização. */
(function(root){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const situacoes={implantacao:'Em implantação',ativa:'Ativa',suspensa:'Suspensa'};
function heading(title,description,actions=''){
  return '<div class="heading"><div><div class="kicker">ADMIN GERAL · TODO O SISTEMA</div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>'+actions+'</div>';
}
function panel(title,body){return '<section class="panel"><div class="panel-head"><h2>'+esc(title)+'</h2></div><div class="panel-body">'+body+'</div></section>';}
function field(label,id,markup){return '<div class="field"><label for="'+esc(id)+'">'+esc(label)+'</label>'+markup+'</div>';}
function status(value){return '<span class="status '+esc(value)+'">'+esc(situacoes[value]||value)+'</span>';}
function plus(label,attrs){return '<button type="button" class="btn add" aria-label="'+esc(label)+'" '+attrs+'><span aria-hidden="true">+</span>'+esc(label)+'</button>';}
function pager({pagina,total,tamanho}){
  return '<div class="pagination"><span>'+total+' registros · página '+(pagina+1)+' de '+Math.max(1,Math.ceil(total/tamanho))+'</span><button class="btn" data-prev '+(pagina===0?'disabled':'')+'>Anterior</button><button class="btn" data-next '+((pagina+1)*tamanho>=total?'disabled':'')+'>Próxima</button></div>';
}
function bindPager(el,page,change){
  el.querySelector('[data-prev]')?.addEventListener('click',()=>change(page-1));
  el.querySelector('[data-next]')?.addEventListener('click',()=>change(page+1));
}
root.AlertaPlataformaUI={esc,situacoes,heading,panel,field,status,plus,pager,bindPager};
})(globalThis);
