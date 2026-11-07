/* Simulador demonstrativo de conversas WhatsApp. Nunca envia mensagens reais. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const app=MaringaCrise.criar({municipioId:AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage),escopoMunicipal:true}); // O contexto acompanha a prefeitura selecionada.
const dados=app.db, catalogos=AlertaGestaoDados.CATALOGOS;
const municipio=app.prefeitura()?.nome||"Município";
const identidade=AlertaGestaoDados.config.referencias(app.prefeitura()).identidade||{};
const cabecalho=document.querySelector('.header-title');
if(cabecalho){cabecalho.querySelector('strong').textContent='Prefeitura '+municipio;cabecalho.querySelector('small').textContent=identidade.perfil||'Atendimento municipal';}
document.title='Prefeitura '+municipio+' · Pra Somar';
const toolbar=document.querySelector('.demo-brand');
if(toolbar){toolbar.querySelector('strong').textContent='Prefeitura '+municipio;toolbar.querySelector('small').textContent=identidade.perfil||'Atendimento municipal';}
const logo=document.querySelector('#municipal-logo');if(logo&&identidade.logo){logo.src=identidade.logo;logo.alt='Brasão da Prefeitura de '+municipio;logo.hidden=false;}
const avatar=document.querySelector('.avatar');
if(avatar&&identidade.logo){const img=document.createElement('img');img.src=identidade.logo;img.alt='Logo da Prefeitura de '+municipio;avatar.replaceChildren(img);}
const history=$("history"),options=$("options"),form=$("reply-form"),input=$("reply");
const uploadArea=$("upload-area"),photoInput=$("photo-input"),photoPreview=$("photo-preview");
let identity=null,role=null,answers={},steps=[],index=0,current=null,arquivosFoto=null;

const {ofereceBens,identificarCampos,zonaPeloEndereco,definirSteps,interpretarEscolhaMultipla}=AlertaAtendimentoPassos.criar({catalogos,dados,municipio,uf:app.prefeitura()?.uf,obterIdentidade:()=>identity});
const {prepararFoto}=AlertaAtendimentoFoto.criar({document,URL,Image,limites:AlertaGestaoDados.parametros.atendimento});
const registroAtendimento=AlertaAtendimentoRegistro.criar({app,dados,zonaPeloEndereco});
let salvando=false;
async function concluir(){
 if(salvando)return;
 salvando=true;clear();
 try{
  const result=await registroAtendimento.concluir({papel:role,respostas:answers,foto:arquivosFoto,identidade:identity});
  identity=result.identidade;bot(result.mensagem);finalizarOpcoes();
 }catch(err){
  bot('Não foi possível salvar: '+(err?.message||'erro desconhecido')+'. Confira seus dados ou reduza a foto.',true);
  optionsSimple([['Revisar respostas',()=>mostrarRevisao(),'submit'],['Voltar ao início',()=>startMenu()]]);
 }finally{salvando=false;}
}
const hora=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
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
 if(salvando)return;
 // O cidadão entra exclusivamente pelos três fluxos canônicos.
 identity=null;role=null;answers={};steps=[];index=0;current=null;arquivosFoto=null;
 form.onsubmit=responderEtapa;
 bot("Olá! Bem-vindo ao "+AlertaGestaoDados.config.marca(app.prefeitura())+".\n\nUm sistema desenvolvido pela Prefeitura de "+municipio+" para que todos possam somar esforços na recuperação da nossa cidade em caso de eventos climáticos e desastres naturais.\n\nEscolha uma opção para continuar:");
 optionsSimple([
  ["Ser colaborador",()=>abrirPraSomar(),"submit"],
  ["Relatar ocorrência",()=>start("relato")],
  ["Preciso de ajuda",()=>start("solicitacao")]
 ]);
}
function abrirPraSomar(){
 bot("Programa de Apoio Social e Mobilização Voluntária de "+municipio+"\n\n“Onde a boa vontade se transforma em ação”\n\nUnindo:\nEmpresas 🤝 Voluntários 🤝 Entidades\n\nPara começar, digite seu nome e sobrenome 👇",false,identidade.apresentacao?{
  src:"../"+identidade.apresentacao,alt:"Identidade visual do Pra Somar enviada para a demonstração",titulo:"Pra Somar · Mobilização voluntária"
 }:null);
 start("colaborador",true); // O nome já foi perguntado na mensagem com a imagem; sem etapa intermediária.
}

// Não exigir que o cidadão saiba a zona: usa somente vínculos territoriais já cadastrados.

function start(papel,nomeJaPerguntado=false){
 form.onsubmit=responderEtapa;role=papel;answers=identity?{...identity}:{};steps=definirSteps(papel);index=0;current=null;arquivosFoto=null;
 if(papel==="colaborador" && nomeJaPerguntado){proxima(true);return;}
 if(papel==="solicitacao"){proxima();return;}
 bot("Vamos registrar a ocorrência em poucos passos. Em risco imediato, ligue 190, 192 ou 193. Não se aproxime de fios, árvores instáveis ou estruturas danificadas.");proxima();
}
function gravarResposta(valor,exibicao=null){
 if(!current)return;
 answers[current.key]=valor;
 if(role==="colaborador" && ["ajudas","maquinas","empreendedores"].includes(current.key) &&
   !["ajudas","maquinas","empreendedores"].some(grupo=>(answers[grupo]||[]).includes("OUTRO")))delete answers.outros;
 if(role==="colaborador" && ["ajudas","maquinas","materiais"].includes(current.key) && !ofereceBens(answers))
  delete answers.forma_entrega_doacao;
 const exib=exibicao??(Array.isArray(valor)?(valor.join(" · ")||"Nenhuma opção selecionada"):String(valor||"Prefiro não informar"));
 msg(exib,true);index++;proxima();
}
// Uma única escolha usa botões; múltiplas usam números digitados no chat.

function proxima(perguntaJaExibida=false){
 clear();
 while(index<steps.length&&steps[index].quando&&!steps[index].quando(answers))index++;
 if(index>=steps.length){mostrarRevisao();return;}
 current=steps[index];
 if(current.kind==="multi"){
  const lista=current.opts.map((opcao,i)=>(i+1)+". "+opcao).join("\n");
  const nenhuma=current.required?"":"\n0. Nenhuma das opções";
  msg(current.q+"\n\n"+lista+nenhuma+
    "\n\nVocê pode escolher mais de uma opção. Digite os números separados por vírgula. Exemplo: 1, 3, 5."+
    (current.required?"":" Se nenhuma se aplica, digite 0."));
  form.hidden=false;
  $("compose-placeholder").hidden=true;
  input.type="text";
  input.inputMode="text"; // O teclado precisa permitir vírgulas e espaços entre os números.
  input.placeholder=current.required?"Ex.: 1, 3":"Ex.: 1, 3 ou 0";
  input.required=true;
  input.value=Array.isArray(answers[current.key])?
   answers[current.key].map(opcao=>current.opts.indexOf(opcao)+1).filter(n=>n>0).join(", "):"";
  input.focus();
 }else if(current.kind==="single"){
  if(role==="colaborador" && current.key==="tipo_pessoa"){
   msg("Muito obrigado, "+String(answers.nome||"")+"! Como você gostaria de se cadastrar?\n\n◾ Pessoa física\n◾ Pessoa jurídica\n\nToque em uma das opções abaixo. 👇");
   current.opts.forEach(opt=>{
    const rotulo=opt==="FÍSICA"?"Pessoa física":"Pessoa jurídica";
    button(rotulo,()=>{clear();gravarResposta(opt,rotulo);});
   });
  }else{
   msg(current.q);
   current.opts.forEach(opt=>button(opt,()=>{clear();gravarResposta(opt);}));
  }
 }else if(current.kind==="photo"){
  msg(current.q);
  uploadArea.hidden=false;
  photoPreview.hidden=!arquivosFoto;
  if(arquivosFoto)photoPreview.textContent="Foto selecionada: "+arquivosFoto.nome;
  button("Continuar sem foto",()=>gravarResposta(null,"Sem foto nesta demonstração"),"secondary");
 }else{
  if(!perguntaJaExibida)msg(current.q);
  form.hidden=false;$("compose-placeholder").hidden=true;
  input.type=current.kind==="tel"?"tel":"text";
  input.inputMode=current.kind==="tel"?"tel":"text";
  input.value=answers[current.key]||"";input.required=!!current.required;
  input.placeholder=current.kind==="tel"?"DDD + número do celular":"Digite sua resposta";
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
 const labels={ponto_publico:"Divulgar ponto",ponto_tipo:"Tipo de ponto",ponto_nome:"Nome do ponto",ponto_responsavel:"Responsável",ponto_endereco:"Endereço do ponto",ponto_telefone:"Telefone do ponto",ponto_funcao:"Serviço oferecido",ponto_horario:"Horário de atendimento",ponto_capacidade:"Capacidade em pessoas",nome:"Nome",tipo_pessoa:"Pessoa",telefone:"Telefone",email:"E-mail",endereco:"Endereço",zona:"Zona",ajudas:"Ajuda a pessoas",maquinas:"Máquinas e equipamentos",empreendedores:"Empreendedores",materiais:"Materiais e combustível",forma_entrega_doacao:"Entrega da doação",disponibilidade:"Disponibilidade",necessidade:"Necessidade",descricao:role==="solicitacao"?"Ajuda solicitada":"Detalhes",modo_recebimento:"Recebimento",urgencia:"Urgência",endereco_ocorrencia:"Local da ocorrência",pessoas_no_local:"Pessoas no local",necessidade_relato:"Descrição",foto:"Fotografia",outros:"Especificar outros",outros_ajudas:"Outros serviços",outros_maquinas:"Outros equipamentos",outros_empreendedores:"Outros apoios"};
 const linhas=Object.entries(answers).filter(([k,v])=>labels[k]&&v!==""&&v!=null&&(!Array.isArray(v)||v.length)).map(([k,v])=>labels[k]+": "+(Array.isArray(v)?v.join(", "):k==="foto"?"Imagem anexada":String(v)));
 bot("Confira suas informações antes de concluir:\n\n"+linhas.join("\n")+"\n\nEstá tudo correto?");
 const acoes=[["✓ Confirmar e concluir",()=>concluir(),"submit"],["✎ Corrigir respostas",()=>{index=0;bot("Vamos revisar suas respostas. As escolhas anteriores foram preservadas.");proxima();}]];
 if(role==="relato")acoes.push(["Voltar ao início",()=>startMenu(),"secondary"]);
 optionsSimple(acoes);
}
function responderEtapa(e){
 e.preventDefault();
 if(!current)return;
 const valor=input.value.trim();
 if(current.required&&!valor){input.focus();return;}
 if(current.kind==="multi"){
  const resultado=interpretarEscolhaMultipla(valor,current);
  if(resultado.erro){msg(resultado.erro,false,true);input.focus();return;}
  gravarResposta(resultado.opcoes,valor);
  return;
 }
 if(current.key==="ponto_capacidade"&&valor&&!/^\d+$/.test(valor)){msg("Informe um número de pessoas ou pule esta pergunta.",false,true);input.focus();return;}
 if(current.key==="ponto_telefone"||current.key==="telefone"||current.key==="consulta_telefone"||current.key==="fase_telefone"){
  const n=MaringaCrise.telefone(valor);
  if(n.length<10||n.length>13){msg("Informe um telefone válido com DDD.",false,true);input.focus();return;}
 }
 gravarResposta(valor);
}
form.onsubmit=responderEtapa;

function finalizarOpcoes(){
 optionsSimple([["Voltar ao início",()=>startMenu(),"submit"]]);
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
 if(salvando)return;
 // Reiniciar a conversa NÃO apaga registros municipais, pedidos nem relatos.
 if(!window.confirm("Reiniciar a conversa? Os cadastros, pedidos e relatos já registrados serão preservados."))return;
 identity=null;role=null;steps=[];answers={};current=null;index=0;arquivosFoto=null;photoInput.value="";
 history.replaceChildren();
 const divisor=document.createElement("div");divisor.className="day-divider";divisor.textContent="HOJE";history.appendChild(divisor);
 form.onsubmit=responderEtapa;
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
