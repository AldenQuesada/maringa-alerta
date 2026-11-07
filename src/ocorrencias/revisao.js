/* revisao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({api,bairro,esc,form,overlay,state,tipo}){
function preencherOrganizacoes(){
  const root=overlay.querySelector('#cad-oc-orgs');
  const escolhidos=new Set([...root.querySelectorAll('input:checked')].map(x=>x.value));
  const recomendados=new Set(api.suggest(tipo.value,bairro.value));
  root.innerHTML=api.organizations(bairro.value).map(x=>`<label class="cad-choice"><input type="checkbox" value="${esc(x.id)}" ${escolhidos.has(x.id)||recomendados.has(x.id)?'checked':''}> ${esc(x.nome)}${recomendados.has(x.id)?' · sugerida pela regra':''}${x.zona?' · '+esc(x.zona):''}</label>`).join('')||'<p>Nenhuma organização ou equipe cadastrada.</p>';
 }
function dados(){
  return {tipo:tipo.value,gravidade:Number(form.elements.gravidade.value),responsabilidade:form.elements.responsabilidade.value,
   evento:form.elements.evento.value,descricao:form.elements.descricao.value.trim(),afetados:form.elements.afetados.value,
   riscos:form.elements.riscos.value.trim(),endereco:form.elements.endereco.value.trim(),pos:state.pos,bairro:bairro.value,
   acesso:form.elements.acesso.value.trim(),origem:form.elements.origem.value,quando:form.elements.quando.value,
   comunicante:form.elements.comunicante.value.trim(),contato:form.elements.contato.value.trim(),
   raio:Number(form.elements.raio.value)||AlertaGestaoDados.parametros.ocorrencias.raioDuplicidadeMetros,janela:Number(form.elements.janela.value)||AlertaGestaoDados.parametros.ocorrencias.janelaDuplicidadeHoras,fotosPublicas:form.elements.fotosPublicas.checked,organizacoes:[...overlay.querySelectorAll('#cad-oc-orgs input:checked')].map(x=>x.value),fotos:state.files};
 }
function verificar(){
  state.duplicateAcknowledged=false;
  state.matches=api.findDuplicates(dados());
  overlay.querySelector('#cad-oc-duplicates').innerHTML=state.matches.length?`<h3>Possíveis registros relacionados</h3><p>Compare antes de confirmar. Relatos do WhatsApp aparecem quando estão no cadastro deste navegador.</p>
   ${state.matches.map(m=>`<div class="cad-duplicate"><strong>${esc(m.tipo)}</strong> · ${esc(m.local)} · ${esc(m.origem)} <details><summary>Comparar detalhes</summary><p>Situação: ${esc(m.situacao||'Não informada')}</p><p>${esc(m.descricao||'Sem descrição adicional')}</p></details> ${m.vinculavel?`<button type="button" class="admin-btn" data-link="${esc(m.id)}">Vincular relato</button>`:''}</div>`).join('')}
   <label class="cad-choice"><input type="checkbox" id="cad-oc-separate"> Revisei e se trata de uma ocorrência separada.</label>`:'';
 }
return {preencherOrganizacoes,dados,verificar};
}
root.AlertaOcorrenciasRevisao={criar};
})(globalThis);
