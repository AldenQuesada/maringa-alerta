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
 $("brigada-form").onsubmit=async e=>{
  e.preventDefault();
  try{
   const result=await app.acionarBrigada($("brigada-zona").value,$("brigada-mensagem").value);
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
 $("inter-form").onsubmit=async e=>{
  e.preventDefault();
  try{
   const x=await app.solicitarOutraPrefeitura($("inter-destino").value,$("inter-recurso").value);
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
const cozinhasDemo=L.layerGroup().addTo(map);
let cozinhasPontos=[],caminhaoDemo=null,simulacaoRodando=false,simulacaoIniciada=false,cicloAtivo=true,frameCaminhao=null,reinicioCaminhao=null,contadorDemo=0;
const novosColaboradoresDemo=L.layerGroup().addTo(map);
function iniciarCozinhasDemo(){
 if(app.db.tipo==="supabase")return;
 if(TIPO!=="ajuda"||app.prefeitura()?.id!=="maringa")return;
 const candidatos=[...pontosBairrosOficiais.values()];
 cozinhasPontos=LogisticaDemo.selecionar(candidatos,20);
 cozinhasDemo.clearLayers();
 cozinhasPontos.forEach((p,i)=>{
  const nome="Cozinha "+String(i+1).padStart(2,"0")+" · simulação";
  const ic=L.divIcon({className:"cozinha-demo",html:'<span>🍲</span>',iconSize:[28,28],iconAnchor:[14,14]});
  L.marker([p.lat,p.lng],{icon:ic,title:nome,keyboard:true})
   .bindTooltip(esc(nome),{direction:"top"})
   .on("click",()=>abrirFichaCozinha(nome,p))
   .addTo(cozinhasDemo);
 });
 $("logistica-status").textContent=cozinhasPontos.length+" cozinhas demonstrativas";
 $("legenda-cozinhas").hidden=false;
 tentarIniciarCaminhao();
}
function abrirFichaCozinha(nome,ponto){
 const painel=$("painel-ajuda"),toggle=$("painel-ajuda-toggle"),ficha=$("ficha-cozinha");
 if(painel.hidden)toggle.click();
 $("ficha-cozinha-titulo").textContent=nome;
 const campos=[
  ["Responsável","Não informado"],
  ["Endereço","Não informado"],
  ["Região de referência",ponto.label+" · localização aproximada"],
  ["Telefone / WhatsApp","Não informado"],
  ["Capacidade","Quantidade de pessoas não informada"],
  ["Refeições por dia","Não informado"],
  ["Horário de funcionamento","Não informado"],
  ["Tipo de refeições","Não informado"],
  ["Itens necessários","Não informado"],
  ["Situação","A confirmar"]
 ];
 const lista=$("ficha-cozinha-dados");lista.replaceChildren();
 for(const [rotulo,valor] of campos){
  const linha=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");
  dt.textContent=rotulo;dd.textContent=valor;linha.append(dt,dd);lista.append(linha);
 }
 ficha.hidden=false;
 ficha.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function tentarIniciarCaminhao(){
 if(app.db.tipo==="supabase")return;
 if(cicloAtivo&&!simulacaoIniciada&&cozinhasPontos.length&&INVENTARIO.registros(app.db).some(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado))iniciarCaminhaoDemo();
}
async function avisarNoDispositivo(mensagem){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 try{
  const registro="serviceWorker" in navigator?await navigator.serviceWorker.getRegistration():null;
  if(registro?.showNotification)await registro.showNotification("Simulação Pra Somar",{body:mensagem,tag:"pra-somar-demonstracao"});
  else new Notification("Simulação Pra Somar",{body:mensagem,tag:"pra-somar-demonstracao"});
 }catch(_){console.warn("Não foi possível exibir o aviso do navegador.");}
}
function iniciarCaminhaoDemo(){
 if(app.db.tipo==="supabase")return;
 if(simulacaoRodando)return;
 const base=INVENTARIO.registros(app.db).find(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado);
 if(!base||!cozinhasPontos.length){$("logistica-status").textContent="Aguarde o carregamento dos pontos para iniciar.";return;}
 cicloAtivo=true;simulacaoIniciada=true;simulacaoRodando=true;$("iniciar-caminhao").disabled=false;$("iniciar-caminhao").textContent="Parar simulação";
 const origem=[cozinhasPontos[0].lat,cozinhasPontos[0].lng],destino=[base.lat,base.lng];
 if(caminhaoDemo)map.removeLayer(caminhaoDemo);
 const ic=L.divIcon({className:"caminhao-demo",html:'<span>🚚</span>',iconSize:[36,36],iconAnchor:[18,18]});
 caminhaoDemo=L.marker(origem,{icon:ic,title:"Caminhão · simulação"}).bindTooltip("Caminhão em deslocamento simulado",{direction:"top"}).addTo(map);
 $("logistica-status").textContent="Caminhão em deslocamento simulado · 30 s";
 const inicio=performance.now();
 function passo(agora){
  const progresso=Math.min(1,(agora-inicio)/30000);
  caminhaoDemo.setLatLng(LogisticaDemo.interpolar(origem,destino,progresso));
  if(!cicloAtivo)return;
  if(progresso<1){frameCaminhao=requestAnimationFrame(passo);return;}
  simulacaoRodando=false;
  contadorDemo++;
  const ponto=cozinhasPontos[(contadorDemo-1)%cozinhasPontos.length];
  const icone=L.divIcon({className:"novo-colaborador-demo",html:'<span>+</span>',iconSize:[30,30],iconAnchor:[15,15]});
  L.marker([ponto.lat,ponto.lng],{icon:icone,title:"Novo colaborador simulado"}).bindTooltip("Novo colaborador · simulação",{direction:"top"}).addTo(novosColaboradoresDemo);
  $("logistica-status").textContent="Novo ciclo de demonstração";
  $("notificacao-texto").textContent="Simulação: caminhão chegou a "+base.nome+" e um novo colaborador apareceu no mapa. WhatsApp não conectado; nenhuma mensagem foi enviada.";
  $("notificacao-chegada").hidden=false;
  void avisarNoDispositivo("Caminhão chegou e novo colaborador apareceu. Dados simulados.");
  reinicioCaminhao=setTimeout(()=>{if(cicloAtivo)iniciarCaminhaoDemo();},100);
 }
 frameCaminhao=requestAnimationFrame(passo);
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
 $("logistica-demo").hidden=app.db.tipo==="supabase";
 $("avisos-navegador").addEventListener("click",async()=>{
  if(!("Notification" in window)){alertar("Notificações do navegador indisponíveis neste dispositivo.");return;}
  try{
   const permissao=await Notification.requestPermission();
   if(permissao!=="granted"){alertar("Permissão para avisos não concedida.");return;}
   if("serviceWorker" in navigator)await navigator.serviceWorker.register("../sw.js");
   $("avisos-navegador").textContent="Avisos do navegador ativos";alertar("Avisos do navegador ativados para a simulação.");
  }catch(_){alertar("Não foi possível ativar avisos neste dispositivo.");}
 });
 $("iniciar-caminhao").addEventListener("click",()=>{
  if(cicloAtivo&&simulacaoIniciada){cicloAtivo=false;simulacaoRodando=false;cancelAnimationFrame(frameCaminhao);clearTimeout(reinicioCaminhao);$("iniciar-caminhao").textContent="Iniciar simulação";$("logistica-status").textContent="Simulação pausada";}
  else iniciarCaminhaoDemo();
 });
 $("notificacao-fechar").addEventListener("click",()=>{$("notificacao-chegada").hidden=true;});
 $("ficha-cozinha-fechar").addEventListener("click",()=>{$("ficha-cozinha").hidden=true;});
 const toggle=$("painel-ajuda-toggle"),painel=$("painel-ajuda"),recolher=$("painel-ajuda-recolher");
 recolher.hidden=false;
 recolher.addEventListener("click",()=>toggle.click());
 toggle.addEventListener("click",()=>{
  const fechado=!painel.hidden;
  painel.hidden=fechado;
  toggle.hidden=!fechado;
  document.querySelector(".workspace").classList.toggle("painel-recolhido",fechado);
  toggle.textContent=fechado?"+":"−";
  toggle.setAttribute("aria-expanded",String(!fechado));
  toggle.setAttribute("aria-label",fechado?"Abrir painel":"Recolher painel");
  toggle.title=fechado?"Abrir painel":"Recolher painel";
  requestAnimationFrame(()=>map.invalidateSize());
 });
 // Abre com os painéis recolhidos; o + mantém acesso aos filtros.
 toggle.click();
}
$("mostrar-unidades").onchange=e=>{mostrarUnidades=e.target.checked;render();};
$("camada").onchange=()=>{camadaAtual=$("camada").value;filtroClasse="";texto="";$("busca").value="";configurarCamadas();render();};
$("zona").onchange=()=>{filtroZona=$("zona").value;render();};
$("filtro").onchange=()=>{filtroClasse=$("filtro").value;render();};
$("busca").oninput=()=>{texto=$("busca").value;render();};
window.addEventListener("storage",event=>{if(event.key===AlertaGestaoDados.CHAVE)location.reload();});
PainelEventos.iniciar({painel:$("eventos-painel"),barra:$("eventos-painel-head"),abrir:$("eventos-open"),fechar:$("eventos-close"),area:document.querySelector(".map-area"),aoAbrir:()=>filtrosCadastros.abrir()});
if(!globalThis.AlertaNuvem?.ativo&&globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&app.prefeitura())AlertaSessaoUI.criar({target:$("session-anchor"),sessao:AlertaSessao.criar({municipioId:app.prefeitura().id}),municipio:app.prefeitura().nome,zonas:app.zonas(),aoMudar:()=>{}});
municipSelector();renderMunicipio();configurarCamadas();render();
// O mesmo controlador atende Pra Somar e Colaboradores, sem usar a posição
// acidentalmente persistida pelas versões anteriores.
window.AlertaMapaNavegacao.instalarVistaSalva({
 map,L,identificador:TIPO==="ajuda"?"pra-somar":"colaboradores",
 // Referência exata escolhida pelo usuário: Pra Somar, não Colaboradores.
 vistaInicial:TIPO==="ajuda"?{lat:-23.4398505,lng:-51.9680312,zoom:12.7027}:null
});
void carregarZonasOficiais();
const fontesPublicas=["../dados-territoriais/maringa-bases-riscos-publicos.json","../dados-territoriais/maringa-abrigos-publicos.json","../dados-territoriais/maringa-apoio-imagens-2026.json"];
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(app.db,{url}))).then(()=>{configurarCamadas();render();if(TIPO==="ajuda")tentarIniciarCaminhao();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
 territorio=MaringaBairros.iniciar({map,L,recolherInicial:TIPO==="ajuda"});
})();
