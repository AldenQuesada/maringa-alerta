/* Cadastro canônico, confirmação de versão e envio independente, como no editor atual do Clinic AI. */
(function(){
'use strict';
const client=window.AlertaSupabaseClient,main=document.getElementById('colaboradores'),dialog=document.getElementById('editor');
let context=window.AlertaNuvem.colaboradores,epoch=0,page={itens:[],proxima:null},search='',cursor=null,history=[],timer;
const labels={usuarios:'Pessoas',equipes:'Equipes',integrantes:'Integrantes',voluntarios:'Colaboradores da comunidade',instituicoes:'Instituições',unidades:'Unidades',servicos:'Serviços',recursos:'Recursos',zonas:'Zonas',bairros:'Bairros',bases:'Bases',riscos:'Áreas de risco',eventos:'Eventos',incidentes:'Ocorrências',solicitacoes:'Solicitações',relatos:'Relatos',mobilizacoes:'Mobilizações',apoios:'Apoios',veiculos:'Veículos',equipamentos:'Equipamentos',estoques:'Estoques',abrigos:'Abrigos',pontos:'Pontos de apoio',ocorrenciaTipos:'Tipos de ocorrência',canais:'Canais',regras:'Regras',importacoes:'Importações'};
const roles={admin:'Administrador municipal',operador:'Operador',leitor:'Somente consulta'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rpc=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;};
const city=context.municipio;
const municipal=window.AlertaNuvem.municipios.find(x=>x.id===city);
async function reload(){
 const request=++epoch;main.querySelectorAll('[data-previous],[data-next]').forEach(b=>b.disabled=true);main.querySelector('[role=status]').textContent='Buscando colaboradores…';const next=await rpc('ma_colaboradores_pagina',{municipio:city,busca:search,apos:cursor,tamanho:30});
 if(request!==epoch)return;page=next;renderCards();
}
async function open(id){
 const feedback=main.querySelector('[role=status]');feedback.textContent='Carregando ficha…';
 try{const item=await rpc('ma_colaborador_detalhe',{municipio:city,identificador:id});if(!item)throw Error('Cadastro não encontrado.');edit(item);feedback.textContent='';}catch(error){feedback.textContent=error.message;}
}
function renderCards(){
 main.querySelector('.cards').innerHTML=page.itens.map(x=>'<article class="card"><h2>'+esc(x.dados.nome)+'</h2><p>'+esc(x.dados.email)+'</p><p>'+esc(x.dados.cargo||x.dados.funcao)+'</p><p>Equipe: '+esc(x.equipe_nome||'Sem equipe definida')+'</p><p>'+esc(roles[x.acesso?.papel]||'Permissões a definir')+'</p><p><span class="badge">'+esc(x.acesso?.situacao==='ativo'?'Acesso ativo':x.acesso?.situacao==='suspenso'?'Acesso suspenso':'Cadastro sem acesso ativado')+'</span></p><p>'+esc(x.envio?.estado==='enviado'?'Envio aceito pelo serviço de e-mail':x.envio?.estado==='falhou'?'Falha no envio; cadastro preservado':'')+'</p><button data-edit="'+esc(x.dados.id)+'">Editar cadastro e acesso</button></article>').join('');
 main.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>void open(b.dataset.edit));
 main.querySelector('[data-previous]').disabled=!history.length;main.querySelector('[data-next]').disabled=!page.proxima;
 main.querySelector('[role=status]').textContent=page.itens.length+' cadastros nesta página'+(page.proxima?'. Há mais resultados.':'.');
}
function render(){
 main.innerHTML='<div class="toolbar"><div><h1>Colaboradores</h1><p>'+esc(municipal?.dados?.nome||city)+'</p></div><button id="novo"><span class="plus" aria-hidden="true">+</span>Novo colaborador</button></div><p class="muted">Cadastre a pessoa, sua atuação e suas permissões. O acesso é enviado depois da confirmação do cadastro.</p><p><a href="../gestao/?municipio='+encodeURIComponent(city)+'#equipes">Gerenciar equipes</a></p><label>Buscar colaborador<input type="search" id="busca-colaborador" maxlength="100" autocomplete="off" placeholder="Nome, e-mail completo ou bairro"></label><p role="status" aria-live="polite">Carregando colaboradores…</p><div class="cards"></div><nav class="actions" aria-label="Páginas de colaboradores"><button data-previous disabled>Anterior</button><button data-next disabled>Próxima página</button></nav>';
 main.querySelector('#novo').onclick=()=>edit();
 main.querySelector('#busca-colaborador').oninput=e=>{search=e.target.value;++epoch;clearTimeout(timer);history=[];cursor=null;main.querySelector('.cards').replaceChildren();main.querySelectorAll('[data-previous],[data-next]').forEach(b=>b.disabled=true);main.querySelector('[role=status]').textContent='Buscando colaboradores…';timer=setTimeout(()=>void reload().catch(showError),250);};
 main.querySelector('[data-next]').onclick=()=>{if(!page.proxima)return;history.push(cursor);cursor=page.proxima;void reload().catch(showError);};
 main.querySelector('[data-previous]').onclick=()=>{cursor=history.pop()??null;void reload().catch(showError);};
}
function showError(error){main.querySelector('[role=status]').textContent=error.message;}
function edit(original){
 let step=0,saved=original||null,busy=false,dirty=false,command=crypto.randomUUID(),sent=false,selectors=[];
 const references={...original?.referencias};
 const id=original?.dados.id||crypto.randomUUID();
 const draft={nome:'',email:'',telefone:'',endereco:'',bairro:'',cep:'',numero:'',complemento:'',documento:'',nascimento:'',orgao:'',cargo:'',funcao:'operador',equipe_id:'',responsavel_id:'',substituto_id:'',especialidade:'',horarios:[],...structuredClone(original?.dados||{})};
 let access={papel:'leitor',colecoes:['eventos','incidentes','solicitacoes'],situacao:'pendente',...structuredClone(original?.acesso||{})};
 const input=(key,label,type='text',required=false)=>'<label><span>'+label+'</span><input name="'+key+'" type="'+type+'" value="'+esc(draft[key])+'" '+(required?'required':'')+' maxlength="500"></label>';
 function collect(){
  if(!dialog.querySelector('form'))return;
  const form=dialog.querySelector('form');
  for(const el of form.querySelectorAll('[name]')){if(el.name==='papel')access.papel=el.value;else if(el.name==='suspenso')access.situacao=el.checked?'suspenso':saved?.acesso?.situacao==='ativo'?'ativo':'pendente';else if(el.name!=='colecao')draft[el.name]=el.value;}
  for(const name of ['equipe_id','responsavel_id','substituto_id']){const field=form.elements.namedItem(name);if(field)references[name]=field.selectedOptions[0]?.textContent||'';}
  if(step===2)draft.horarios=[...form.querySelectorAll('.shift')].map(row=>({dia:Number(row.querySelector('[data-dia]').value),inicio:row.querySelector('[data-inicio]').value,fim:row.querySelector('[data-fim]').value}));
  if(step===3)access.colecoes=[...form.querySelectorAll('[name=colecao]:checked')].map(x=>x.value);
 }
 const currentValid=()=>dialog.querySelector('form').reportValidity();
 function draw(){
  selectors.forEach(s=>s.destroy());selectors=[];
  const titles=['Dados pessoais','Atuação','Horários','Acesso e revisão'];
  let fields='';
  if(step===0)fields='<div class="form-grid">'+input('nome','Nome completo','text',true)+input('email','E-mail de acesso','email',true)+input('telefone','Telefone','tel',true)+input('documento','Documento de identificação (opcional)')+input('nascimento','Data de nascimento (opcional)','date')+input('cep','CEP')+input('endereco','Endereço','text',true)+input('numero','Número')+input('complemento','Complemento')+input('bairro','Bairro','text',true)+'</div>';
  if(step===1){fields='<p>Município: <strong>'+esc(municipal?.dados?.nome||city)+'</strong></p><div class="form-grid">'+input('orgao','Órgão ou instituição')+input('cargo','Cargo','text',true)+'<label><span>Função de atuação</span><select name="funcao">'+Object.entries({admin:'Administração',responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenação',operador:'Operação'}).map(([v,l])=>'<option value="'+v+'" '+(draft.funcao===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><div data-seletor="equipe_id"></div><div data-seletor="responsavel_id"></div><div data-seletor="substituto_id"></div>'+input('especialidade','Área de atuação')+'</div><p class="muted">A função descreve o trabalho. As permissões são definidas na próxima etapa de acesso.</p>';}
  if(step===2)fields='<p>Registre os períodos semanais de disponibilidade. Para um plantão noturno, use dois períodos em dias consecutivos. Sem horários significa atuação sem escala fixa.</p>'+draft.horarios.map((h,i)=>'<div class="shift"><label><span>Dia</span><select data-dia>'+['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d,j)=>'<option value="'+j+'" '+(Number(h.dia)===j?'selected':'')+'>'+d+'</option>').join('')+'</select></label><label><span>Início</span><input data-inicio type="time" required value="'+esc(h.inicio)+'"></label><label><span>Fim</span><input data-fim type="time" required value="'+esc(h.fim)+'"></label><button type="button" data-remove="'+i+'" aria-label="Remover horário '+(i+1)+'">Remover</button></div>').join('')+'<button type="button" data-add '+(draft.horarios.length>=21?'disabled':'')+'><span class="plus" aria-hidden="true">+</span>Adicionar horário</button>';
  if(step===3)fields='<div class="form-grid"><label><span>Papel de acesso</span><select name="papel">'+Object.entries(roles).map(([v,l])=>'<option value="'+v+'" '+(access.papel===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label><span>Situação do acesso</span><input type="checkbox" name="suspenso" '+(access.situacao==='suspenso'?'checked':'')+'>Suspender acesso</label></div><p>Administrador gerencia este município. Operador pode editar os cadastros autorizados. Leitor apenas consulta. Nenhum papel concede Administração Geral.</p><details '+(access.papel==='admin'?'hidden':'')+'><summary>Escolher áreas de acesso ('+access.colecoes.length+' selecionadas)</summary><div class="permissions">'+context.colecoes.map(c=>'<label><input type="checkbox" name="colecao" value="'+esc(c)+'" '+(access.colecoes.includes(c)?'checked':'')+'>'+esc(labels[c]||c)+'</label>').join('')+'</div></details><h3>Revisão</h3><div class="review">'+esc(draft.nome+'\n'+draft.email+' · '+draft.telefone+'\n'+draft.endereco+' · '+draft.bairro+'\n'+draft.cargo+' · '+draft.horarios.length+' período(s) de atuação')+'</div><p>O cadastro será salvo antes de enviar o link. A pessoa define a própria senha no primeiro acesso.</p>';
  dialog.innerHTML='<div class="dialog-heading"><h2 id="editor-title">'+(original?'Editar colaborador':'Novo colaborador')+'</h2><button type="button" data-close aria-label="Fechar cadastro">Fechar</button></div><ol class="steps">'+titles.map((t,i)=>'<li '+(i===step?'aria-current="step"':'')+'>'+(i+1)+'. '+t+'</li>').join('')+'</ol><form><fieldset><legend>'+titles[step]+'</legend>'+fields+'</fieldset><p role="alert"></p><div class="actions"><button type="button" data-back '+(step===0?'hidden':'')+'>Anterior</button><button type="submit" class="primary">'+(step<3?'Continuar':access.situacao==='suspenso'?'Salvar suspensão':saved?.acesso?.situacao==='ativo'?'Salvar alterações':'Salvar e enviar acesso')+'</button></div></form>';
  if(step===1)for(const [nome,modulo,rotulo] of [['equipe_id','equipes','Equipe'],['responsavel_id','pessoas','Responsável'],['substituto_id','pessoas','Substituto']]){
   selectors.push(AlertaSeletoresRemotos.montar({alvo:dialog.querySelector('[data-seletor="'+nome+'"]'),client,municipio:city,modulo,nome,rotulo,valor:draft[nome],texto:references[nome],excluir:modulo==='pessoas'?id:''}));
  }
  dialog.querySelector('[data-close]').onclick=()=>{if(!busy)dialog.close();};
  dialog.querySelector('[data-back]').onclick=()=>{collect();step--;draw();};
  dialog.querySelector('form').oninput=()=>{dirty=true;};
  dialog.querySelector('[name=papel]')?.addEventListener('change',()=>{collect();draw();});
  dialog.querySelector('[name=suspenso]')?.addEventListener('change',()=>{collect();draw();});
  dialog.querySelector('[data-add]')?.addEventListener('click',()=>{collect();draft.horarios.push({dia:1,inicio:'08:00',fim:'17:00'});dirty=true;draw();});
  dialog.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{collect();draft.horarios.splice(Number(b.dataset.remove),1);dirty=true;draw();});
  dialog.querySelector('form').onsubmit=async event=>{
   event.preventDefault();if(busy||!currentValid())return;collect();
   if(step<3){step++;draw();return;}
   busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);const feedback=dialog.querySelector('[role=alert]');feedback.textContent='Salvando cadastro e permissões…';
   try{
    const result=await rpc('ma_colaborador_salvar',{municipio:city,identificador:id,ficha:draft,acesso:{papel:access.papel,colecoes:access.colecoes,situacao:access.situacao},versao_esperada:saved?.versao??null});
    if(result.dados?.id!==id||!Number.isSafeInteger(result.versao))throw Error('Não foi possível confirmar o salvamento. Atualize a lista.');
    saved={dados:result.dados,versao:result.versao,acesso:{...access,situacao:result.situacao}};dirty=false;command=crypto.randomUUID();
    await reload();
    if(result.situacao==='pendente')await send(feedback);else feedback.textContent='Cadastro e permissões salvos.';
    showSaved(feedback.textContent);
   }catch(error){feedback.textContent=error.message;if(saved&&!dirty)showSaved(error.message);}
   finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  };
  dialog.querySelector('input,select,button[type=submit]')?.focus();dialog.scrollTop=0;
 }
 async function send(feedback){
  feedback.textContent='Cadastro salvo. Enviando acesso…';
  const result=await client.functions.invoke('ma-colaboradores-acesso',{body:{acao:'enviar',municipio:city,colaborador:id,versao:saved.versao,comando:command}});
  if(result.error){let message;try{message=(await result.error.context.json()).error;}catch{}throw Error(message||'Cadastro salvo. O envio não foi confirmado. Tente enviar novamente.');}
  if(result.data?.estado==='aguardando')throw Error('Cadastro salvo. Uma tentativa de envio está em andamento. Aguarde um momento antes de tentar novamente.');
  if(result.data?.estado!=='enviado')throw Error('Cadastro salvo. O envio não foi confirmado.');
  sent=true;feedback.textContent='Cadastro salvo. O serviço de e-mail aceitou o envio do link de acesso.';await reload();
 }
 function showSaved(message){
  dialog.innerHTML='<h2 id="editor-title">Cadastro salvo</h2><p>'+esc(draft.nome)+'</p><p role="alert">'+esc(message)+'</p><div class="actions"><button data-close>Concluir</button>'+(saved.acesso.situacao!=='suspenso'?'<button data-send>Enviar acesso novamente</button>':'')+'</div>';
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-send]')?.addEventListener('click',async event=>{if(busy)return;busy=true;event.currentTarget.disabled=true;if(sent){command=crypto.randomUUID();sent=false;}try{await send(dialog.querySelector('[role=alert]'));}catch(error){dialog.querySelector('[role=alert]').textContent=error.message;}finally{busy=false;dialog.querySelector('[data-send]').disabled=false;}});
 }
 dialog.oncancel=event=>{if(busy)event.preventDefault();};
 dialog.onclose=()=>{selectors.forEach(s=>s.destroy());dialog.replaceChildren();main.querySelector('#novo')?.focus();};
 draw();dialog.showModal();
}
render();void reload().catch(showError);
const query=new URLSearchParams(location.search);
if(query.has('novo'))edit();else if(query.has('pessoa'))void open(query.get('pessoa'));
})();
