function responderEtapa(e){
 e.preventDefault();
 if(!current)return;
 const valor=input.value.trim();
 if(current.required&&!valor){input.focus();return;}
 if(current.key==="telefone"||current.key==="consulta_telefone"||current.key==="fase_telefone"){
  const n=MaringaCrise.telefone(valor);
  if(n.length<10||n.length>13){msg("Informe um telefone válido com DDD.",false,true);input.focus();return;}
 }
 if(current.key==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)){msg("Confira o endereço de e-mail e tente novamente.",false,true);input.focus();return;}
 gravarResposta(valor);
}
form.onsubmit=responderEtapa;
function protocolo(prefixo,id){return prefixo+"-SIM-"+String(id).replace(/[^a-z0-9]/gi,"").slice(-7).toUpperCase();}
function finalizarOpcoes(){
 optionsSimple([["Voltar ao início",()=>startMenu(),"submit"]]);
}
function concluir(){
 try{
  if(role==="colaborador"||role==="solicitacao")answers.zona=zonaPeloEndereco(answers.endereco);
  if(role==="colaborador"){
   const anterior=app.encontrarPessoa(answers.telefone);
   const outros=[["Ajuda a pessoas",answers.outros_ajudas],["Máquinas",answers.outros_maquinas],["Empreendedores",answers.outros_empreendedores]]
    .filter(x=>x[1]).map(x=>x[0]+": "+x[1]).join("; ");
   const resultado=app.registrarColaborador({...answers,outros,disponibilidade:"A combinar"});
   registrarMudanca("voluntarios",resultado,anterior);
   identity={nome:resultado.nome,tipo_pessoa:resultado.tipo_pessoa,telefone:resultado.telefone,endereco:resultado.endereco,email:resultado.email,zona:resultado.zona};
   bot("Cadastro de colaborador concluído! ✅\n\nProtocolo de demonstração: "+protocolo("COL",resultado.id)+
    "\nOfertas cadastradas: "+[resultado.ajudas,resultado.maquinas,resultado.empreendedores,resultado.materiais].flat().filter(Boolean).length+
    (resultado.forma_entrega_doacao?"\nDoação: "+resultado.forma_entrega_doacao:"")+
    "\n\nOs dados aparecem na Gestão e no Mapa de Colaboradores deste navegador. Nenhuma mensagem foi enviada a órgãos ou voluntários.");
  }else if(role==="solicitacao"){
   const pedido=app.registrarPedido(answers).pedido;
   registrarMudanca("solicitacoes",pedido);
   identity={...identity,nome:pedido.nome,telefone:pedido.telefone,endereco:pedido.endereco,tipo_pessoa:pedido.tipo_pessoa,zona:pedido.zona};
   bot("Pedido de ajuda registrado! ✅\n\nProtocolo de demonstração: "+protocolo("AJU",pedido.id)+
    "\nSituação: "+pedido.status+".\nNecessidade: "+pedido.necessidade+
    (pedido.modo_recebimento?"\nRecebimento: "+pedido.modo_recebimento:"")+
    "\n\nVocê pode consultar a situação neste simulador. Casos críticos exigem avaliação das equipes responsáveis. Nenhuma ajuda foi mobilizada de verdade.");
  }else if(role==="relato"){
   const registro=dados.gravar("relatos",{
    nome:String(answers.nome||"").trim(),
    telefone:String(answers.telefone||"").trim(),
    endereco:String(answers.endereco_ocorrencia||"").trim(),
    pessoas_no_local:Array.isArray(answers.pessoas_no_local)?answers.pessoas_no_local:[],
    descricao:String(answers.necessidade_relato||"").trim(),
    foto:arquivosFoto?.dados||"",
    foto_nome:arquivosFoto?.nome||"",
    status:"Em triagem",origem:"Cidadão · simulador",
    criado_em:new Date().toISOString()
   });
   registrarMudanca("relatos",registro);
   identity={...identity,nome:registro.nome,telefone:registro.telefone};
   bot("Relato recebido para triagem! ✅\n\nProtocolo de demonstração: "+protocolo("OCO",registro.id)+
    "\nEndereço: "+registro.endereco+
    "\nSituação: "+registro.status+
    (registro.foto?"\nFoto anexada com sucesso.":"\nSem foto anexada.")+
    "\n\nA equipe deverá verificar antes de confirmar uma ocorrência no Mapa de Evento. Nenhum acionamento real foi realizado.");
  }
 }catch(err){
  bot("Não foi possível salvar neste navegador: "+(err?.message||"erro desconhecido")+". Confira seus dados ou reduza a foto.",true);
  optionsSimple([["Revisar respostas",()=>mostrarRevisao(),"submit"],["Voltar ao início",()=>startMenu()]]);
  return;
 }
 finalizarOpcoes();
}
function abrir(url){
 window.open(url,"_blank","noopener,noreferrer");
 bot("A página solicitada foi aberta em outra aba. A demonstração permanece disponível aqui.");
 optionsSimple([["Voltar ao início",()=>startMenu(),"submit"]]);
}
function consultarCadastro(){
 bot("Informe o telefone com DDD usado no cadastro. A consulta funciona apenas para dados salvos neste navegador.");
 current={key:"consulta_telefone",kind:"tel",required:true};
 clear();form.hidden=false;$("compose-placeholder").hidden=true;input.type="tel";input.placeholder="(44) 99999-9999";input.required=true;
 form.onsubmit=e=>{
  e.preventDefault();const tel=input.value.trim();
  if(MaringaCrise.telefone(tel).length<10){msg("Informe o telefone com DDD.",false,true);return;}
  msg(tel,true);
  const igual=(x)=>MaringaCrise.mesmoTelefone(x.telefone,tel);
  const colaborador=app.oferentes().find(igual),pedidos=app.pedidos().filter(igual),relatos=dados.lista("relatos").filter(igual);
  if(!colaborador&&!pedidos.length&&!relatos.length)bot("Não encontrei registros com esse número nesta demonstração.");
  else bot("Resultados neste navegador:\n"+
    (colaborador?"• Colaborador: "+protocolo("COL",colaborador.id)+" · "+(colaborador.disponibilidade||"Cadastrado")+"\n":"")+
    pedidos.map(p=>"• Pedido: "+protocolo("AJU",p.id)+" · "+p.necessidade+" · "+p.status).join("\n")+
    (pedidos.length&&relatos.length?"\n":"")+
    relatos.map(r=>"• Ocorrência: "+protocolo("OCO",r.id)+" · "+r.status).join("\n"));
  optionsSimple([["Consultar outro telefone",()=>consultarCadastro(),"submit"],["Voltar ao início",()=>startMenu()]]);
 };
 input.focus();
}
function iniciarFase(){
 bot("Este é um teste de presença do colaborador. Informe seu telefone para consultar encaminhamentos e registrar CHEGUEI ou TERMINEI.");
 current={key:"fase_telefone",kind:"tel",required:true};clear();form.hidden=false;$("compose-placeholder").hidden=true;input.type="tel";input.required=true;input.placeholder="(44) 99999-9999";
 form.onsubmit=e=>{
  e.preventDefault();const tel=input.value.trim();msg(tel,true);
  const pessoa=app.encontrarPessoa(tel);
  if(!pessoa){bot("Não há cadastro de colaborador com esse telefone nesta demonstração.");optionsSimple([["Início",()=>startMenu()]]);return;}
  const pendentes=app.pedidos().filter(x=>x.atribuido_a===pessoa.id&&["Encaminhada","Cheguei"].includes(x.status));
  if(!pendentes.length){bot("Não há encaminhamentos ativos para este colaborador no cenário simulado.");optionsSimple([["Início",()=>startMenu()]]);return;}
  bot("Encontramos "+pendentes.length+" encaminhamento(s). Selecione um:");
  optionsSimple(pendentes.map(p=>[p.necessidade+" · "+(p.zona||"Sem zona"),()=>escolherFase(p.id)]));
 };
 input.focus();
}
function escolherFase(id){
 const p=app.pedidos().find(x=>x.id===id);
 if(!p){startMenu();return;}
 const fase=p.status==="Encaminhada"?"Cheguei":"Terminei";
 bot("Pedido de "+p.necessidade+".\nStatus: "+p.status+".\nDeseja confirmar "+fase.toUpperCase()+" neste teste?");
 optionsSimple([[fase.toUpperCase(),()=>{
  try{app.registrarFase(id,fase);bot(fase==="Cheguei"?"Chegada registrada nesta demonstração.":"Participação concluída nesta demonstração. Obrigado!");}
  catch(err){bot(err.message,true);}
  optionsSimple([["Voltar ao início",()=>startMenu(),"submit"]]);
 },"submit"],["Cancelar",()=>startMenu(),"secondary"]]);
}
async function prepararFoto(arquivo){
 if(!arquivo||!arquivo.type.startsWith("image/"))throw Error("Selecione uma imagem.");
 if(arquivo.size>8*1024*1024)throw Error("A imagem deve ter no máximo 8 MB.");
 const url=URL.createObjectURL(arquivo);
 try{
  const imagem=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Não foi possível abrir a foto."));i.src=url;});
  const escala=Math.min(1,920/Math.max(imagem.naturalWidth,imagem.naturalHeight));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(imagem.naturalWidth*escala));canvas.height=Math.max(1,Math.round(imagem.naturalHeight*escala));
  canvas.getContext("2d").drawImage(imagem,0,0,canvas.width,canvas.height);
  const dados=canvas.toDataURL("image/jpeg",.67);
  if(dados.length>900000)throw Error("A foto é grande demais para este simulador local.");
  return {nome:arquivo.name,dados};
 }finally{URL.revokeObjectURL(url);}
}
$("upload-photo").onclick=()=>photoInput.click();
photoInput.addEventListener("change",async()=>{
 const f=photoInput.files?.[0];if(!f||current?.kind!=="photo")return;
 $("upload-photo").disabled=true;
 try{
  arquivosFoto=await prepararFoto(f);
  photoPreview.replaceChildren();
  const img=document.createElement("img");img.src=arquivosFoto.dados;img.alt="Prévia da fotografia anexada";
  const label=document.createElement("span");label.textContent=arquivosFoto.nome+" · pronta para anexar";
  photoPreview.append(img,label);photoPreview.hidden=false;
  gravarResposta("Foto anexada","📷 "+arquivosFoto.nome);
 }catch(err){msg(err.message,false,true);}
 finally{$("upload-photo").disabled=false;photoInput.value="";}
});
function reiniciarDemonstracao(){
 if(!window.confirm("Reiniciar toda a demonstração? A conversa e os cadastros criados nesta sessão serão apagados deste navegador. Outros cadastros existentes serão preservados."))return;
 let problemas=0;
 for(const rec of rastreio().reverse()){
  try{if(rec.anterior)dados.gravar(rec.modulo,rec.anterior,rec.id);else dados.excluir(rec.modulo,rec.id);}
  catch(_){problemas++;}
 }
 guardarRastreio([]);
 identity=null;role=null;steps=[];answers={};current=null;index=0;arquivosFoto=null;photoInput.value="";
 history.replaceChildren();
 const divisor=document.createElement("div");divisor.className="day-divider";divisor.textContent="HOJE";history.appendChild(divisor);
 form.onsubmit=responderEtapa;
 bot(problemas?"A conversa foi reiniciada. Alguns registros locais não puderam ser restaurados.":"Demonstração reiniciada. Você pode percorrer todos os fluxos novamente.");
 startMenu();
}
$("go-home").onclick=()=>{form.onsubmit=responderEtapa;startMenu();};
$("restart-demo").onclick=reiniciarDemonstracao;
$("menu-toggle").onclick=()=>{
 const menu=$("chat-menu");menu.hidden=!menu.hidden;$("menu-toggle").setAttribute("aria-expanded",String(!menu.hidden));
};
$("chat-menu").addEventListener("click",e=>{
 const acao=e.target.closest("[data-action]")?.dataset.action;
 if(!acao)return;
 $("chat-menu").hidden=true;$("menu-toggle").setAttribute("aria-expanded","false");
 if(acao==="reset")reiniciarDemonstracao();else{form.onsubmit=responderEtapa;startMenu();}
});
$("phone-hour").textContent=hora();
startMenu();
})();
