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
 const ocupacao=new Map();
 for(const pessoa of pessoas){
  const registro=registroPorId.get(String(pessoa.id));
  const temCheckin=pessoa.checkin_status==="presente"&&pessoa.checkin_lat!=null&&pessoa.checkin_lng!=null&&pessoa.checkin_lat!==""&&pessoa.checkin_lng!==""&&Number.isFinite(Number(pessoa.checkin_lat))&&Number.isFinite(Number(pessoa.checkin_lng));
  const area=pessoa.bairro||registro?.bairro||pessoa.zona||registro?.zona;
  const base=temCheckin?{lat:Number(pessoa.checkin_lat),lng:Number(pessoa.checkin_lng)}:pessoa.registroAnterior&&Array.isArray(pessoa.pos)&&pessoa.pos.length>=2&&pessoa.pos.every(Number.isFinite)?{lat:pessoa.pos[0],lng:pessoa.pos[1]}:pontosBairrosOficiais.get(INVENTARIO.normal(area))||pontoZona(pessoa.zona||registro?.zona||area);
  if(!base)continue;
  const chave=base.lat+":"+base.lng,indice=(ocupacao.get(chave)||0);ocupacao.set(chave,indice+1);
  const ic=L.divIcon({html:'<div class="pessoa-azul"></div>',className:"pin collab pessoa-individual",iconSize:[20,20],iconAnchor:[10-((indice%5)-2)*14,10-Math.floor(indice/5)*14]});
  const local=temCheckin?"Último check-in registrado":pessoa.registroAnterior?"Posição de demonstração anterior":"Localização aproximada da área";
  L.marker([base.lat,base.lng],{icon:ic,title:pessoa.nome}).bindTooltip('<strong>'+esc(pessoa.nome)+'</strong><br>'+esc(area||"Área não informada")+' · '+esc(local),{direction:"top"}).addTo(marcadores);
 }

}
const cozinhasDemo=L.layerGroup().addTo(map);
let cozinhasPontos=[],caminhaoDemo=null,simulacaoRodando=false,simulacaoIniciada=false;
function iniciarCozinhasDemo(){
 if(TIPO!=="ajuda"||app.prefeitura()?.id!=="maringa")return;
 const candidatos=[...pontosBairrosOficiais.values()];
 cozinhasPontos=LogisticaDemo.selecionar(candidatos,20);
 cozinhasDemo.clearLayers();
 cozinhasPontos.forEach((p,i)=>{
  const nome="Cozinha "+String(i+1).padStart(2,"0")+" · simulação";
  const ic=L.divIcon({className:"cozinha-demo",html:'<span>🍲</span>',iconSize:[28,28],iconAnchor:[14,14]});
  L.marker([p.lat,p.lng],{icon:ic,title:nome}).bindPopup('<strong>'+esc(nome)+'</strong><p>Referência ilustrativa em '+esc(p.label)+'. Não representa cozinha cadastrada ou confirmada.</p>').addTo(cozinhasDemo);
 });
 $("logistica-status").textContent=cozinhasPontos.length+" cozinhas demonstrativas";
 $("legenda-cozinhas").hidden=false;
 tentarIniciarCaminhao();
}
function tentarIniciarCaminhao(){
 if(!simulacaoIniciada&&cozinhasPontos.length&&INVENTARIO.registros(app.db).some(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado))iniciarCaminhaoDemo();
}
function iniciarCaminhaoDemo(){
 if(simulacaoRodando)return;
 const base=INVENTARIO.registros(app.db).find(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado);
 if(!base||!cozinhasPontos.length){$("logistica-status").textContent="Aguarde o carregamento dos pontos para iniciar.";return;}
 simulacaoIniciada=true;simulacaoRodando=true;$("iniciar-caminhao").disabled=true;
 const origem=[cozinhasPontos[0].lat,cozinhasPontos[0].lng],destino=[base.lat,base.lng];
 if(caminhaoDemo)map.removeLayer(caminhaoDemo);
 const ic=L.divIcon({className:"caminhao-demo",html:'<span>🚚</span>',iconSize:[36,36],iconAnchor:[18,18]});
 caminhaoDemo=L.marker(origem,{icon:ic,title:"Caminhão · simulação"}).bindTooltip("Caminhão em deslocamento simulado",{direction:"top"}).addTo(map);
 $("notificacao-chegada").hidden=true;$("logistica-status").textContent="Caminhão em deslocamento simulado · 30 s";
 const inicio=performance.now();
 function passo(agora){
  const progresso=Math.min(1,(agora-inicio)/30000);
  caminhaoDemo.setLatLng(LogisticaDemo.interpolar(origem,destino,progresso));
  if(progresso<1){requestAnimationFrame(passo);return;}
  simulacaoRodando=false;$("iniciar-caminhao").disabled=false;$("iniciar-caminhao").textContent="Repetir simulação";
  $("logistica-status").textContent="Chegada simulada concluída";
  $("notificacao-texto").textContent="Simulação: caminhão chegou a "+base.nome+". Aviso à primeira-dama preparado apenas como demonstração; nenhuma mensagem foi enviada.";
  $("notificacao-chegada").hidden=false;
 }
 requestAnimationFrame(passo);
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
 $("logistica-demo").hidden=false;
 $("iniciar-caminhao").addEventListener("click",iniciarCaminhaoDemo);
 $("notificacao-fechar").addEventListener("click",()=>{$("notificacao-chegada").hidden=true;});
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
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(app.db,{url}))).then(()=>{configurarCamadas();render();if(TIPO==="ajuda")tentarIniciarCaminhao();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
 territorio=MaringaBairros.iniciar({map,L});
})();
