 function mostrarEtapa(indice){
  etapa=indice;
  overlay.querySelectorAll('.cad-step').forEach(sec=>{sec.hidden=Number(sec.dataset.step)!==indice;});
  overlay.querySelectorAll('[data-step-label]').forEach(el=>{el.classList.toggle('active',Number(el.dataset.stepLabel)===indice);});
  overlay.querySelector('#cad-oc-back').hidden=indice===0;
  overlay.querySelector('#cad-oc-next').hidden=indice===3;
  overlay.querySelectorAll('button[type="submit"]').forEach(el=>{el.hidden=indice!==3;});
  overlay.querySelector('.cad-step-content').scrollTop=0;
  error.textContent='';
  if(indice===1 && map)setTimeout(()=>map.invalidateSize(),50);
  if(indice===3)verificar();
 }
 function validarEtapa(indice){
  const sec=overlay.querySelector('[data-step="'+indice+'"]');
  const campo=[...sec.querySelectorAll('input,select,textarea')].find(el=>!el.disabled&&!el.closest('.cad-add-panel[hidden], #cad-criterios[hidden]')&&!el.checkValidity());
  if(campo){mostrarEtapa(indice);campo.reportValidity();return false;}
  if(indice===1&&!pos){mostrarEtapa(1);error.textContent='Selecione o ponto da ocorrência no mapa.';return false;}
  return true;
 }
 function validarFormulario(){
  const anterior=etapa;
  for(let indice=0;indice<4;indice++)if(!validarEtapa(indice))return false;
  if(etapa!==anterior)mostrarEtapa(anterior);
  return true;
 }
 overlay.querySelector('#cad-oc-next').onclick=()=>{if(validarEtapa(etapa))mostrarEtapa(etapa+1);};
 overlay.querySelector('#cad-oc-back').onclick=()=>mostrarEtapa(etapa-1);
 overlay.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>{
  const painel=overlay.querySelector('#cad-add-'+button.dataset.add);
  painel.hidden=!painel.hidden;button.setAttribute('aria-expanded',String(!painel.hidden));
  if(!painel.hidden)painel.querySelector('input,select')?.focus();
 });
 overlay.querySelector('#cad-criterios-toggle').onclick=e=>{
  const painel=overlay.querySelector('#cad-criterios');painel.hidden=!painel.hidden;
  e.currentTarget.setAttribute('aria-expanded',String(!painel.hidden));
 };
 overlay.querySelector('#cad-tipo-criar').onclick=()=>{
  const nome=overlay.querySelector('#cad-tipo-nome').value.trim();
  const prioridade=overlay.querySelector('#cad-tipo-prioridade').value;
  const aviso=overlay.querySelector('#cad-tipo-status');
  if(!nome){aviso.textContent='Informe o nome do tipo.';return;}
  try{
   api.createType(nome,prioridade);tipo.innerHTML=escOptions(api.types());tipo.value=nome;
   tipo.dispatchEvent(new Event('change'));aviso.textContent='Tipo salvo e selecionado.';
  }catch(e){aviso.textContent=e.message;}
 };
 overlay.querySelector('#cad-org-criar').onclick=()=>{
  const nome=overlay.querySelector('#cad-org-nome').value.trim();
  const categoria=overlay.querySelector('#cad-org-categoria').value;
  const aviso=overlay.querySelector('#cad-org-status');
  if(!nome){aviso.textContent='Informe o nome.';return;}
  try{
   const id=api.createOrganization(nome,categoria,bairro.value);
   preencherOrganizacoes();
   const novo=[...overlay.querySelectorAll('#cad-oc-orgs input')].find(el=>el.value===id);
   if(novo)novo.checked=true;
   aviso.textContent='Cadastro salvo e selecionado.';
  }catch(e){aviso.textContent=e.message;}
 };
 const escOptions=values=>values.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');
 function fechar(){overlay.hidden=true;api.onClose?.();api.trigger.focus();}
 function preencherOrganizacoes(){
  const root=overlay.querySelector('#cad-oc-orgs');
  const escolhidos=new Set([...root.querySelectorAll('input:checked')].map(x=>x.value));
  const recomendados=new Set(api.suggest(tipo.value,bairro.value));
  root.innerHTML=api.organizations(bairro.value).map(x=>`<label class="cad-choice"><input type="checkbox" value="${esc(x.id)}" ${escolhidos.has(x.id)||recomendados.has(x.id)?'checked':''}> ${esc(x.nome)}${recomendados.has(x.id)?' · sugerida pela regra':''}${x.zona?' · '+esc(x.zona):''}</label>`).join('')||'<p>Nenhuma organização ou equipe cadastrada.</p>';
 }
 function dados(){
  return {tipo:tipo.value,gravidade:Number(form.elements.gravidade.value),responsabilidade:form.elements.responsabilidade.value,
   evento:form.elements.evento.value,descricao:form.elements.descricao.value.trim(),afetados:form.elements.afetados.value,
   riscos:form.elements.riscos.value.trim(),endereco:form.elements.endereco.value.trim(),pos,bairro:bairro.value,
   acesso:form.elements.acesso.value.trim(),origem:form.elements.origem.value,quando:form.elements.quando.value,
   comunicante:form.elements.comunicante.value.trim(),contato:form.elements.contato.value.trim(),
   raio:Number(form.elements.raio.value)||150,janela:Number(form.elements.janela.value)||24,fotosPublicas:form.elements.fotosPublicas.checked,organizacoes:[...overlay.querySelectorAll('#cad-oc-orgs input:checked')].map(x=>x.value),fotos:files};
 }
 function verificar(){
  duplicateAcknowledged=false;
  matches=api.findDuplicates(dados());
  overlay.querySelector('#cad-oc-duplicates').innerHTML=matches.length?`<h3>Possíveis registros relacionados</h3><p>Compare antes de confirmar. Relatos do WhatsApp aparecem quando estão no cadastro deste navegador.</p>
   ${matches.map(m=>`<div class="cad-duplicate"><strong>${esc(m.tipo)}</strong> · ${esc(m.local)} · ${esc(m.origem)} <details><summary>Comparar detalhes</summary><p>Situação: ${esc(m.situacao||'Não informada')}</p><p>${esc(m.descricao||'Sem descrição adicional')}</p></details> ${m.vinculavel?`<button type="button" class="admin-btn" data-link="${esc(m.id)}">Vincular relato</button>`:''}</div>`).join('')}
   <label class="cad-choice"><input type="checkbox" id="cad-oc-separate"> Revisei e se trata de uma ocorrência separada.</label>`:'';
 }
