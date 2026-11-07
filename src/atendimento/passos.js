/* Contrato das perguntas, escolhas e vínculos territoriais; independente da interface. */
(function(root){'use strict';
function criar({catalogos,dados,municipio,uf,obterIdentidade=()=>null}){
const BENS=new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);
const ofereceBens=a=>["ajudas","maquinas","materiais"].some(k=>(a[k]||[]).some(x=>BENS.has(x)));
function identificarCampos(papel){
 const identity=obterIdentidade();
 if(papel==="solicitacao")return [
  {key:"nome",q:"Qual é seu nome?",kind:"text",required:true},
  {key:"endereco",q:"Qual é o endereço onde você precisa de ajuda?",kind:"text",required:true},
  {key:"telefone",q:"Qual é seu telefone com DDD?",kind:"tel",required:true}
 ];
 const b=[];
 if(!identity?.nome)b.push({key:"nome",q:"Qual é seu nome?",kind:"text",required:true});
 if(papel!=="relato"&&!identity?.tipo_pessoa)b.push({key:"tipo_pessoa",q:"Como você gostaria de se cadastrar?",kind:"single",opts:["FÍSICA","JURÍDICA"],required:true});
 if(papel!=="relato"&&!identity?.endereco)b.push({key:"endereco",q:papel==="colaborador"?"Informe seu endereço seguindo este formato:\nRua ou avenida, número, complemento (se houver), bairro, cidade/UF e CEP (se souber).\n\nExemplo: Rua das Flores, 100, Centro, "+municipio+"/"+(uf||"UF")+", CEP.\n\nSe não houver número, escreva s/n. 👇":"Informe seu endereço. Ele ficará reservado à equipe de atendimento.",kind:"text",required:true});
 if(!identity?.telefone)b.push({key:"telefone",q:"Qual é seu telefone com DDD?",kind:"tel",required:true});
 return b;
}
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
  {key:"ajudas",q:"Que tipo de ajuda pode oferecer para pessoas atingidas?",kind:"multi",opts:catalogos.ajudas},
  {key:"maquinas",q:"MAQUINÁRIO, equipamentos e materiais disponíveis",kind:"multi",opts:catalogos.maquinas},
  {key:"empreendedores",q:"Que tipo de apoio pode oferecer para empreendedores?",kind:"multi",opts:catalogos.empreendedores},
  {key:"outros",q:"Especifique qual outra ajuda, equipamento ou apoio você pode oferecer.",kind:"text",required:true,
   quando:a=>["ajudas","maquinas","empreendedores"].some(grupo=>(a[grupo]||[]).includes("OUTRO"))},
  {key:"materiais",q:"MATERIAL CONSTRUÇÃO / COMBUSTÍVEL",kind:"multi",opts:catalogos.materiais},
  {key:"forma_entrega_doacao",q:"Como você disponibiliza sua doação?",kind:"single",opts:catalogos.formas_entrega_doacao,quando:ofereceBens},
  {key:"ponto_publico",q:"Você oferece um ponto de atendimento e autoriza publicar seu nome, endereço, serviço e telefone nos mapas?",kind:"single",opts:["Sim, cadastrar ponto público","Não"],required:true},
  {key:"ponto_tipo",q:"Qual é o tipo do ponto?",kind:"single",opts:["Ponto de água potável","Ponto de banho","Centro de coleta de donativos","Outro"],quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_nome",q:"Qual é o nome do ponto de atendimento?",kind:"text",required:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_responsavel",q:"Qual é o nome do responsável pelo ponto?",kind:"text",required:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_endereco",q:"Qual é o endereço do ponto? Informe rua, número, bairro e cidade.",kind:"text",required:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_telefone",q:"Qual é o telefone do ponto com DDD?",kind:"tel",required:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_funcao",q:"O que o ponto oferece?",kind:"text",required:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_horario",q:"Qual é o horário de atendimento?",kind:"text",optional:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"},
  {key:"ponto_capacidade",q:"Quantas pessoas o ponto consegue atender? Informe um número ou pule se não souber.",kind:"text",optional:true,quando:a=>a.ponto_publico==="Sim, cadastrar ponto público"}
 ];
 if(papel==="solicitacao")return [...base,
  {key:"descricao",q:"Do que você precisa? Descreva a ajuda que está solicitando.",kind:"text",required:true}
 ];
 return [...base,
  {key:"endereco_ocorrencia",q:"Qual é o endereço exato da ocorrência? Informe rua, número e referência.",kind:"text",required:true},
  {key:"pessoas_no_local",q:"Há alguma destas pessoas no local? Selecione todas as opções aplicáveis.",kind:"multi",opts:["CRIANÇA / ADOLESCENTE","PESSOA IDOSA","PCD","NÃO HÁ"],exclusive:"NÃO HÁ",required:true},
  {key:"necessidade_relato",q:"Descreva o que aconteceu e a ajuda necessária.",kind:"text",optional:true},
  {key:"foto",q:"Envie uma foto da ocorrência, se for seguro fotografar. Você também pode concluir sem foto.",kind:"photo"}
 ];
}
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
return {ofereceBens,identificarCampos,zonaPeloEndereco,definirSteps,interpretarEscolhaMultipla};
}
root.AlertaAtendimentoPassos={criar};
})(globalThis);
