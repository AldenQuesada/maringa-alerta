/* colaboradores: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,alertar,caps,colaboradoresAjudaFiltrados,dadosFiltrados,esc,marcadores,pontoZona,pontosBairrosOficiais,render,state}){
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
 }).join("")+'<p class="presence-note">'+(root.AlertaNuvem?.ativo?'Check-in registrado no cadastro municipal: exige permissão GPS, precisão de até '+esc(root.AlertaRegrasOperacionais?.gpsPrecisaoMaxima??100)+' m e polígono de bairro compatível. A localização é autodeclarada.':'Check-in local experimental: exige permissão GPS, precisão de até '+esc(root.AlertaGestaoDados.parametros.gps.precisaoMaximaMetros)+' m e polígono de bairro compatível. Não comprova identidade nem sincroniza entre dispositivos.')+'</p>';
 el.querySelectorAll("[data-checkin]").forEach(b=>b.onclick=()=>void iniciarCheckin(b.dataset.checkin,b));
 el.querySelectorAll("[data-saida]").forEach(b=>b.onclick=async()=>{
  try{await state.app.registrarSaida(b.dataset.saida);render();alertar("Saída registrada.");}catch(err){alertar(err.message);}
 });
}
async function iniciarCheckin(id,button){
 const pessoa=state.app.oferentes().find(x=>x.id===id);
 const bairro=String(pessoa?.bairro||pessoa?.zona||"").trim();
 if(!bairro){alertar("Cadastre o bairro de origem do colaborador.");return;}
 if(!navigator.geolocation){alertar("Geolocalização indisponível neste dispositivo.");return;}
 button.disabled=true;button.textContent="Validando GPS...";
 try{
  const dados=await globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros]?.carregar();
  const f=dados?.bairros?.features?.find(x=>String(x.properties?.nome||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0);
  if(!f)throw Error("Bairro não encontrado na malha territorial. Confira o cadastro; não foi registrado check-in.");
  const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));
  await state.app.registrarCheckin({colaboradorId:id,bairro,lat:coords.latitude,lng:coords.longitude,precisao:coords.accuracy,geometry:f.geometry,origem:dados.bairros.source});
  render();alertar("Check-in registrado no bairro "+bairro+" neste navegador.");
 }catch(err){alertar("Check-in não confirmado: "+(err.message||"GPS indisponível"));button.disabled=false;button.textContent="Check-in GPS";}
}
function renderColaboradoresAjuda(){
 if(TIPO!=="ajuda"||state.camadaAtual!=="principal")return;
 const pessoas=colaboradoresAjudaFiltrados();
 $("list-title").textContent="Colaboradores e pedidos";
 $("list-count").textContent=pessoas.length+" colaboradores · "+dadosFiltrados().length+" pedidos";
 const secao=document.createElement("section");secao.className="ajuda-colaboradores";
 const titulo=document.createElement("h2");titulo.textContent="Colaboradores ("+pessoas.length+")";
 const nota=document.createElement("p");nota.className="presence-note";
 nota.textContent="Mesmos cadastros do Mapa de Colaboradores. A situação selecionada acima filtra os pedidos.";
 const lista=document.createElement("div");secao.append(titulo,nota,lista);$("results").prepend(secao);
 renderEquipeNoElemento(pessoas,lista);
 const registroPorId=new Map(INVENTARIO.registros(state.app.db).filter(x=>x.modulo==="voluntarios").map(x=>[x.id,x]));
 const ocupacao=new Map();
 for(const pessoa of pessoas){
  const registro=registroPorId.get(String(pessoa.id));
  const temCheckin=pessoa.checkin_status==="presente"&&pessoa.checkin_lat!=null&&pessoa.checkin_lng!=null&&pessoa.checkin_lat!==""&&pessoa.checkin_lng!==""&&Number.isFinite(Number(pessoa.checkin_lat))&&Number.isFinite(Number(pessoa.checkin_lng));
  const area=pessoa.bairro||registro?.bairro||pessoa.zona||registro?.zona;
  let base=temCheckin?{lat:Number(pessoa.checkin_lat),lng:Number(pessoa.checkin_lng)}:(pessoa.registroAnterior||pessoa.posicaoAnterior)&&Array.isArray(pessoa.posicaoAnterior||pessoa.pos)&&(pessoa.posicaoAnterior||pessoa.pos).length>=2&&(pessoa.posicaoAnterior||pessoa.pos).every(Number.isFinite)?{lat:(pessoa.posicaoAnterior||pessoa.pos)[0],lng:(pessoa.posicaoAnterior||pessoa.pos)[1]}:pontosBairrosOficiais.get(INVENTARIO.normal(area))||pontoZona(pessoa.zona||registro?.zona||area);
  let ilustrativo=false;
  if(!base&&pessoa.status_simulacao==="simulado"&&pontosBairrosOficiais.size){
   const opcoes=[...pontosBairrosOficiais.values()];let hash=0;for(const c of String(area||pessoa.id))hash=(hash*31+c.charCodeAt(0))>>>0;
   base=opcoes[hash%opcoes.length];ilustrativo=true;
  }
  if(!base)continue;
  const chave=base.lat+":"+base.lng,indice=(ocupacao.get(chave)||0);ocupacao.set(chave,indice+1);
  const ic=L.divIcon({html:'<div class="pessoa-azul"></div>',className:"pin collab pessoa-individual",iconSize:[20,20],iconAnchor:[10-((indice%5)-2)*14,10-Math.floor(indice/5)*14]});
  const local=temCheckin?"Último check-in registrado":ilustrativo?"Posição ilustrativa, região não confirmada":pessoa.registroAnterior||pessoa.posicaoAnterior?"Posição de demonstração anterior":"Localização aproximada da área";
  L.marker([base.lat,base.lng],{icon:ic,title:pessoa.nome}).bindTooltip('<strong>'+esc(pessoa.nome)+'</strong><br>'+esc(area||"Área não informada")+' · '+esc(local),{direction:"top"}).addTo(marcadores);
 }

}
return {renderEquipePorBairro,renderEquipeNoElemento,iniciarCheckin,renderColaboradoresAjuda};
}
root.AlertaMapasColaboradores={criar};
})(globalThis);
