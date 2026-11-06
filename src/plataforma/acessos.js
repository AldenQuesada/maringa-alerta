/* Vínculos de identidades confirmadas; não cria contas nem envia mensagens. */
(function(root){
'use strict';
const {esc,heading,panel,field,plus}=root.AlertaPlataformaUI;
const papeis={admin:'Administrador municipal',operador:'Operador',leitor:'Leitor'};
async function acessos(ctx,id){
  if(!ctx.service.remoto){ctx.show(heading('Acessos','Disponível no ambiente conectado.')+panel('Autenticação necessária','<p>Entre com sua conta de Administração Geral para gerenciar vínculos reais.</p>'));return;}
  const page=ctx.state.acessosPagina||0;
  const [city,items]=await Promise.all([id?ctx.service.detalhe(id):null,ctx.service.acessos(id||null,page)]);
  const title=city?'Acessos · '+city.nome:'Administradores gerais';
  if(!ctx.show(heading(title,city?'Vincule uma conta com e-mail confirmado. Os vínculos autorizam somente esta prefeitura.':'Contas autorizadas a gerenciar o cadastro e os acessos das prefeituras.',city?plus('Novo vínculo','data-new-access'):'')+
    (city&&city.status==='suspensa'?'<div class="notice">Prefeitura suspensa. Seus vínculos não permitem acesso municipal enquanto estiver suspensa.</div>':'')+
    '<div class="table-wrap"><table class="records"><thead><tr><th>E-mail confirmado</th><th>Permissão</th>'+(city?'<th>Ações</th>':'')+'</tr></thead><tbody>'+items.map((x,i)=>'<tr><td>'+esc(x.email)+'</td><td>'+esc(papeis[x.papel]||'Administrador geral')+'</td>'+(city?'<td><button class="btn" data-edit-access="'+i+'">Gerenciar</button></td>':'')+'</tr>').join('')+(items.length?'':'<tr><td colspan="3">Nenhum vínculo encontrado.</td></tr>')+'</tbody></table></div>'+
    '<div class="pagination"><button class="btn" data-prev '+(page?'':'disabled')+'>Anterior</button><span>Página '+(page+1)+'</span><button class="btn" data-next '+(items.length===25?'':'disabled')+'>Próxima</button></div><div id="access-editor"></div>'+
    (!city?panel('Administração da plataforma','<p>Administradores gerais são provisionados pelo responsável técnico no banco. Esta página não permite promover contas a administrador geral.</p>'):'')))return;
  ctx.el.querySelector('[data-prev]').onclick=()=>{ctx.state.acessosPagina=page-1;ctx.render();};
  ctx.el.querySelector('[data-next]').onclick=()=>{ctx.state.acessosPagina=page+1;ctx.render();};
  if(!city)return;
  const container=ctx.el.querySelector('#access-editor');
  function edit(original){
    container.innerHTML=panel(original?'Gerenciar vínculo':'Novo vínculo','<form id="access-form"><div class="form-grid">'+
      field('E-mail da conta','access-email','<input type="email" id="access-email" name="email" required maxlength="254" '+(original?'readonly':'')+' value="'+esc(original?.email)+'">')+
      field('Permissão municipal','access-role','<select id="access-role" name="papel">'+Object.entries(papeis).map(([value,label])=>'<option value="'+value+'" '+((original?.papel||'leitor')===value?'selected':'')+'>'+label+'</option>').join('')+(original?'<option value="revogar">Revogar acesso municipal</option>':'')+'</select>')+
      '</div><p>Administrador e operador podem editar cadastros municipais. Leitor pode consultar. Nenhum desses papéis concede Administração Geral.</p><p role="alert"></p><div class="form-actions"><button type="button" class="btn" data-cancel>Cancelar</button><button type="submit" class="btn primary">Salvar vínculo</button></div></form>');
    container.scrollIntoView({block:'nearest'});container.querySelector('input').focus();
    container.querySelector('[data-cancel]').onclick=()=>{container.replaceChildren();};
    container.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,submit=form.querySelector('[type=submit]'),feedback=form.querySelector('[role=alert]');
      if(submit.disabled)return;
      const data=new FormData(form);submit.disabled=true;feedback.textContent='Salvando vínculo…';
      try{
        await ctx.service.definirVinculo({municipio:city.id,email:String(data.get('email')).trim(),papel:data.get('papel')==='revogar'?null:data.get('papel'),anterior:original?.papel||null});
        ctx.notice('Vínculo atualizado no banco.');ctx.render();
      }catch(error){feedback.textContent=error.message+' Atualize a lista antes de repetir a operação.';}
      finally{submit.disabled=false;}
    };
  }
  ctx.el.querySelector('[data-new-access]').onclick=()=>edit(null);
  ctx.el.querySelectorAll('[data-edit-access]').forEach(button=>button.onclick=()=>edit(items[Number(button.dataset.editAccess)]));
}
root.AlertaPlataformaUI.acessos=acessos;
})(globalThis);
