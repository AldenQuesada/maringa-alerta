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
 // O cidadão entra exclusivamente pelos três fluxos canônicos.
 identity=null;role=null;answers={};steps=[];index=0;current=null;arquivosFoto=null;
 form.onsubmit=responderEtapa;
 bot("Olá! Bem-vindo ao Maringá Alerta.\n\nUm sistema desenvolvido pela Prefeitura de Maringá para que todos possam somar esforços na recuperação da nossa cidade em caso de eventos climáticos e desastres naturais.\n\nEscolha uma opção para continuar:");
 optionsSimple([
  ["Ser colaborador",()=>abrirPraSomar(),"submit"],
  ["Relatar ocorrência",()=>start("relato")],
  ["Preciso de ajuda",()=>start("solicitacao")]
 ]);
}
function abrirPraSomar(){
 bot("Programa de Apoio Social e Mobilização Voluntária de Maringá\n\n“Onde a boa vontade se transforma em ação”\n\nUnindo:\nEmpresas 🤝 Voluntários 🤝 Entidades\n\nPara começar, qual é seu nome completo ou razão social?",false,{
  src:"../assets/pra-somar-original.webp",alt:"Identidade visual do Pra Somar enviada para a demonstração",titulo:"Pra Somar · Mobilização voluntária"
 });
 start("colaborador",true); // O nome já foi perguntado na mensagem com a imagem; sem etapa intermediária.
}
const BENS=new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);
const BENS_DEMANDA=new Set(["Alimentação","Telhas e cobertura","Roupas e cobertores","Medicamentos e saúde","Material de construção","Água potável"]);
const ofereceBens=a=>["ajudas","maquinas","materiais"].some(k=>(a[k]||[]).some(x=>BENS.has(x)));
function identificarCampos(papel){
 const b=[];
 if(!identity?.nome)b.push({key:"nome",q:papel==="relato"?"Qual é seu nome?":"Qual é seu nome completo ou razão social?",kind:"text",required:true});
 if(papel!=="relato"&&!identity?.tipo_pessoa)b.push({key:"tipo_pessoa",q:"Você é pessoa física ou jurídica?",kind:"single",opts:["FÍSICA","JURÍDICA"],required:true});
 if(papel!=="relato"&&!identity?.endereco)b.push({key:"endereco",q:"Informe seu endereço. Ele ficará reservado à equipe de atendimento.",kind:"text",required:true});
 if(!identity?.telefone)b.push({key:"telefone",q:"Qual é seu telefone com DDD?",kind:"tel",required:true});
 return b;
}
// Não exigir que o cidadão saiba a zona: usa somente vínculos territoriais já cadastrados.
function zonaPeloEndereco(endereco){
 const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const texto=" "+norm(endereco)+" ";
 if(!texto.trim())return "";
 const zonas=dados.lista("zonas").map(z=>z.nome).filter(Boolean);
 const encontradas=zonas.filter(nome=>texto.includes(" "+norm(nome)+" "));
 if(encontradas.length===1)return encontradas[0];
 const referencias=dados.lista("bairros").filter(b=>b.nome&&b.zona&&texto.includes(" "+norm(b.nome)+" "));
 const associadas=[...new Set(referencias.map(b=>b.zona))];
 return associadas.length===1?associadas[0]:"";
}
function definirSteps(papel){
 const base=identificarCampos(papel);
 if(papel==="colaborador")return [...base,
  {key:"ajudas",q:"Que tipos de ajuda você pode oferecer às pessoas atingidas? Pode marcar várias.",kind:"multi",opts:catalogos.ajudas},
  {key:"outros_ajudas",q:"Você marcou OUTRO em ajuda a pessoas. O que pode oferecer?",kind:"text",required:true,quando:a=>(a.ajudas||[]).includes("OUTRO")},
  {key:"maquinas",q:"Você pode oferecer maquinário, veículos, equipamentos ou materiais? Marque quantos quiser.",kind:"multi",opts:catalogos.maquinas},
  {key:"outros_maquinas",q:"Qual outro equipamento ou máquina você pode disponibilizar?",kind:"text",required:true,quando:a=>(a.maquinas||[]).includes("OUTRO")},
  {key:"empreendedores",q:"Pode ajudar empreendedores atingidos? Escolha as opções que se aplicam.",kind:"multi",opts:catalogos.empreendedores},
  {key:"outros_empreendedores",q:"Que outro apoio pode oferecer aos empreendedores?",kind:"text",required:true,quando:a=>(a.empreendedores||[]).includes("OUTRO")},
  {key:"materiais",q:"Pode fornecer material de construção ou combustível?",kind:"multi",opts:catalogos.materiais},
  {key:"forma_entrega_doacao",q:"Como prefere disponibilizar alimentos ou materiais? A prefeitura deve confirmar o ponto de recebimento antes de qualquer entrega.",kind:"single",opts:catalogos.formas_entrega_doacao,quando:ofereceBens}
 ];
 if(papel==="solicitacao")return [...base,
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
function start(papel,nomeJaPerguntado=false){
 form.onsubmit=responderEtapa;role=papel;answers=identity?{...identity}:{};steps=definirSteps(papel);index=0;current=null;arquivosFoto=null;
 if(papel==="colaborador" && nomeJaPerguntado){proxima(true);return;}
 const texto=papel==="solicitacao"?"Vamos registrar o que você precisa. Seus dados de contato e endereço não serão publicados.":"Vamos registrar a ocorrência em poucos passos. Em risco imediato, ligue 190, 192 ou 193. Não se aproxime de fios, árvores instáveis ou estruturas danificadas.";
 bot(texto);proxima();
}
function gravarResposta(valor,exibicao=null){
 if(!current)return;
 answers[current.key]=valor;
 const exib=exibicao??(Array.isArray(valor)?(valor.join(" · ")||"Nenhuma opção selecionada"):String(valor||"Prefiro não informar"));
 msg(exib,true);index++;proxima();
}
// Uma única escolha usa botões; múltiplas usam números digitados no chat.
function interpretarEscolhaMultipla(texto,pergunta){
 const entrada=String(texto||"").trim().replace(/\s+e\s+/gi,",");
 const partes=entrada.split(/[,;\s]+/).filter(Boolean);
 if(!partes.length || partes.some(parte=>!/^\d+$/.test(parte)))
  return {erro:"Digite somente os números das opções, separados por vírgula. Exemplo: 1, 3, 5."};
 const indices=[...new Set(partes.map(Number))];
 if(indices.includes(0)){
  if(indices.length!==1 || pergunta.required)
   return {erro:"A opção 0 (nenhuma) deve ser enviada sozinha e só vale para perguntas opcionais."};
  return {opcoes:[]};
 }
 if(indices.some(n=>n<1||n>pergunta.opts.length))
  return {erro:"Escolha apenas números da lista, entre 1 e "+pergunta.opts.length+"."};
 const opcoes=indices.map(n=>pergunta.opts[n-1]);
 if(pergunta.exclusive&&opcoes.includes(pergunta.exclusive)&&opcoes.length>1)
  return {erro:'"'+pergunta.exclusive+'" não pode ser combinada com outras respostas. Informe apenas o seu número.'};
 return {opcoes};
}
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
  msg(current.q);
  current.opts.forEach(opt=>button(opt,()=>{clear();gravarResposta(opt);}));
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
  input.placeholder=current.kind==="tel"?"(44) 99999-9999":"Digite sua resposta";
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
