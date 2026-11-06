/* Histórico imutável para clientes; paginação mantém a consulta limitada. */
(function(root){
'use strict';
const {esc,heading,panel,pager,bindPager}=root.AlertaPlataformaUI;
const acoes={INSERT:'Criação',UPDATE:'Alteração',DELETE:'Remoção'};
async function auditoria(ctx){
  if(!ctx.service.remoto){ctx.show(heading('Histórico de alterações','Disponível no ambiente conectado.'));return;}
  const result=await ctx.service.auditoria(ctx.state.auditoriaPagina||0);
  if(!ctx.show(heading('Histórico de alterações','Registro de autoria, data, operação e campos alterados. O histórico não pode ser editado pela aplicação.')+
    panel('Alterações registradas','<div class="table-wrap"><table class="records"><thead><tr><th>Data</th><th>Operação</th><th>Registro</th><th>Autor</th><th>Campos</th></tr></thead><tbody>'+result.items.map(x=>'<tr><td>'+esc(new Date(x.criado_em).toLocaleString('pt-BR'))+'</td><td>'+esc(acoes[x.operacao]||x.operacao)+'</td><td>'+esc(x.tabela)+'<small>'+esc(x.municipio_id||'Plataforma')+' · '+esc(x.registro_id)+'</small></td><td><small>'+esc(x.ator_id||'Operação técnica no banco')+'</small></td><td>'+esc(x.campos.join(', '))+'</td></tr>').join('')+(result.items.length?'':'<tr><td colspan="5">Nenhuma alteração registrada desde a ativação do histórico.</td></tr>')+'</tbody></table></div>')+pager(result)))return;
  bindPager(ctx.el,result.pagina,pagina=>{ctx.state.auditoriaPagina=pagina;ctx.render();});
}
root.AlertaPlataformaUI.auditoria=auditoria;
})(globalThis);
