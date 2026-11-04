/* Formulário de registro de ocorrência. As operações e o armazenamento vêm do mapa. */
(function(global){
"use strict";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function iniciar(api){
 const overlay=document.createElement('div');
 overlay.className='modal-overlay cadastro-ocorrencia';
 overlay.hidden=true;
 overlay.innerHTML=`<section class="modal cadastro-ocorrencia-modal" role="dialog" aria-modal="true" aria-labelledby="cad-oc-title">
 <header class="modal-head"><h2 id="cad-oc-title">Registrar ocorrência</h2><button type="button" id="cad-oc-close" class="close-btn" aria-label="Fechar">✕</button></header>
 <form id="cad-oc-form" class="modal-body">
 <p class="demo-caption">Registro e acionamento de demonstração neste navegador.</p>
 <div class="cad-grid">
 <label>Tipo de ocorrência <select name="tipo" required></select></label>
 <label>Gravidade <select name="gravidade" required><option value="">Selecione a gravidade</option><option value="1">Baixa</option><option value="2">Média</option><option value="3">Alta</option></select></label>
 <label>Responsabilidade <select name="responsabilidade" required><option value="">Selecione a responsabilidade</option><option value="publica">Pública</option><option value="privada">Privada</option><option value="mista">Mista</option></select></label>
 <label>Evento relacionado <select name="evento"><option value="">Nenhum evento relacionado</option></select></label>
 </div>
 <details><summary>Criar evento maior</summary>
 <div class="cad-grid"><label>Nome do evento <input id="cad-evento-nome" maxlength="160"></label><label>Tipo do evento <input id="cad-evento-tipo" maxlength="100" placeholder="Ex.: tempestade"></label></div>
 <button type="button" id="cad-evento-criar" class="admin-btn">Criar evento</button><p id="cad-evento-status" role="status"></p>
 </details>
 <label>Descrição <textarea name="descricao" rows="2" maxlength="2000"></textarea></label>
 <div class="cad-grid"><label>Pessoas afetadas <input name="afetados" type="number" min="0" max="100000"></label><label>Riscos observados <input name="riscos" maxlength="500"></label></div>
 <label>Endereço ou ponto de referência <input name="endereco" required maxlength="300"></label>
 <button type="button" id="cad-oc-search" class="admin-btn">Buscar endereço no mapa</button><p class="demo-caption">Clique no mapa para confirmar o local. Arraste o marcador para corrigir.</p>
 <div id="cad-oc-map" aria-label="Mapa para selecionar o local"></div>
 <p id="cad-oc-pos" role="status">Nenhum ponto selecionado.</p>
 <label>Bairro ou zona <select name="bairro" required><option value="">Selecione o bairro ou zona</option></select></label>
 <label>Complemento e acesso <input name="acesso" maxlength="300"></label>
 <fieldset><legend>Organizações e equipes</legend><p class="demo-caption">Selecione entre os cadastros disponíveis. As sugestões usam as regras cadastradas.</p><div id="cad-oc-orgs"></div></fieldset>
 <div class="cad-grid"><label>Origem <select name="origem"><option>Operador</option><option>WhatsApp</option><option>Telefone</option><option>Cidadão</option><option>Equipe em campo</option><option>Outro</option></select></label>
 <label>Data e hora do relato <input type="datetime-local" name="quando" required></label></div>
 <div class="cad-grid"><label>Nome do comunicante <input name="comunicante" maxlength="160"></label><label>Contato <input name="contato" maxlength="100"></label></div>
 <label>Fotos <input name="fotos" type="file" accept="image/*" multiple></label><div id="cad-oc-previews" class="attachment-previews"></div>
 <label class="cad-choice"><input type="checkbox" name="fotosPublicas"> Autorizar exibição das fotos no status público</label>
 <details><summary>Critérios para localizar relatos semelhantes</summary>
 <div class="cad-grid"><label>Distância em metros <input name="raio" type="number" min="1" max="5000" value="150"></label><label>Intervalo em horas <input name="janela" type="number" min="1" max="720" value="24"></label></div>
 </details>
 <div id="cad-oc-duplicates" role="status"></div><p id="cad-oc-error" role="alert"></p>
 <div class="flow-actions"><button type="button" id="cad-oc-cancel" class="admin-btn">Cancelar</button><button type="submit" name="acao" value="triagem" class="admin-btn">Salvar para triagem</button><button type="submit" name="acao" value="confirmar" class="admin-btn primary">Confirmar e acionar</button></div>
 </form></section>`;
 document.body.appendChild(overlay);
 const form=overlay.querySelector('form'), error=overlay.querySelector('#cad-oc-error'), tipo=form.elements.tipo, bairro=form.elements.bairro;
 let map,marker,pos=null,files=[],matches=[],busy=false,duplicateAcknowledged=false,duplicateSignature="";
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
 function marcar(latlng){
  if(!api.isWithinMunicipality([latlng.lat,latlng.lng])){if(marker&&pos)marker.setLatLng(pos);error.textContent='Selecione um ponto dentro da área de navegação de Maringá.';return;}
  error.textContent='';pos=[latlng.lat,latlng.lng];
  if(marker) marker.setLatLng(latlng);else marker=L.marker(latlng,{draggable:true}).addTo(map).on('dragend',()=>marcar(marker.getLatLng()));
  overlay.querySelector('#cad-oc-pos').textContent=`Local selecionado: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`;
  const sugestao=api.neighborhood(pos);
  if(sugestao && [...bairro.options].some(o=>o.value===sugestao))bairro.value=sugestao;
  preencherOrganizacoes();verificar();
 }
 api.trigger.addEventListener('click',()=>{
  overlay.hidden=false;form.reset();files=[];pos=null;matches=[];busy=false;
  error.textContent='';overlay.querySelector('#cad-oc-previews').replaceChildren();overlay.querySelector('#cad-oc-duplicates').replaceChildren();
  overlay.querySelector('#cad-oc-pos').textContent='Nenhum ponto selecionado.';
  tipo.innerHTML=escOptions(api.types());form.elements.evento.innerHTML='<option value="">Nenhum evento relacionado</option>'+escOptions(api.events());bairro.innerHTML='<option value="">Selecione o bairro ou zona</option>'+escOptions(api.neighborhoods());
  const now=new Date();const offset=now.getTimezoneOffset()*60000;form.elements.quando.value=new Date(now-offset).toISOString().slice(0,16);
  if(!map){map=L.map('cad-oc-map').setView(api.center,13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);map.on('click',e=>marcar(e.latlng));}
  if(marker){map.removeLayer(marker);marker=null;} map.setView(api.center,13);setTimeout(()=>map.invalidateSize(),50);
  tipo.dispatchEvent(new Event('change'));tipo.focus();
 });
 overlay.querySelector('#cad-evento-criar').onclick=()=>{
  const nome=overlay.querySelector('#cad-evento-nome').value.trim(),tipoEvento=overlay.querySelector('#cad-evento-tipo').value.trim();
  const aviso=overlay.querySelector('#cad-evento-status');
  if(!nome||!tipoEvento){aviso.textContent='Informe o nome e o tipo do evento.';return;}
  try{
   const evento=api.createEvent(nome,tipoEvento);
   form.elements.evento.innerHTML='<option value="">Nenhum evento relacionado</option>'+escOptions(api.events());
   form.elements.evento.value=evento.id;
   aviso.textContent='Evento criado e selecionado.';
  }catch(e){aviso.textContent=e.message;}
 };
 overlay.querySelector('#cad-oc-search').onclick=async ()=>{
  const endereco=form.elements.endereco.value.trim();if(!endereco){error.textContent='Informe o endereço para buscar.';return;}
  error.textContent='Buscando endereço…';
  try{
   const url=new URL('https://nominatim.openstreetmap.org/search');
   url.search=new URLSearchParams({q:endereco+', Maringá, Paraná, Brasil',format:'jsonv2',limit:'5',viewbox:'-52.123,-23.235,-51.813,-23.578',bounded:'1'});
   const response=await fetch(url,{headers:{'Accept':'application/json'}});
   if(!response.ok)throw Error();
   const lista=await response.json();const item=lista.find(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon)));
   if(!item){error.textContent='Endereço não encontrado. Marque o ponto no mapa.';return;}
   map.setView([Number(item.lat),Number(item.lon)],17);
   error.textContent='Confira o resultado e clique no mapa para confirmar o ponto.';
  }catch(_){error.textContent='Busca indisponível. Marque o ponto no mapa.';}
 };
 overlay.querySelector('#cad-oc-close').onclick=fechar;overlay.querySelector('#cad-oc-cancel').onclick=fechar;
 overlay.addEventListener('click',e=>{if(e.target===overlay)fechar();});
 tipo.addEventListener('change',()=>{
  const escolhido=api.types().find(x=>x.value===tipo.value);
  if(escolhido?.gravidade)form.elements.gravidade.value=String(escolhido.gravidade);
  if(escolhido?.responsabilidade)form.elements.responsabilidade.value=escolhido.responsabilidade;
  preencherOrganizacoes();verificar();
 });
 bairro.addEventListener('change',()=>{preencherOrganizacoes();verificar();});
 for(const key of ['endereco','quando','raio','janela'])form.elements[key].addEventListener('change',verificar);
 overlay.querySelector('#cad-oc-duplicates').addEventListener('change',e=>{if(e.target.id==='cad-oc-separate'){duplicateAcknowledged=e.target.checked;duplicateSignature=matches.map(x=>x.id).sort().join('|');}});
 overlay.querySelector('#cad-oc-duplicates').addEventListener('click',async e=>{
  const id=e.target.dataset.link;if(!id||busy)return;
  if(!form.reportValidity()||!pos){error.textContent='Preencha o endereço, o bairro e selecione o ponto no mapa.';return;}
  busy=true;try{await api.link(id,dados());fechar();api.feedback('Relato vinculado ao registro existente.');}catch(err){error.textContent=err.message;}finally{busy=false;}
 });
 form.elements.fotos.addEventListener('change',async e=>{
  error.textContent='';files=[];
  const imagens=[...e.target.files];
  if(imagens.length>4||imagens.some(f=>!f.type.startsWith('image/')||f.size>750000)){error.textContent='Use até 4 imagens de até 750 KB cada.';e.target.value='';return;}
  try{
   files=await Promise.all(imagens.map(f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({nome:f.name,dados:r.result});r.onerror=reject;r.readAsDataURL(f);})));
   const preview=overlay.querySelector('#cad-oc-previews');preview.replaceChildren();
   files.forEach(f=>{const img=document.createElement('img');img.src=f.dados;img.alt=f.nome;preview.append(img);});
  }catch(_){error.textContent='Não foi possível ler as imagens.';}
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;error.textContent='';
  if(!pos){error.textContent='Selecione o ponto da ocorrência no mapa.';return;}
  const atuais=api.findDuplicates(dados());
  if(atuais.length&&(!duplicateAcknowledged||atuais.map(x=>x.id).sort().join('|')!==duplicateSignature)){verificar();error.textContent='Revise os registros semelhantes e confirme se é uma ocorrência separada.';return;}
  busy=true;
  try{await api.save(dados(),e.submitter?.value||'triagem');fechar();}
  catch(err){error.textContent=err.message||'Não foi possível salvar.';}
  finally{busy=false;}
 });
}
function encontrarBairro(areas,pos){
 function noAnel(p,anel){
  let dentro=false;
  for(let i=0,j=anel.length-1;i<anel.length;j=i++){
   const [x,y]=anel[i],[xj,yj]=anel[j];
   if((y>p[1])!==(yj>p[1])&&p[0]<(xj-x)*(p[1]-y)/(yj-y)+x) dentro=!dentro;
  }
  return dentro;
 }
 const encontrado=areas.filter(area=>{
  if(area.tipoArea!=='Bairro'||!area.geojson)return false;
  try{
   const valor=typeof area.geojson==='string'?JSON.parse(area.geojson):area.geojson;
   const geo=valor.type==='Feature'?valor.geometry:valor;
   const poligonos=geo.type==='Polygon'?[geo.coordinates]:geo.type==='MultiPolygon'?geo.coordinates:[];
   return poligonos.some(p=>p.length&&noAnel([pos[1],pos[0]],p[0])&&!p.slice(1).some(anel=>noAnel([pos[1],pos[0]],anel)));
  }catch(_){return false;}
 });
 return encontrado.length===1?encontrado[0].nome:null;
}
global.CadastroOcorrencia={iniciar,encontrarBairro};
})(window);
