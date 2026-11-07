/* Listagem e indicadores: consulta paginada, sem carregar cadastros operacionais. */
(function(root){
'use strict';
const {esc,heading,panel,status,plus,pager,bindPager}=root.AlertaPlataformaUI;
function rows(items){
  return '<div class="table-wrap"><table class="records"><thead><tr><th>Prefeitura</th><th>IBGE</th><th>Situação</th><th>Referência institucional</th><th>Ações</th></tr></thead><tbody>'+items.map(p=>
    '<tr><td><strong>'+esc(p.nome)+'</strong><small>'+esc(p.uf)+'</small></td><td>'+esc(p.codigo_ibge)+'</td><td>'+status(p.status)+'</td><td>'+esc(p.admin_municipal_email||'Não informado')+'</td><td><div class="row-actions">'+
    '<a class="btn" href="#editar/'+encodeURIComponent(p.id)+'">Editar</a><a class="btn" href="#acessos/'+encodeURIComponent(p.id)+'">Acessos</a><a class="btn" href="#territorio/'+encodeURIComponent(p.id)+'">Território</a>'+
    (p.status==='suspensa'?'':'<button class="btn" data-open="'+esc(p.id)+'">Abrir Prefeitura</button>')+'</div></td></tr>').join('')+
    (items.length?'':'<tr><td colspan="5" class="empty">Nenhuma prefeitura encontrada.</td></tr>')+'</tbody></table></div>';
}
function bindOpen(ctx){
  ctx.el.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{
    const url=new URL('../gestao/',location.href);url.searchParams.set('municipio',button.dataset.open);
    if(!ctx.service.remoto){sessionStorage.setItem(root.AlertaAdminPlataforma.MUNICIPIO_CTX,button.dataset.open);url.searchParams.set('modo','demo');}
    location.href=url.href;
  });
}
async function dashboard(ctx){
  const numbers=await ctx.service.estatisticas();
  if(!ctx.show(heading('Administração do sistema','Gerencie prefeituras e os acessos de suas equipes.',plus('Nova Prefeitura','data-new'))+
    '<div class="stat-grid">'+['Prefeituras cadastradas','Em implantação','Ativas','Suspensas'].map((label,i)=>'<div class="stat"><small>'+label+'</small><strong>'+numbers[i]+'</strong></div>').join('')+'</div>'+
    panel('Gestão central','<p>O cadastro utiliza o catálogo oficial IBGE. Cada prefeitura tem seu próprio ambiente e vínculos de acesso. A suspensão bloqueia o acesso municipal e preserva os registros.</p><div class="entry-pills"><a href="#municipios">Prefeituras</a><a href="#administradores">Administradores gerais</a><a href="#auditoria">Histórico de alterações</a></div>')))return;
  ctx.el.querySelector('[data-new]').onclick=()=>{location.hash='nova';};
}
async function municipios(ctx){
  const filters=ctx.state.filtros;
  const [result,ufs]=await Promise.all([ctx.service.listar(filters),ctx.catalogo()]);
  if(!ctx.show(heading('Prefeituras','Cadastro único por município, disponível para todas as UFs.',plus('Nova Prefeitura','data-new'))+
    panel('Buscar prefeituras','<form id="filters" class="toolbar"><label class="grow">Nome ou código IBGE<input name="busca" type="search" value="'+esc(filters.busca)+'" placeholder="Buscar prefeitura"></label><label>Estado<select name="uf"><option value="">Todos os estados</option>'+ufs.map(x=>'<option value="'+esc(x.sigla)+'" '+(x.sigla===filters.uf?'selected':'')+'>'+esc(x.nome)+'</option>').join('')+'</select></label><button class="btn" type="submit">Buscar</button></form>')+rows(result.items)+pager(result)))return;
  ctx.el.querySelector('[data-new]').onclick=()=>{location.hash='nova';};
  ctx.el.querySelector('#filters').onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);Object.assign(filters,{busca:String(data.get('busca')),uf:String(data.get('uf')),pagina:0});ctx.render();};
  bindPager(ctx.el,result.pagina,pagina=>{filters.pagina=pagina;ctx.render();});
  bindOpen(ctx);
}
root.AlertaPlataformaUI.dashboard=dashboard;
root.AlertaPlataformaUI.municipios=municipios;
})(globalThis);
