/* Cadastro canônico, confirmação de versão e envio independente, como no editor atual do Clinic AI. */
(function(){
'use strict';
const client=window.AlertaSupabaseClient,main=document.getElementById('colaboradores'),dialog=document.getElementById('editor');
let context=window.AlertaNuvem.colaboradores,epoch=0;
const labels={usuarios:'Pessoas',equipes:'Equipes',integrantes:'Integrantes',voluntarios:'Colaboradores da comunidade',instituicoes:'Instituições',unidades:'Unidades',servicos:'Serviços',recursos:'Recursos',zonas:'Zonas',bairros:'Bairros',bases:'Bases',riscos:'Áreas de risco',eventos:'Eventos',incidentes:'Ocorrências',solicitacoes:'Solicitações',relatos:'Relatos',mobilizacoes:'Mobilizações',apoios:'Apoios',veiculos:'Veículos',equipamentos:'Equipamentos',estoques:'Estoques',abrigos:'Abrigos',pontos:'Pontos de apoio',ocorrenciaTipos:'Tipos de ocorrência',canais:'Canais',regras:'Regras',importacoes:'Importações'};
const roles={admin:'Administrador municipal',operador:'Operador',leitor:'Somente consulta'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rpc=async(name,args)=>{const r=await client.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;};
const city=context.municipio;
const municipal=window.AlertaNuvem.municipios.find(x=>x.id===city);
async function reload(){context=await rpc('ma_colaboradores_contexto',{municipio:city});render();}
function render(){
 ++epoch;
 main.innerHTML='<div class="toolbar"><div><h1>Colaboradores</h1><p>'+esc(municipal?.dados?.nome||city)+'</p></div><button id="novo"><span class="plus" aria-hidden="true">+</span>Novo colaborador</button></div><p class="muted">Cadastre a pessoa, sua atuação e suas permissões. O acesso é enviado depois da confirmação do cadastro.</p><p><a href="../gestao/?municipio='+encodeURIComponent(city)+'#equipes">Gerenciar equipes</a></p><div class="cards">'+context.colaboradores.map((x,i)=>'<article class="card"><h2>'+esc(x.dados.nome)+'</h2><p>'+esc(x.dados.email)+'</p><p>'+esc(x.dados.cargo||x.dados.funcao)+'</p><p>Equipe: '+esc(context.equipes.find(t=>t.id===x.dados.equipe_id)?.nome||'Sem equipe definida')+'</p><p>'+esc(roles[x.acesso?.papel]||'Permissões a definir')+'</p><p><span class="badge">'+esc(x.acesso?.situacao==='ativo'?'Acesso ativo':x.acesso?.situacao==='suspenso'?'Acesso suspenso':'Cadastro sem acesso ativado')+'</span></p><p>'+esc(x.envio?.estado==='enviado'?'Envio aceito pelo serviço de e-mail':x.envio?.estado==='falhou'?'Falha no envio; cadastro preservado':'')+'</p><button data-edit="'+i+'">Editar cadastro e acesso</button></article>').join('')+'</div>';
 main.querySelector('#novo').onclick=()=>edit();
 main.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(context.colaboradores[Number(b.dataset.edit)]));
}
function edit(original){
 let step=0,saved=original||null,busy=false,dirty=false,command=crypto.randomUUID(),sent=false;
 const id=original?.dados.id||crypto.randomUUID();
 const draft={nome:'',email:'',telefone:'',endereco:'',bairro:'',cep:'',numero:'',complemento:'',documento:'',nascimento:'',orgao:'',cargo:'',funcao:'operador',equipe_id:'',responsavel_id:'',substituto_id:'',especialidade:'',horarios:[],...structuredClone(original?.dados||{})};
 let access={papel:'leitor',colecoes:['eventos','incidentes','solicitacoes'],situacao:'pendente',...structuredClone(original?.acesso||{})};
 const choices=(list,value)=>'<option value="">Não definido</option>'+list.map(x=>'<option value="'+esc(x.id)+'" '+(value===x.id?'selected':'')+'>'+esc(x.nome)+'</option>').join('');
 const input=(key,label,type='text',required=false)=>'<label><span>'+label+'</span><input name="'+key+'" type="'+type+'" value="'+esc(draft[key])+'" '+(required?'required':'')+' maxlength="500"></label>';
 function collect(){
  if(!dialog.querySelector('form'))return;
  const form=dialog.querySelector('form');
  for(const el of form.querySelectorAll('[name]')){if(el.name==='papel')access.papel=el.value;else if(el.name==='suspenso')access.situacao=el.checked?'suspenso':saved?.acesso?.situacao==='ativo'?'ativo':'pendente';else if(el.name!=='colecao')draft[el.name]=el.value;}
  if(step===2)draft.horarios=[...form.querySelectorAll('.shift')].map(row=>({dia:Number(row.querySelector('[data-dia]').value),inicio:row.querySelector('[data-inicio]').value,fim:row.querySelector('[data-fim]').value}));
  if(step===3)access.colecoes=[...form.querySelectorAll('[name=colecao]:checked')].map(x=>x.value);
 }
 const currentValid=()=>dialog.querySelector('form').reportValidity();
 function draw(){
  const titles=['Dados pessoais','Atuação','Horários','Acesso e revisão'];
  let fields='';
  if(step===0)fields='<div class="form-grid">'+input('nome','Nome completo','text',true)+input('email','E-mail de acesso','email',true)+input('telefone','Telefone','tel',true)+input('documento','Documento de identificação (opcional)')+input('nascimento','Data de nascimento (opcional)','date')+input('cep','CEP')+input('endereco','Endereço','text',true)+input('numero','Número')+input('complemento','Complemento')+input('bairro','Bairro','text',true)+'</div>';
  if(step===1){const people=context.colaboradores.filter(x=>x.dados.id!==id).map(x=>x.dados);fields='<p>Município: <strong>'+esc(municipal?.dados?.nome||city)+'</strong></p><div class="form-grid">'+input('orgao','Órgão ou instituição')+input('cargo','Cargo','text',true)+'<label><span>Função de atuação</span><select name="funcao">'+Object.entries({admin:'Administração',responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenação',operador:'Operação'}).map(([v,l])=>'<option value="'+v+'" '+(draft.funcao===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label><span>Equipe</span><select name="equipe_id">'+choices(context.equipes,draft.equipe_id)+'</select></label><label><span>Responsável</span><select name="responsavel_id">'+choices(people,draft.responsavel_id)+'</select></label><label><span>Substituto</span><select name="substituto_id">'+choices(people,draft.substituto_id)+'</select></label>'+input('especialidade','Área de atuação')+'</div><p class="muted">A função descreve o trabalho. As permissões são definidas na próxima etapa de acesso.</p>';}
  if(step===2)fields='<p>Registre os períodos semanais de disponibilidade. Para um plantão noturno, use dois períodos em dias consecutivos. Sem horários significa atuação sem escala fixa.</p>'+draft.horarios.map((h,i)=>'<div class="shift"><label><span>Dia</span><select data-dia>'+['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d,j)=>'<option value="'+j+'" '+(Number(h.dia)===j?'selected':'')+'>'+d+'</option>').join('')+'</select></label><label><span>Início</span><input data-inicio type="time" required value="'+esc(h.inicio)+'"></label><label><span>Fim</span><input data-fim type="time" required value="'+esc(h.fim)+'"></label><button type="button" data-remove="'+i+'" aria-label="Remover horário '+(i+1)+'">Remover</button></div>').join('')+'<button type="button" data-add '+(draft.horarios.length>=21?'disabled':'')+'><span class="plus" aria-hidden="true">+</span>Adicionar horário</button>';
  if(step===3)fields='<div class="form-grid"><label><span>Papel de acesso</span><select name="papel">'+Object.entries(roles).map(([v,l])=>'<option value="'+v+'" '+(access.papel===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label><span>Situação do acesso</span><input type="checkbox" name="suspenso" '+(access.situacao==='suspenso'?'checked':'')+'>Suspender acesso</label></div><p>Administrador gerencia este município. Operador pode editar os cadastros autorizados. Leitor apenas consulta. Nenhum papel concede Administração Geral.</p><details '+(access.papel==='admin'?'hidden':'')+'><summary>Escolher áreas de acesso ('+access.colecoes.length+' selecionadas)</summary><div class="permissions">'+context.colecoes.map(c=>'<label><input type="checkbox" name="colecao" value="'+esc(c)+'" '+(access.colecoes.includes(c)?'checked':'')+'>'+esc(labels[c]||c)+'</label>').join('')+'</div></details><h3>Revisão</h3><div class="review">'+esc(draft.nome+'\n'+draft.email+' · '+draft.telefone+'\n'+draft.endereco+' · '+draft.bairro+'\n'+draft.cargo+' · '+draft.horarios.length+' período(s) de atuação')+'</div><p>O cadastro será salvo antes de enviar o link. A pessoa define a própria senha no primeiro acesso.</p>';
  dialog.innerHTML='<div class="dialog-heading"><h2 id="editor-title">'+(original?'Editar colaborador':'Novo colaborador')+'</h2><button type="button" data-close aria-label="Fechar cadastro">Fechar</button></div><ol class="steps">'+titles.map((t,i)=>'<li '+(i===step?'aria-current="step"':'')+'>'+(i+1)+'. '+t+'</li>').join('')+'</ol><form><fieldset><legend>'+titles[step]+'</legend>'+fields+'</fieldset><p role="alert"></p><div class="actions"><button type="button" data-back '+(step===0?'hidden':'')+'>Anterior</button><button type="submit" class="primary">'+(step<3?'Continuar':access.situacao==='suspenso'?'Salvar suspensão':saved?.acesso?.situacao==='ativo'?'Salvar alterações':'Salvar e enviar acesso')+'</button></div></form>';
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
    const result=await rpc('ma_colaborador_salvar',{municipio:city,identificador:id,ficha:draft,acesso:access,versao_esperada:saved?.versao??null});
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
 dialog.onclose=()=>{dialog.replaceChildren();main.querySelector('#novo')?.focus();};
 draw();dialog.showModal();
}
render();
const query=new URLSearchParams(location.search);
if(query.has('novo'))edit();else if(query.has('pessoa')){const item=context.colaboradores.find(x=>x.dados.id===query.get('pessoa'));if(item)edit(item);}
})();
