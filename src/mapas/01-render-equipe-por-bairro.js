function renderEquipePorBairro(xs){
 return renderEquipeNoElemento(xs,$("results"));
}
function renderEquipeNoElemento(xs,el){
 const grupos=new Map();
 for(const pessoa of xs){const bairro=String(pessoa.bairro||pessoa.zona||"Bairro não informado").trim();if(!grupos.has(bairro))grupos.set(bairro,[]);grupos.get(bairro).push(pessoa);}
 if(!xs.length){el.innerHTML='<div class="empty">Não há colaboradores cadastrados neste filtro.</div>';return;}
 el.innerHTML=[...grupos.entries()].map(([bairro,pessoas])=>{
  const presentes=pessoas.filter(x=>x.checkin_status==="presente"&&String(x.checkin_bairro||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0).length;
  const perc=Math.round(presentes*100/pessoas.length);
  return '<section class="team-bairro"><header><strong>'+esc(bairro)+'</strong><small>Colab: '+pessoas.length+' · Ativ: '+presentes+' · '+perc+'%</small></header>'+
   '<div class="team-progress"><span style="width:'+perc+'%"></span></div>'+
   pessoas.map(x=>'<div class="team-member"><div><b>'+esc(x.nome||"Colaborador")+'</b><small>'+esc(x.status_simulacao==="simulado"?"DEMONSTRAÇÃO · Não é colaborador real":x.checkin_status==="presente"?"Presente · GPS autodeclarado":x.checkin_status==="finalizado"?"Saída registrada":"Aguardando chegada")+'</small>'+
    (caps(x).length?'<small>'+esc(caps(x).slice(0,3).join(" · ")+(caps(x).length>3?" +"+(caps(x).length-3)+" capacidades":""))+'</small>':'')+
    (x.forma_entrega_doacao?'<small>Doação: '+esc(x.forma_entrega_doacao)+'</small>':'')+'</div>'+
    (x.status_simulacao==="simulado"?'<small>Simulação · sem check-in</small>':x.registroAnterior?'<small>Registro anterior</small>':x.checkin_status==="presente"?'<button type="button" data-saida="'+esc(x.id)+'">Registrar saída</button>':
    '<button type="button" data-checkin="'+esc(x.id)+'"'+(bairro==="Bairro não informado"?' disabled title="Cadastre o bairro antes"':'')+'>Check-in GPS</button>')+
    '</div>').join("")+'</section>';
 }).join("")+'<p class="presence-note">Check-in local experimental: exige permissão GPS, precisão de até 100 m e polígono de bairro compatível. Não comprova identidade nem sincroniza entre dispositivos.</p>';
 el.querySelectorAll("[data-checkin]").forEach(b=>b.onclick=()=>void iniciarCheckin(b.dataset.checkin,b));
 el.querySelectorAll("[data-saida]").forEach(b=>b.onclick=async()=>{
  try{await app.registrarSaida(b.dataset.saida);render();alertar("Saída registrada.");}catch(err){alertar(err.message);}
 });
}
async function iniciarCheckin(id,button){
 const pessoa=app.oferentes().find(x=>x.id===id);
 const bairro=String(pessoa?.bairro||pessoa?.zona||"").trim();
 if(!bairro){alertar("Cadastre o bairro de origem do colaborador.");return;}
 if(!navigator.geolocation){alertar("Geolocalização indisponível neste dispositivo.");return;}
 button.disabled=true;button.textContent="Validando GPS...";
 try{
  const dados=await globalThis.MaringaBairros?.carregar();
  const f=dados?.bairros?.features?.find(x=>String(x.properties?.nome||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0);
  if(!f)throw Error("Bairro não encontrado na malha territorial. Confira o cadastro; não foi registrado check-in.");
  const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));
  await app.registrarCheckin({colaboradorId:id,bairro,lat:coords.latitude,lng:coords.longitude,precisao:coords.accuracy,geometry:f.geometry,origem:dados.bairros.source});
  render();alertar("Check-in registrado no bairro "+bairro+" neste navegador.");
 }catch(err){alertar("Check-in não confirmado: "+(err.message||"GPS indisponível"));button.disabled=false;button.textContent="Check-in GPS";}
}
function renderCards(xs) {
 const el=$("results");$("list-count").textContent=xs.length+" registro"+(xs.length===1?"":"s");
 if(camadaAtual!=="principal"){
  el.innerHTML=xs.map(x=>'<article class="result canonical-result"><div class="result-top"><strong>'+esc(x.nome)+'</strong><span class="result-tag">'+esc(x.classe)+'</span></div><small>'+esc(x.moduloNome)+' · '+esc(x.zona||x.bairro||"Sem zona vinculada")+'</small><small>'+esc(x.detalhes.slice(0,180))+'</small><div class="canonical-actions">'+(x.georreferenciado?'<button type="button" data-loc="'+esc(x.chave)+'">Localizar</button>':'<small>Sem coordenadas</small>')+'<a href="../gestao/#'+encodeURIComponent(x.modulo)+'" target="_blank" rel="noopener">Abrir cadastro</a></div></article>').join("")||'<p class="empty">Nenhum registro neste filtro.</p>';
  el.querySelectorAll("[data-loc]").forEach(b=>b.onclick=async()=>{const x=xs.find(y=>y.chave===b.dataset.loc);if(x?.georreferenciado)map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15));});
  return;
 }
 if(TIPO==="colaboradores"){renderEquipePorBairro(xs);return;}
 if(!xs.length){el.innerHTML='<div class="empty">Nenhum registro neste filtro.<p>Cadastre pelo WhatsApp simulado ou use a Gestão para adicionar dados.</p><a class="btn" href="../atendimento/" target="_blank" rel="noopener">Abrir atendimento</a></div>';return;}
 el.innerHTML=xs.map((x,i)=>{
  const tags=TIPO==="ajuda"?(x.status||"Aguardando"):(x.tipo_pessoa||"Colaborador");
  const subtitulo=TIPO==="ajuda"?
    '<strong>'+esc(x.necessidade==="Outro"?"Pedido de ajuda":x.necessidade||"Pedido")+'</strong><small>Zona: '+esc(x.zona||"Não indicada")+' · '+esc(x.urgencia||"Normal")+'</small>'+
    '<small>Detalhes e endereço reservados ao atendimento.</small><small>'+esc(x.atribuido_a?"Há colaborador compatível indicado (simulação)":"Sem colaborador encaminhado")+'</small>':
    '<strong>'+esc(x.tipo_pessoa==="JURÍDICA"?"Empresa / organização":"Pessoa física")+'</strong>'+
    '<small>Zona: '+esc(x.zona||"Não indicada")+'</small>'+
    '<small>'+esc(caps(x).slice(0,5).join(" · ")||x.contribuicao||"Contribuição a detalhar")+'</small>';
  return '<button type="button" class="result" data-result="'+esc(x.id)+'"><div class="result-top"><span>Registro '+(i+1).toString().padStart(2,"0")+'</span>'+
    '<span class="result-tag'+(TIPO==="ajuda"&&x.urgencia==="Crítica"?" urgente":x.tipo_pessoa==="JURÍDICA"?" pj":"")+'">'+esc(tags)+'</span></div>'+subtitulo+'</button>';
 }).join("");
 el.querySelectorAll("[data-result]").forEach(btn=>btn.onclick=()=>{
  const chosen=xs.find(x=>x.id===btn.dataset.result);
  const pt=pontoZona(chosen?.zona);
  if(pt){map.flyTo([pt.lat,pt.lng],Math.max(map.getZoom(),13));alertar("Localização aproximada da zona "+(chosen.zona||"indicada")+".");}
 });
}
function renderMarkers(xs){
 marcadores.clearLayers();
 if(camadaAtual!=="principal"){
  if(!mostrarUnidades)return;
  for(const x of xs.filter(x=>x.georreferenciado)){
   const icon=INVENTARIO.simbolo(x);
   const ic=L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+icon+'</span>',iconSize:[32,32],iconAnchor:[16,32]});
   L.marker([x.lat,x.lng],{icon:ic,title:x.nome}).bindTooltip('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.endereco||"Endereço não informado"),{direction:"top"}).on("click",()=>fichaPonto.abrir(x)).addTo(marcadores);
  }
  return;
 }
 const grupos=new Map();
 for(const x of xs){const zona=x.zona||"Não informada";grupos.set(zona,(grupos.get(zona)||0)+1);}
 for(const [zona,quantidade] of grupos.entries()){
  const pt=pontoZona(zona);if(!pt)continue;
  const tipoClass=TIPO==="ajuda"?"help":"collab";
  const ic=L.divIcon({html:'<div class="bubble">'+quantidade+'</div>',className:"pin "+tipoClass,iconSize:[44,44],iconAnchor:[22,22]});
  L.marker([pt.lat,pt.lng],{icon:ic,title:quantidade+" registros na zona "+zona})
   .bindPopup('<strong>'+esc(zona)+'</strong><p>'+quantidade+' '+(TIPO==="ajuda"?"pedidos de ajuda":"colaboradores")+'</p><small>Marcador por zona, não representa endereço residencial.</small>')
   .addTo(marcadores).on("click",()=>{if(zona!=="Não informada"){filtroZona=zona;$("zona").value=zona;render();}});
 }
}
