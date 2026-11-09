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
/* Adaptador explícito de demonstração; nenhum privilégio real é simulado como concedido. */
(function(root){
'use strict';
function criar(){
  const central=root.AlertaAdminPlataforma.criar();
  let reference;
  async function catalog(){
    if(!reference){
      const response=await fetch('../dados-territoriais/catalogo-ibge.json');
      if(!response.ok)throw Error('Catálogo IBGE indisponível.');
      reference=await response.json();
    }
    return reference;
  }
  return {
    remoto:false,
    async catalogo(uf){const data=await catalog();return uf?data.municipios.filter(x=>x.uf===uf):data.ufs;},
    async listar({busca='',uf='',pagina=0}={}){
      const items=central.municipios().filter(x=>(!uf||x.uf===uf)&&(!busca||(x.nome+' '+x.codigo_ibge).toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))));
      return {items:items.slice(pagina*25,(pagina+1)*25),total:items.length,pagina,tamanho:25};
    },
    async estatisticas(){const items=central.municipios();return [items.length,...['implantacao','ativa','suspensa'].map(s=>items.filter(x=>x.status===s).length)];},
    async detalhe(id){const p=central.municipios().find(x=>x.id===id);if(!p)throw Error('Prefeitura não encontrada.');return p;},
    async salvar(dados,anterior){
      const saved=central.gravarPrefeitura({uf:dados.uf,estado:dados.estado,cidade:{id:dados.codigo_ibge,nome:dados.nome,uf:{sigla:dados.uf}},telefone:dados.telefone,email:dados.email,adminMunicipal:dados.responsavel,status:dados.status},anterior?.id);
      if(dados.limite_geojson)central.registrarGeo(saved.id,dados);
      return saved;
    },
    async acessos(){throw Error('A gestão de acessos exige conexão autenticada ao banco.');},
    async auditoria(){throw Error('O histórico de alterações exige conexão autenticada ao banco.');}
  };
}
root.AlertaPlataformaUI.criarDemo=criar;
})(globalThis);
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
/* Vínculos de identidades confirmadas; não cria contas nem envia mensagens. */
(function(root){
'use strict';
const {esc,heading,panel,field,plus}=root.AlertaPlataformaUI;
const papeis={admin:'Administrador municipal',operador:'Operador',leitor:'Leitor'};
async function acessos(ctx,id){
  if(!ctx.service.remoto){ctx.show(heading('Acessos','Disponível no ambiente conectado.')+panel('Autenticação necessária','<p>Entre com sua conta de Administração Geral para gerenciar vínculos reais.</p>'));return;}
  const page=ctx.state.acessosPagina||0;
  const [city,items]=await Promise.all([id?ctx.service.detalhe(id):null,ctx.service.acessos(id||null,page)]);
  const novoCadastro=root.MARINGA_SUPABASE?.cadastroAdministrativo===true;
  const title=city?'Acessos · '+city.nome:'Administradores gerais';
  if(!ctx.show(heading(title,city?(novoCadastro?'Cadastre a pessoa e suas permissões antes de enviar o acesso.':'Vincule uma conta com e-mail confirmado. Os vínculos autorizam somente esta prefeitura.'):'Contas autorizadas a gerenciar o cadastro e os acessos das prefeituras.',city?(novoCadastro?'<a class="btn" href="../colaboradores/?municipio='+encodeURIComponent(city.id)+'"><span style="color:#f4ca44;font-size:24px" aria-hidden="true">+</span> Novo colaborador</a>':plus('Novo vínculo','data-new-access')):'')+
    (city&&city.status==='suspensa'?'<div class="notice">Prefeitura suspensa. Seus vínculos não permitem acesso municipal enquanto estiver suspensa.</div>':'')+
    '<div class="table-wrap"><table class="records"><thead><tr><th>E-mail confirmado</th><th>Permissão</th>'+(city?'<th>Ações</th>':'')+'</tr></thead><tbody>'+items.map((x,i)=>'<tr><td>'+esc(x.email)+'</td><td>'+esc(papeis[x.papel]||'Administrador geral')+'</td>'+(city?'<td><button class="btn" data-edit-access="'+i+'">Gerenciar</button></td>':'')+'</tr>').join('')+(items.length?'':'<tr><td colspan="3">Nenhum vínculo encontrado.</td></tr>')+'</tbody></table></div>'+
    '<div class="pagination"><button class="btn" data-prev '+(page?'':'disabled')+'>Anterior</button><span>Página '+(page+1)+'</span><button class="btn" data-next '+(items.length===25?'':'disabled')+'>Próxima</button></div><div id="access-editor"></div>'+
    (!city?panel('Administração da plataforma','<p>Administradores gerais são provisionados pelo responsável pelo sistema. Esta página não permite promover contas a administrador geral.</p>'):'')))return;
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
        ctx.notice('Acesso atualizado.');ctx.render();
      }catch(error){feedback.textContent=error.message+' Atualize a lista antes de repetir a operação.';}
      finally{submit.disabled=false;}
    };
  }

  if(!novoCadastro)ctx.el.querySelector('[data-new-access]').onclick=()=>edit(null);
  ctx.el.querySelectorAll('[data-edit-access]').forEach(button=>button.onclick=()=>edit(items[Number(button.dataset.editAccess)]));
}
root.AlertaPlataformaUI.acessos=acessos;
})(globalThis);
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
/* Importação de malha por código IBGE; nenhuma cidade tem tratamento especial. */
(function(root){
'use strict';
function polygon(geo){
  const feature=geo?.type==='FeatureCollection'?geo.features?.find(x=>['Polygon','MultiPolygon'].includes(x?.geometry?.type)):geo;
  const geometry=feature?.geometry||feature;
  if(!['Polygon','MultiPolygon'].includes(geometry?.type))throw Error('Malha IBGE sem polígono.');
  const json=JSON.stringify(geometry);if(json.length>1250000)throw Error('Malha excede o limite de tamanho.');
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,count=0;
  function walk(value){
    if(!Array.isArray(value))throw Error('Coordenadas inválidas.');
    if(typeof value[0]==='number'){
      const [x,y]=value;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>90)throw Error('Coordenada inválida.');
      left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);count++;return;
    }
    value.forEach(walk);
  }
  walk(geometry.coordinates);if(count<4)throw Error('Polígono incompleto.');
  return {lat:(bottom+top)/2,lng:(left+right)/2,bbox:[bottom,top,left,right],limite_geojson:json};
}
async function territorio(ctx,id){
  const {esc,heading,panel}=root.AlertaPlataformaUI;
  const city=await ctx.service.detalhe(id);
  if(!ctx.show(heading('Território · '+city.nome,'Importe o limite oficial deste município. Bairros, zonas e estruturas são cadastros próprios da prefeitura.')+
    panel('Georreferenciamento municipal','<p>IBGE '+esc(city.codigo_ibge)+' · '+esc(city.uf)+'</p><p>Fonte: '+esc(city.fonte_geo||'Nenhuma importação registrada')+'</p><p>Última importação: '+esc(city.geo_atualizado?new Date(city.geo_atualizado).toLocaleString('pt-BR'):'Não realizada')+'</p><button class="btn primary" id="import-geo">Importar limite IBGE</button><p role="alert"></p>')))return;
  const button=ctx.el.querySelector('#import-geo'),feedback=ctx.el.querySelector('[role=alert]');
  button.onclick=async()=>{
    if(button.disabled)return;button.disabled=true;feedback.textContent='Consultando malha oficial…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
    try{
      const url=new URL('https://servicodados.ibge.gov.br/api/v3/malhas/municipios/'+encodeURIComponent(city.codigo_ibge));
      url.searchParams.set('formato','application/vnd.geo+json');url.searchParams.set('qualidade','minima');
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('IBGE indisponível ('+response.status+').');
      const geo=polygon(await response.json());
      await ctx.service.salvar({...city,...geo,fonte_geo:'IBGE · malha municipal',geo_atualizado:new Date().toISOString()},city);
      ctx.notice('Limite municipal salvo.');ctx.render();
    }catch(error){feedback.textContent=error.message+' Atualize a página para conferir o resultado antes de repetir.';}
    finally{clearTimeout(timer);button.disabled=false;}
  };
}
root.AlertaPlataformaUI.territorio=territorio;
root.AlertaPlataformaUI.polygon=polygon;
})(globalThis);
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
