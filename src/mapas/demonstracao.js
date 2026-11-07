/* demonstracao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,cozinhasDemo,esc,map,novosColaboradoresDemo,pontosBairrosOficiais,state}){
function iniciarCozinhasDemo(){
 if(state.app.db.tipo==="supabase")return;
 if(TIPO!=="ajuda"||!AlertaGestaoDados.config.referencias(state.app.prefeitura()).mapaDemonstrativo)return;
 const candidatos=[...pontosBairrosOficiais.values()];
 state.cozinhasPontos=LogisticaDemo.selecionar(candidatos,20);
 cozinhasDemo.clearLayers();
 state.cozinhasPontos.forEach((p,i)=>{
  const nome="Cozinha "+String(i+1).padStart(2,"0")+" · simulação";
  const ic=L.divIcon({className:"cozinha-demo",html:'<span>🍲</span>',iconSize:[28,28],iconAnchor:[14,14]});
  L.marker([p.lat,p.lng],{icon:ic,title:nome,keyboard:true})
   .bindTooltip(esc(nome),{direction:"top"})
   .on("click",()=>abrirFichaCozinha(nome,p))
   .addTo(cozinhasDemo);
 });
 $("logistica-status").textContent=state.cozinhasPontos.length+" cozinhas demonstrativas";
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
 if(state.app.db.tipo==="supabase")return;
 if(state.cicloAtivo&&!state.simulacaoIniciada&&state.cozinhasPontos.length&&INVENTARIO.registros(state.app.db).some(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado))iniciarCaminhaoDemo();
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
 if(state.app.db.tipo==="supabase")return;
 if(state.simulacaoRodando)return;
 const base=INVENTARIO.registros(state.app.db).find(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado);
 if(!base||!state.cozinhasPontos.length){$("logistica-status").textContent="Aguarde o carregamento dos pontos para iniciar.";return;}
 state.cicloAtivo=true;state.simulacaoIniciada=true;state.simulacaoRodando=true;$("iniciar-caminhao").disabled=false;$("iniciar-caminhao").textContent="Parar simulação";
 const origem=[state.cozinhasPontos[0].lat,state.cozinhasPontos[0].lng],destino=[base.lat,base.lng];
 if(state.caminhaoDemo)map.removeLayer(state.caminhaoDemo);
 const ic=L.divIcon({className:"caminhao-demo",html:'<span>🚚</span>',iconSize:[36,36],iconAnchor:[18,18]});
 state.caminhaoDemo=L.marker(origem,{icon:ic,title:"Caminhão · simulação"}).bindTooltip("Caminhão em deslocamento simulado",{direction:"top"}).addTo(map);
 $("logistica-status").textContent="Caminhão em deslocamento simulado · 30 s";
 const inicio=performance.now();
 function passo(agora){
  const progresso=Math.min(1,(agora-inicio)/30000);
  state.caminhaoDemo.setLatLng(LogisticaDemo.interpolar(origem,destino,progresso));
  if(!state.cicloAtivo)return;
  if(progresso<1){state.frameCaminhao=requestAnimationFrame(passo);return;}
  state.simulacaoRodando=false;
  state.contadorDemo++;
  const ponto=state.cozinhasPontos[(state.contadorDemo-1)%state.cozinhasPontos.length];
  const icone=L.divIcon({className:"novo-colaborador-demo",html:'<span>+</span>',iconSize:[30,30],iconAnchor:[15,15]});
  L.marker([ponto.lat,ponto.lng],{icon:icone,title:"Novo colaborador simulado"}).bindTooltip("Novo colaborador · simulação",{direction:"top"}).addTo(novosColaboradoresDemo);
  $("logistica-status").textContent="Novo ciclo de demonstração";
  $("notificacao-texto").textContent="Simulação: caminhão chegou a "+base.nome+" e um novo colaborador apareceu no mapa. WhatsApp não conectado; nenhuma mensagem foi enviada.";
  $("notificacao-chegada").hidden=false;
  void avisarNoDispositivo("Caminhão chegou e novo colaborador apareceu. Dados simulados.");
  state.reinicioCaminhao=setTimeout(()=>{if(state.cicloAtivo)iniciarCaminhaoDemo();},100);
 }
 state.frameCaminhao=requestAnimationFrame(passo);
}
return {iniciarCozinhasDemo,abrirFichaCozinha,tentarIniciarCaminhao,avisarNoDispositivo,iniciarCaminhaoDemo};
}
root.AlertaMapasDemonstracao={criar};
})(globalThis);
