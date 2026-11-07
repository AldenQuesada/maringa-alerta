/* Formulário canônico. Dados oficiais e versão original acompanham a gravação. */
(function(root){
'use strict';
const {esc,heading,panel,field,situacoes}=root.AlertaPlataformaUI;
async function editor(ctx,id){
  const [original,ufs]=await Promise.all([id?ctx.service.detalhe(id):null,ctx.catalogo()]);
  let cities=[],loading=0,step=1;
  if(!ctx.show(heading(original?'Editar Prefeitura':'Nova Prefeitura','Identificação oficial, contato institucional e situação do ambiente.')+
    panel('Cadastro da prefeitura','<form id="city-form"><p id="form-step" aria-live="polite">Etapa 1 de 2 · Identificação oficial</p><section data-step="1"><div class="form-grid">'+
      field('País','pais','<input id="pais" value="Brasil" readonly>')+
      field('Estado','uf','<select id="uf" required '+(original?'disabled':'')+'><option value="">Selecione o estado</option>'+ufs.map(u=>'<option value="'+esc(u.sigla)+'" '+(u.sigla===original?.uf?'selected':'')+'>'+esc(u.nome)+'</option>').join('')+'</select>')+
      field('Município oficial IBGE','cidade',original?'<input id="cidade" value="'+esc(original.nome)+'" readonly>':'<select id="cidade" required disabled><option value="">Selecione primeiro o estado</option></select>')+
      field('Código IBGE','codigo','<input id="codigo" value="'+esc(original?.codigo_ibge||'')+'" readonly>')+
      '</div></section><section data-step="2" hidden><div class="form-grid">'+
      field('Responsável institucional','responsavel','<input id="responsavel" name="responsavel" maxlength="200" value="'+esc(original?.responsavel)+'">')+
      field('E-mail institucional','email','<input id="email" name="email" type="email" maxlength="254" value="'+esc(original?.email)+'">')+
      field('Telefone institucional','telefone','<input id="telefone" name="telefone" type="tel" maxlength="40" value="'+esc(original?.telefone)+'">')+
      field('Situação','status','<select id="status" name="status">'+Object.entries(situacoes).map(([v,l])=>'<option value="'+v+'" '+(v===(original?.status||'implantacao')?'selected':'')+'>'+l+'</option>').join('')+'</select>')+
      '</div><p>O contato institucional é uma referência. As permissões são gerenciadas na página Acessos da prefeitura. Suspender bloqueia os vínculos municipais e preserva os dados.</p></section><p id="city-error" role="alert"></p><div class="form-actions"><a class="btn" href="#municipios">Cancelar</a><button class="btn" type="button" id="previous-step" hidden>Voltar</button><button class="btn primary" type="button" id="next-step">Continuar</button><button class="btn primary" type="submit" hidden>Salvar Prefeitura</button></div></form>')))return;
  const form=ctx.el.querySelector('form'),uf=form.querySelector('#uf'),city=form.querySelector('#cidade'),feedback=form.querySelector('#city-error');
  function changeStep(value){
    if(value===2&&(!uf.reportValidity()||(!original&&!city.value))){feedback.textContent='Selecione um município do catálogo oficial.';return;}
    step=value;feedback.textContent='';
    form.querySelectorAll('[data-step]').forEach(section=>section.hidden=Number(section.dataset.step)!==step);
    form.querySelector('#previous-step').hidden=step===1;form.querySelector('#next-step').hidden=step===2;
    form.querySelector('[type=submit]').hidden=step===1;
    form.querySelector('#form-step').textContent=step===1?'Etapa 1 de 2 · Identificação oficial':'Etapa 2 de 2 · Responsabilidade e situação';
    form.querySelector(step===1?'#uf':'#responsavel').focus();
  }
  form.querySelector('#next-step').onclick=()=>changeStep(2);
  form.querySelector('#previous-step').onclick=()=>changeStep(1);
  if(!original){
    uf.onchange=async()=>{
      const attempt=++loading;cities=[];city.disabled=true;form.querySelector('#codigo').value='';feedback.textContent='';
      city.innerHTML='<option value="">'+(uf.value?'Carregando municípios…':'Selecione primeiro o estado')+'</option>';
      if(!uf.value)return;
      try{
        const result=await ctx.catalogo(uf.value);
        if(attempt!==loading||!city.isConnected)return;
        cities=result;city.innerHTML='<option value="">Selecione o município</option>'+result.map(x=>'<option value="'+esc(x.codigo_ibge)+'">'+esc(x.nome)+'</option>').join('');city.disabled=false;
      }catch(error){if(attempt===loading&&city.isConnected){feedback.textContent=error.message+' Selecione o estado novamente para tentar.';}}
    };
    city.onchange=()=>{form.querySelector('#codigo').value=city.value;};
  }
  form.onsubmit=async e=>{
    e.preventDefault();if(step===1){changeStep(2);return;}
    const submit=form.querySelector('[type=submit]');if(submit.disabled)return;
    const selected=original||cities.find(x=>x.codigo_ibge===city.value),unit=ufs.find(x=>x.sigla===uf.value);
    if(!selected||!unit){feedback.textContent='Selecione um município do catálogo oficial.';return;}
    const fd=new FormData(form);
    const dados={...original,id:original?.id||crypto.randomUUID(),nome:selected.nome,codigo_ibge:selected.codigo_ibge,
      uf:unit.sigla,estado:unit.nome,codigo_uf:unit.codigo,pais:'Brasil',paisId:'BR',
      responsavel:String(fd.get('responsavel')).trim(),email:String(fd.get('email')).trim(),
      admin_municipal_email:String(fd.get('email')).trim(),telefone:String(fd.get('telefone')).trim(),status:fd.get('status'),origem_provisionamento:'Admin Geral · catálogo IBGE'};
    submit.disabled=true;feedback.textContent='Salvando…';
    try{await ctx.service.salvar(dados,original);ctx.notice('Prefeitura salva'+(ctx.service.remoto?' no banco.':' na demonstração local.'));location.hash='municipios';}
    catch(error){feedback.textContent=error.message+' Atualize a página antes de tentar novamente.';}
    finally{submit.disabled=false;}
  };
}
root.AlertaPlataformaUI.editor=editor;
})(globalThis);
