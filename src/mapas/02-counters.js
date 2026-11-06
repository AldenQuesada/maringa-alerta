function counters(xs){
 if(camadaAtual!=="principal"){
  $("metric-one").textContent=xs.length;
  $("metric-two").textContent=new Set(xs.map(x=>x.zona).filter(Boolean)).size;
  $("metric-three").textContent=xs.filter(x=>x.georreferenciado).length;
  $("metric-one-label").textContent="Registros filtrados";
  $("metric-two-label").textContent="Zonas vinculadas";
  $("metric-three-label").textContent="No mapa";
  return;
 }
 const all=TIPO==="ajuda"?app.pedidos():colaboradoresDisponiveis();
 const zonas=new Set(all.map(x=>x.zona).filter(Boolean)).size;
 $("metric-one").textContent=all.length;
 $("metric-two").textContent=zonas;
 $("metric-three").textContent=TIPO==="ajuda"?
  all.filter(x=>x.status==="Aguardando").length:
  all.filter(x=>x.checkin_status==="presente"&&x.checkin_bairro&&String(x.checkin_bairro).localeCompare(String(x.bairro||x.zona||""),"pt-BR",{sensitivity:"base"})===0).length;
 $("metric-one-label").textContent=TIPO==="ajuda"?"Pedidos":"Colaboradores";
 $("metric-two-label").textContent="Zonas com registros";
 $("metric-three-label").textContent=TIPO==="ajuda"?"Aguardando":"Check-ins GPS";
}
function setOutput(html){const el=$("command-output");if(el)el.innerHTML=html;}
function comandoBrigadas(){
 $("command-title").textContent="Ativar brigada da zona";
 $("command-content").innerHTML='<form id="brigada-form" class="command-fields"><label for="brigada-zona">Zona da brigada</label>'+
 '<select id="brigada-zona" required></select><label for="brigada-mensagem">Instrução para os colaboradores</label>'+
 '<textarea id="brigada-mensagem" maxlength="1000" placeholder="Ex.: Apoio à retirada de resíduos após vendaval."></textarea>'+
 '<button type="submit" class="btn btn-main">Ativar brigada · simulação</button></form>'+
 '<div id="command-output" class="command-output" hidden></div><p class="notice">Um clique prepara a mobilização de todos os colaboradores e equipes disponíveis da zona. O envio individual pelo WhatsApp só ocorre após uma ação externa; a API de disparo ainda não está integrada.</p>';
 opts($("brigada-zona"),app.zonas(),filtroZona,'<option value="">Escolha a zona</option>');
 $("brigada-form").onsubmit=e=>{
  e.preventDefault();
  try{
   const result=app.acionarBrigada($("brigada-zona").value,$("brigada-mensagem").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Mobilização preparada</strong><p>'+result.destinatarios.length+' destinatários na zona '+esc($("brigada-zona").value)+'. Nenhuma mensagem foi enviada automaticamente.</p>'+
    (result.envios.map(x=>'<div class="output-item"><span>'+esc(x.nome)+' · '+esc(x.tipo)+'</span>'+(x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>':'<span>Sem telefone</span>')+'</div>').join("")||'<div>Cadastre colaboradores ou equipes para essa zona.</div>');
   alertar("Mobilização preparada na simulação.");
  }catch(err){alertar(err.message);}
 };
}
function comandoPrefeituras(){
 $("command-title").textContent="Solicitar ajuda a outra prefeitura";
 $("command-content").innerHTML='<form id="inter-form" class="command-fields"><label for="inter-destino">Prefeitura destinatária</label>'+
 '<select id="inter-destino" required></select><label for="inter-recurso">Qual apoio ou recurso precisa?</label>'+
 '<textarea id="inter-recurso" required maxlength="1600" placeholder="Ex.: 2 caminhões basculantes, 1 retroescavadeira e 1 gerador."></textarea>'+
 '<button type="submit" class="btn btn-main">Preparar solicitação</button></form>'+
 '<div id="command-output" class="command-output" hidden></div>'+
 '<p class="notice">A solicitação é registrada localmente. Se houver um telefone institucional cadastrado, abre-se um link de WhatsApp para revisão e envio manual. A troca entre prefeituras via API ainda não existe.</p>';
 const cidades=app.db.municipios().filter(x=>x.id!==app.prefeitura()?.id);
 opts($("inter-destino"),cidades,"",'<option value="">Selecione a prefeitura</option>');
 if(!cidades.length){
  $("inter-destino").disabled=true;
  $("inter-form").querySelector('button[type="submit"]').disabled=true;
  $("command-content").insertAdjacentHTML("beforeend",'<p class="notice">Cadastre outra prefeitura na <a href="../gestao/#prefeituras">Gestão</a> para simular o pedido.</p>');
 }
 $("inter-form").onsubmit=e=>{
  e.preventDefault();
  try{
   const x=app.solicitarOutraPrefeitura($("inter-destino").value,$("inter-recurso").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Pedido preparado para '+esc(x.destino.nome)+'</strong>'+
    '<p>Registrado na prefeitura de origem; não transmitido ao destinatário.</p>'+
    (x.link?'<a class="btn" href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Revisar mensagem no WhatsApp ↗</a>':
    '<p>Esta prefeitura não tem número institucional configurado. Cadastre-o antes de qualquer envio.</p>');
   alertar("Solicitação intermunicipal registrada localmente.");
  }catch(err){alertar(err.message);}
 };
}
function colaboradoresAjudaFiltrados(){
 const inventario=INVENTARIO.registros(app.db);
 const permitidos=filtroZona?new Set(INVENTARIO.filtrar(inventario,{modulo:"voluntarios",zona:filtroZona}).map(x=>x.id)):null;
 const busca=INVENTARIO.normal(texto);
 return colaboradoresDisponiveis().filter(p=>{
  if(permitidos&&!(p.registroAnterior?INVENTARIO.normal(p.zona||p.bairro)===INVENTARIO.normal(filtroZona):permitidos.has(String(p.id))))return false;
  return !busca||INVENTARIO.normal([p.nome,p.zona,p.bairro,p.contribuicao,p.ajudas,p.maquinas,p.empreendedores,p.materiais,p.outros].flat().filter(Boolean).join(" ")).includes(busca);
 });
}
function renderColaboradoresAjuda(){
 if(TIPO!=="ajuda"||camadaAtual!=="principal")return;
 const pessoas=colaboradoresAjudaFiltrados();
 $("list-title").textContent="Colaboradores e pedidos";
 $("list-count").textContent=pessoas.length+" colaboradores · "+dadosFiltrados().length+" pedidos";
 const secao=document.createElement("section");secao.className="ajuda-colaboradores";
 const titulo=document.createElement("h2");titulo.textContent="Colaboradores ("+pessoas.length+")";
 const nota=document.createElement("p");nota.className="presence-note";
 nota.textContent="Mesmos cadastros do Mapa de Colaboradores. A situação selecionada acima filtra os pedidos.";
 const lista=document.createElement("div");secao.append(titulo,nota,lista);$("results").prepend(secao);
 renderEquipeNoElemento(pessoas,lista);
 const registroPorId=new Map(INVENTARIO.registros(app.db).filter(x=>x.modulo==="voluntarios").map(x=>[x.id,x]));
 const grupos=new Map();
 for(const pessoa of pessoas){
  if(pessoa.registroAnterior&&Array.isArray(pessoa.pos)&&pessoa.pos.length>=2&&pessoa.pos.every(Number.isFinite)){
   const ic=L.divIcon({html:'<div class="bubble">1</div>',className:"pin collab",iconSize:[44,44],iconAnchor:[22,22]});
   L.marker(pessoa.pos,{icon:ic,title:pessoa.nome}).bindPopup('<strong>'+esc(pessoa.nome)+'</strong><p>Posição registrada no estado anterior de demonstração.</p>').addTo(marcadores);
   continue;
  }
  const zona=registroPorId.get(String(pessoa.id))?.zona||pessoa.zona;if(zona)grupos.set(zona,(grupos.get(zona)||0)+1);
 }
 for(const [zona,total] of grupos){
  const pt=pontoZona(zona);if(!pt)continue;
  const icon=L.divIcon({html:'<div class="bubble">'+total+'</div>',className:"pin collab",iconSize:[44,44],iconAnchor:[54,22]});
  L.marker([pt.lat,pt.lng],{icon,title:total+" colaboradores na zona "+zona})
   .bindPopup('<strong>'+esc(zona)+'</strong><p>'+total+' colaboradores</p><small>Marcador por zona, não representa endereço residencial.</small>')
   .addTo(marcadores).on("click",()=>{filtroZona=zona;$("zona").value=zona;render();});
 }
}
function render(){
 const xs=dadosFiltrados();
 renderCards(xs);renderMarkers(xs);renderColaboradoresAjuda();counters(xs);renderUnidadesMunicipais();
 if(camadaAtual==="principal"){
  $("command").hidden=false;
  if(TIPO==="ajuda")comandoPrefeituras();else comandoBrigadas();
 }else $("command").hidden=true;
}
if(TIPO==="ajuda"){
 const toggle=$("painel-ajuda-toggle"),painel=$("painel-ajuda");
 toggle.hidden=false;
 toggle.addEventListener("click",()=>{
  const fechado=!painel.hidden;
  painel.hidden=fechado;
  document.querySelector(".workspace").classList.toggle("painel-recolhido",fechado);
  toggle.textContent=fechado?"+":"−";
  toggle.setAttribute("aria-expanded",String(!fechado));
  toggle.setAttribute("aria-label",fechado?"Abrir painel":"Recolher painel");
  toggle.title=fechado?"Abrir painel":"Recolher painel";
  requestAnimationFrame(()=>map.invalidateSize());
 });
}
$("mostrar-unidades").onchange=e=>{mostrarUnidades=e.target.checked;render();};
$("camada").onchange=()=>{camadaAtual=$("camada").value;filtroClasse="";texto="";$("busca").value="";configurarCamadas();render();};
$("zona").onchange=()=>{filtroZona=$("zona").value;render();};
$("filtro").onchange=()=>{filtroClasse=$("filtro").value;render();};
$("busca").oninput=()=>{texto=$("busca").value;render();};
window.addEventListener("storage",event=>{if(event.key===AlertaGestaoDados.CHAVE)location.reload();});
municipSelector();renderMunicipio();configurarCamadas();render();
if(TIPO==="ajuda"){
 // Cada mapa tem posição original independente. Não grava dados de pessoas.
 window.AlertaMapaNavegacao.instalarVistaSalva({
  map,L,armazenamento:localStorage,chaveVista:"maringa_pra_somar_vista_original_v1"
 });
}
void carregarZonasOficiais();
const fontesPublicas=["../dados-territoriais/maringa-bases-riscos-publicos.json","../dados-territoriais/maringa-abrigos-publicos.json"];
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(app.db,{url}))).then(()=>{configurarCamadas();render();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
 territorio=MaringaBairros.iniciar({map,L});
})();
