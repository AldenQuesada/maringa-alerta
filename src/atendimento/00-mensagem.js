/* Fluxo demonstrativo de WhatsApp. Não envia mensagens, não autentica usuários. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const app=MaringaCrise.criar({municipioId:sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa",escopoMunicipal:true});
const nomeMunicipio=app.prefeitura()?.nome||"Município";
document.title=nomeMunicipio+" Unida · Atendimento";
const catalogos=AlertaGestaoDados.CATALOGOS;
const history=$("history"),options=$("options"),form=$("reply-form"),input=$("reply");
const heading=document.querySelector(".header-title strong");if(heading)heading.textContent=nomeMunicipio+" Unida";
let identity=null,role=null,answers={},steps=[],index=0,current=null;
const timestamp=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
function mensagem(conteudo,personal=false,notice=false){
 const div=document.createElement("div");
 div.className="message"+(personal?" person":"")+(notice?" notice":"");
 const span=document.createElement("span");span.textContent=conteudo;div.appendChild(span);
 const small=document.createElement("small");small.textContent=timestamp();div.appendChild(small);
 history.appendChild(div);history.scrollTop=history.scrollHeight;
}
function clear(){options.replaceChildren();form.hidden=true;input.value="";input.removeAttribute("required");}
function bot(m){clear();mensagem(m);}
function button(label,fn,cls=""){
 const b=document.createElement("button");b.type="button";b.className="choice "+cls;b.textContent=label;b.onclick=fn;
 options.appendChild(b);return b;
}
function optionsSimple(items){
 clear();for(const [label,fn,cls] of items)button(label,()=>{mensagem(label,true);clear();fn();},cls||"");
}
function startMenu(){
 role=null;answers={};steps=[];index=0;
 bot("Olá, bem-vindo ao "+nomeMunicipio+" Unida! 🇧🇷\n\nComo você gostaria de se cadastrar?");
 optionsSimple([
  ["Colaborador",()=>start("colaborador")],
  ["Receber ajuda",()=>start("solicitacao")],
  ["Já tenho cadastro",()=>identificar()],
  ["Cheguei / Terminei",()=>iniciarFase()]
 ]);
}
function definirSteps(papel){
 const base=identity?[]:[
  {key:"tipo_pessoa",q:"Você é pessoa física ou pessoa jurídica?",kind:"single",opts:["FÍSICA","JURÍDICA"]},
  {key:"nome",q:"Qual é seu nome completo ou a razão social da empresa?",kind:"text",required:true},
  {key:"endereco",q:"Qual é seu endereço? Ele ficará reservado para o atendimento e não será exibido no mapa.",kind:"text",required:true},
  {key:"telefone",q:"Qual é seu telefone com DDD? Pode ser o mesmo número do WhatsApp.",kind:"tel",required:true}
 ];
 const zona={key:"zona",q:"Em qual zona ou região você está? Se não souber, escolha Não sei informar.",kind:"single",opts:[...app.zonas(),"Não sei informar"]};
 if(papel==="colaborador")return [...base,zona,
  {key:"ajudas",q:"Que tipo de ajuda você pode oferecer a pessoas atingidas? Pode selecionar várias opções.",kind:"multi",opts:catalogos.ajudas},
  {key:"maquinas",q:"Você disponibiliza maquinário, veículos, equipamentos ou materiais? Selecione tudo que se aplica.",kind:"multi",opts:catalogos.maquinas},
  {key:"empreendedores",q:"Que apoio pode oferecer para empreendedores atingidos?",kind:"multi",opts:catalogos.empreendedores},
  {key:"materiais",q:"Você pode fornecer material de construção ou combustível?",kind:"multi",opts:catalogos.materiais},
  {key:"outros",q:"Deseja especificar alguma opção OUTRO ou detalhar sua ajuda? Se não, pule esta etapa.",kind:"text",optional:true},
  {key:"disponibilidade",q:"Você está disponível para receber solicitações de ajuda?",kind:"single",opts:["Disponível","A combinar","Indisponível"]}
 ];
 return [...base,zona,
  {key:"necessidade",q:"Que tipo de ajuda você precisa neste momento?",kind:"single",opts:catalogos.necessidades},
  {key:"descricao",q:"Descreva brevemente o que precisa. Por exemplo, telhas para uma cobertura danificada ou refeições para sua família.",kind:"text",optional:true},
  {key:"urgencia",q:"Qual é a urgência do pedido?",kind:"single",opts:["Normal","Alta","Crítica"]}
 ];
}
function start(papel){
 form.onsubmit=responderEtapa;
 role=papel;answers=identity?{...identity}:{};
 steps=definirSteps(role);index=0;
 bot(papel==="colaborador"?
   "Obrigado por querer ajudar! Vamos registrar suas capacidades. Uma pessoa ou empresa pode oferecer vários tipos de apoio.":
   "Vamos registrar seu pedido de ajuda. Você pode solicitar alimentação, telhas, apoio financeiro e outras necessidades. Se também for colaborador, usaremos o mesmo cadastro.");
 proxima();
}
function gravarResposta(v,display){
 if(!current)return;
 answers[current.key]=v;
 mensagem(display??(Array.isArray(v)?(v.join(" · ")||"Nenhuma opção"):String(v)),true);
 index++;proxima();
}
function proxima(){
 clear();
 if(index>=steps.length){concluir();return;}
 current=steps[index];
 mensagem(current.q);
 if(current.kind==="single"){
  current.opts.forEach(opt=>button(opt,()=>{clear();gravarResposta(opt,opt);}));
 }else if(current.kind==="multi"){
  const selected=new Set();
  current.opts.forEach(opt=>{
   const b=button(opt,()=>{if(selected.has(opt)){selected.delete(opt);b.classList.remove("selected");b.setAttribute("aria-pressed","false");}
    else{selected.add(opt);b.classList.add("selected");b.setAttribute("aria-pressed","true");}});
   b.setAttribute("aria-pressed","false");
  });
  button("Continuar com minhas escolhas",()=>{clear();gravarResposta([...selected]);},"submit");
 }else{
  form.hidden=false;
  input.type=current.kind==="tel"?"tel":"text";
  input.placeholder=current.kind==="tel"?"(44) 99999-9999":"Escreva sua resposta...";
  input.required=Boolean(current.required);
  input.focus();
  if(current.optional)button("Pular",()=>{gravarResposta("","Prefiro não informar");},"secondary");
 }
 history.scrollTop=history.scrollHeight;
}
