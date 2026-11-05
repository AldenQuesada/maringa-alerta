/* Simulador demonstrativo de conversas WhatsApp. Nunca envia mensagens reais. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const app=MaringaCrise.criar({municipioId:sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa",escopoMunicipal:true});
const dados=app.db, catalogos=AlertaGestaoDados.CATALOGOS;
const municipio=app.prefeitura()?.nome||"Município";
const history=$("history"),options=$("options"),form=$("reply-form"),input=$("reply");
const uploadArea=$("upload-area"),photoInput=$("photo-input"),photoPreview=$("photo-preview");
let identity=null,role=null,answers={},steps=[],index=0,current=null,arquivosFoto=null;
const registroKey="maringa_simulador_registros_v2";
const hora=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const rastreio=()=>{try{return JSON.parse(sessionStorage.getItem(registroKey)||"[]")}catch(_){return []}};
const guardarRastreio=itens=>sessionStorage.setItem(registroKey,JSON.stringify(itens));
function registrarMudanca(modulo,item,anterior=null){
 const itens=rastreio();
 if(!itens.some(x=>x.modulo===modulo&&x.id===item.id)){
  itens.push({modulo,id:item.id,anterior:anterior?JSON.parse(JSON.stringify(anterior)):null});
  guardarRastreio(itens);
 }
}
function msg(texto,person=false,notice=false,imagem=null){
 const el=document.createElement("div");el.className="message"+(person?" person":"")+(notice?" notice":"");
 if(imagem){
  const img=document.createElement("img");img.className="message-media";img.alt=imagem.alt||"Imagem";img.src=imagem.src;el.appendChild(img);
 }
 if(texto){
  const s=document.createElement("span");
  if(imagem){s.className="media-copy";const h=document.createElement("div");h.className="media-caption";h.textContent=imagem.titulo||"Pra Somar";el.appendChild(h);}
  s.textContent=texto;el.appendChild(s);
 }
 const small=document.createElement("small");small.textContent=hora();el.appendChild(small);
 history.appendChild(el);history.scrollTop=history.scrollHeight;return el;
}
function clear(){
 options.replaceChildren();form.hidden=true;input.value="";input.required=false;
 uploadArea.hidden=true;photoPreview.hidden=true;
 $("compose-placeholder").hidden=false;
}
function bot(texto,notice=false,imagem=null){clear();return msg(texto,false,notice,imagem);}
function button(label,fn,classe=""){
 const b=document.createElement("button");b.type="button";b.className="choice "+classe;b.textContent=label;
 b.onclick=fn;options.appendChild(b);return b;
}
function optionsSimple(itens){
 clear();for(const [label,fn,classe] of itens){
  button(label,()=>{msg(label,true);clear();fn();},classe||"");
 }
}
function startMenu(){
 role=null;answers={};steps=[];index=0;current=null;arquivosFoto=null;
 bot("Olá! 👋 Bem-vindo ao Maringá Alerta.\n\nComo podemos ajudar você hoje?");
 optionsSimple([
  ["🤝 Quero ajudar",()=>abrirPraSomar(),"submit"],
  ["🫶 Preciso de ajuda",()=>start("solicitacao")],
  ["📍 Relatar ocorrência",()=>start("relato")],
  ["🔎 Consultar cadastro ou protocolo",()=>consultarCadastro()],
  ["✅ Cheguei / Terminei",()=>iniciarFase()]
 ]);
}
function abrirPraSomar(){
 bot("O Pra Somar é o Programa de Apoio Social e Mobilização Voluntária de Maringá. Ele conecta pessoas, empresas e entidades dispostas a ajudar quem precisa.\n\nVamos registrar como você pode contribuir?",false,{
  src:"../assets/pra-somar.svg",alt:"Identidade visual do Pra Somar enviada para a demonstração",titulo:"Pra Somar · Mobilização voluntária"
 });
 optionsSimple([["Continuar cadastro",()=>start("colaborador"),"submit"],["Voltar ao início",()=>startMenu(),"secondary"]]);
}
const BENS=new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);
const BENS_DEMANDA=new Set(["Alimentação","Telhas e cobertura","Roupas e cobertores","Medicamentos e saúde","Material de construção","Água potável"]);
const ofereceBens=a=>["ajudas","maquinas","materiais"].some(k=>(a[k]||[]).some(x=>BENS.has(x)));
function identificarCampos(papel){
 const b=[];
 if(papel!=="relato"&&!identity?.tipo_pessoa)b.push({key:"tipo_pessoa",q:"Você é pessoa física ou jurídica?",kind:"single",opts:["FÍSICA","JURÍDICA"],required:true});
 if(!identity?.nome)b.push({key:"nome",q:papel==="relato"?"Qual é seu nome?":"Qual é seu nome completo ou razão social?",kind:"text",required:true});
 if(!identity?.telefone)b.push({key:"telefone",q:"Qual é seu telefone com DDD?",kind:"tel",required:true});
 if(papel==="colaborador"&&!identity?.email)b.push({key:"email",q:"Qual é seu e-mail?",kind:"email",required:true});
 if(papel!=="relato"&&!identity?.endereco)b.push({key:"endereco",q:"Informe seu endereço. Ele ficará reservado à equipe de atendimento.",kind:"text",required:true});
 return b;
}
function definirSteps(papel){
 const base=identificarCampos(papel);
 if(papel==="colaborador")return [...base,
  {key:"zona",q:"Qual é sua zona ou região de referência? Se não souber, escolha a última opção.",kind:"single",opts:[...app.zonas(),"Não sei informar"],required:true},
  {key:"ajudas",q:"Que tipos de ajuda você pode oferecer às pessoas atingidas? Pode marcar várias.",kind:"multi",opts:catalogos.ajudas},
  {key:"outros_ajudas",q:"Você marcou OUTRO em ajuda a pessoas. O que pode oferecer?",kind:"text",required:true,quando:a=>(a.ajudas||[]).includes("OUTRO")},
  {key:"maquinas",q:"Você pode oferecer maquinário, veículos, equipamentos ou materiais? Marque quantos quiser.",kind:"multi",opts:catalogos.maquinas},
  {key:"outros_maquinas",q:"Qual outro equipamento ou máquina você pode disponibilizar?",kind:"text",required:true,quando:a=>(a.maquinas||[]).includes("OUTRO")},
  {key:"empreendedores",q:"Pode ajudar empreendedores atingidos? Escolha as opções que se aplicam.",kind:"multi",opts:catalogos.empreendedores},
  {key:"outros_empreendedores",q:"Que outro apoio pode oferecer aos empreendedores?",kind:"text",required:true,quando:a=>(a.empreendedores||[]).includes("OUTRO")},
  {key:"materiais",q:"Pode fornecer material de construção ou combustível?",kind:"multi",opts:catalogos.materiais},
  {key:"forma_entrega_doacao",q:"Como prefere disponibilizar alimentos ou materiais? A prefeitura deve confirmar o ponto de recebimento antes de qualquer entrega.",kind:"single",opts:catalogos.formas_entrega_doacao,quando:ofereceBens},
  {key:"disponibilidade",q:"Você está disponível para receber solicitações de ajuda?",kind:"single",opts:["Disponível","A combinar","Indisponível"],required:true}
 ];
 if(papel==="solicitacao")return [...base,
  {key:"zona",q:"Em qual zona ou região você precisa de ajuda?",kind:"single",opts:[...app.zonas(),"Não sei informar"],required:true},
  {key:"necessidade",q:"Do que você precisa neste momento?",kind:"single",opts:catalogos.necessidades,required:true},
  {key:"descricao",q:"Quer contar mais detalhes da sua necessidade?",kind:"text",optional:true},
  {key:"modo_recebimento",q:"Como você consegue receber a ajuda?",kind:"single",opts:["Posso retirar em um ponto de apoio","Preciso receber no endereço informado","A combinar"],quando:a=>BENS_DEMANDA.has(a.necessidade)},
  {key:"urgencia",q:"Qual é a urgência da situação?",kind:"single",opts:["Normal","Alta","Crítica"],required:true}
 ];
 return [...base,
  {key:"endereco_ocorrencia",q:"Qual é o endereço exato da ocorrência? Informe rua, número e referência.",kind:"text",required:true},
  {key:"pessoas_no_local",q:"Há alguma destas pessoas no local? Selecione todas as opções aplicáveis.",kind:"multi",opts:["CRIANÇA / ADOLESCENTE","PESSOA IDOSA","PCD","NÃO HÁ"],exclusive:"NÃO HÁ",required:true},
  {key:"necessidade_relato",q:"Descreva o que aconteceu e a ajuda necessária.",kind:"text",optional:true},
  {key:"foto",q:"Envie uma foto da ocorrência, se for seguro fotografar. Você também pode concluir sem foto.",kind:"photo"}
 ];
}
function start(papel){
 form.onsubmit=responderEtapa;role=papel;answers=identity?{...identity}:{};steps=definirSteps(papel);index=0;current=null;arquivosFoto=null;
 const texto=papel==="colaborador"?"Obrigado por se disponibilizar! Uma pessoa ou empresa pode oferecer vários tipos de apoio.":papel==="solicitacao"?"Vamos registrar o que você precisa. Seus dados de contato e endereço não serão publicados.":"Vamos registrar a ocorrência em poucos passos. Em risco imediato, ligue 190, 192 ou 193. Não se aproxime de fios, árvores instáveis ou estruturas danificadas.";
 bot(texto);proxima();
}
function gravarResposta(valor,exibicao=null){
 if(!current)return;
 answers[current.key]=valor;
 const exib=exibicao??(Array.isArray(valor)?(valor.join(" · ")||"Nenhuma opção selecionada"):String(valor||"Prefiro não informar"));
 msg(exib,true);index++;proxima();
}
function proxima(){
 clear();while(index<steps.length&&steps[index].quando&&!steps[index].quando(answers))index++;
 if(index>=steps.length){mostrarRevisao();return;}
 current=steps[index];msg(current.q);
 if(current.kind==="single"){
  current.opts.forEach(opt=>button(opt,()=>{clear();gravarResposta(opt);}));
 }else if(current.kind==="multi"){
  const selected=new Set(Array.isArray(answers[current.key])?answers[current.key]:[]);
  const controles=new Map();
  const atualizar=()=>{for(const [opt,b] of controles){b.classList.toggle("selected",selected.has(opt));b.setAttribute("aria-pressed",String(selected.has(opt)));}};
  current.opts.forEach(opt=>{
   const b=button((selected.has(opt)?"✓ ":"")+opt,()=>{
    if(selected.has(opt))selected.delete(opt);else{
     if(current.exclusive){if(opt===current.exclusive)selected.clear();else selected.delete(current.exclusive);}
     selected.add(opt);
    }
    for(const [x,el] of controles)el.textContent=(selected.has(x)?"✓ ":"")+x;
    atualizar();
   });
   controles.set(opt,b);
  });
  atualizar();
  button("Continuar com minhas escolhas",()=>{
   if(current.required&&!selected.size){msg("Escolha pelo menos uma opção para continuar.",false,true);return;}
   gravarResposta([...selected]);
  },"submit");
 }else if(current.kind==="photo"){
  uploadArea.hidden=false;photoPreview.hidden=!arquivosFoto;
  if(arquivosFoto)photoPreview.textContent="Foto selecionada: "+arquivosFoto.nome;
  button("Continuar sem foto",()=>gravarResposta(null,"Sem foto nesta demonstração"),"secondary");
 }else{
  form.hidden=false;$("compose-placeholder").hidden=true;
  input.type=current.kind==="tel"?"tel":current.kind==="email"?"email":"text";
  input.value=answers[current.key]||"";input.required=!!current.required;
  input.placeholder=current.kind==="tel"?"(44) 99999-9999":current.kind==="email"?"voce@exemplo.com":"Digite sua resposta";
  if(current.optional)button("Pular esta pergunta",()=>gravarResposta("","Prefiro não informar"),"secondary");
  input.focus();
 }
 history.scrollTop=history.scrollHeight;
}
function mostrarRevisao(){
 current=null;
 if(role==="colaborador"&&!["ajudas","maquinas","empreendedores","materiais"].some(k=>(answers[k]||[]).length)){
  bot("Selecione pelo menos um tipo de colaboração para concluir.",true);
  index=steps.findIndex(s=>s.key==="ajudas");proxima();return;
 }
 const labels={nome:"Nome",tipo_pessoa:"Pessoa",telefone:"Telefone",email:"E-mail",endereco:"Endereço",zona:"Zona",ajudas:"Ajuda a pessoas",maquinas:"Máquinas e equipamentos",empreendedores:"Empreendedores",materiais:"Materiais e combustível",forma_entrega_doacao:"Entrega da doação",disponibilidade:"Disponibilidade",necessidade:"Necessidade",descricao:"Detalhes",modo_recebimento:"Recebimento",urgencia:"Urgência",endereco_ocorrencia:"Local da ocorrência",pessoas_no_local:"Pessoas no local",necessidade_relato:"Descrição",foto:"Fotografia",outros_ajudas:"Outros serviços",outros_maquinas:"Outros equipamentos",outros_empreendedores:"Outros apoios"};
 const linhas=Object.entries(answers).filter(([k,v])=>labels[k]&&v!==""&&v!=null&&(!Array.isArray(v)||v.length)).map(([k,v])=>labels[k]+": "+(Array.isArray(v)?v.join(", "):k==="foto"?"Imagem anexada":String(v)));
 bot("Confira suas informações antes de concluir:\n\n"+linhas.join("\n")+"\n\nEstá tudo correto?");
 optionsSimple([["✓ Confirmar e concluir",()=>concluir(),"submit"],["✎ Corrigir respostas",()=>{index=0;bot("Vamos revisar suas respostas. As escolhas anteriores foram preservadas.");proxima();}],["Voltar ao início",()=>startMenu(),"secondary"]]);
}
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
 optionsSimple([
  ["↩ Novo atendimento",()=>startMenu(),"submit"],
  ["🔎 Consultar cadastro",()=>consultarCadastro()],
  ["📍 Mapa de Colaboradores",()=>abrir("../mapas/?tipo=colaboradores")],
  ["🫶 Mapa da Ajuda",()=>abrir("../mapas/?tipo=ajuda")]
 ]);
}
function concluir(){
 try{
  if(role==="colaborador"){
   const anterior=app.encontrarPessoa(answers.telefone);
   const outros=[["Ajuda a pessoas",answers.outros_ajudas],["Máquinas",answers.outros_maquinas],["Empreendedores",answers.outros_empreendedores]]
    .filter(x=>x[1]).map(x=>x[0]+": "+x[1]).join("; ");
   const resultado=app.registrarColaborador({...answers,outros});
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
