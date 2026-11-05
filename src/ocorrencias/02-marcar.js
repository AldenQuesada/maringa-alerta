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
  overlay.querySelectorAll('.cad-add-panel').forEach(p=>p.hidden=true);overlay.querySelectorAll('[data-add],#cad-criterios-toggle').forEach(b=>b.setAttribute('aria-expanded','false'));overlay.querySelectorAll('.cad-add-panel [role=status]').forEach(p=>p.textContent='');duplicateAcknowledged=false;duplicateSignature='';overlay.querySelector('#cad-criterios').hidden=true;mostrarEtapa(0);
  error.textContent='';overlay.querySelector('#cad-oc-previews').replaceChildren();overlay.querySelector('#cad-oc-duplicates').replaceChildren();
  overlay.querySelector('#cad-oc-pos').textContent='Nenhum ponto selecionado.';
  tipo.innerHTML=escOptions(api.types());form.elements.evento.innerHTML='<option value="">Selecione o evento cadastrado no Dashboard</option>'+escOptions(api.events());form.elements.evento.value=api.selectedEvent?.()||'';bairro.innerHTML='<option value="">Selecione o bairro ou zona</option>'+escOptions(api.neighborhoods());
  const now=new Date();const offset=now.getTimezoneOffset()*60000;form.elements.quando.value=new Date(now-offset).toISOString().slice(0,16);
  if(!map){map=L.map('cad-oc-map').setView(api.center,13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);map.on('click',e=>marcar(e.latlng));}
  if(marker){map.removeLayer(marker);marker=null;} map.setView(api.center,13);setTimeout(()=>map.invalidateSize(),50);
  tipo.dispatchEvent(new Event('change'));tipo.focus();
 });
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
  form.elements.gravidade.value=escolhido?.gravidade?String(escolhido.gravidade):'';
  form.elements.responsabilidade.value=escolhido?.responsabilidade||'';
  preencherOrganizacoes();verificar();
 });
 bairro.addEventListener('change',()=>{preencherOrganizacoes();verificar();});
 for(const key of ['endereco','quando','raio','janela'])form.elements[key].addEventListener('change',verificar);
 overlay.querySelector('#cad-oc-duplicates').addEventListener('change',e=>{if(e.target.id==='cad-oc-separate'){duplicateAcknowledged=e.target.checked;duplicateSignature=matches.map(x=>x.id).sort().join('|');}});
 overlay.querySelector('#cad-oc-duplicates').addEventListener('click',async e=>{
  const id=e.target.dataset.link;if(!id||busy)return;
  if(!validarFormulario())return;
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
  if(!validarFormulario())return;
  const atuais=api.findDuplicates(dados());
  if(atuais.length&&(!duplicateAcknowledged||atuais.map(x=>x.id).sort().join('|')!==duplicateSignature)){verificar();error.textContent='Revise os registros semelhantes e confirme se é uma ocorrência separada.';return;}
  busy=true;
  try{await api.save(dados(),e.submitter?.value||'triagem');fechar();}
  catch(err){error.textContent=err.message||'Não foi possível salvar.';}
  finally{busy=false;}
 });
}
