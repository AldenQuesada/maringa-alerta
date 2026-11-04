/* Maringá Unida · Núcleo da simulação de assistência pós-evento.
   Não envia mensagens nem substitui autenticação, banco, reservas ou APIs oficiais.
   Reaproveita as coleções locais da Gestão; não modifica o mapa de eventos. */
(function(root,factory) {
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.MaringaCrise=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root) {
"use strict";
const ZONAS_MARINGA=[
 {nome:"Zona 7",lat:-23.3995,lng:-51.9395},
 {nome:"Jardim Alvorada",lat:-23.387,lng:-51.912},
 {nome:"Conjunto Requião",lat:-23.436,lng:-51.956},
 {nome:"Jardim Universo",lat:-23.443,lng:-51.923},
 {nome:"Vila Esperança",lat:-23.382,lng:-51.951},
 {nome:"Centro Cívico",lat:-23.4225,lng:-51.9365}
];
const COMPATIBILIDADE={
 "Alimentação":["FORNECER ALIMENTAÇÃO"],
 "Telhas e cobertura":["PEDREIRO","CARPINTEIRO","MATERIAL DE CONSTRUÇÃO","CAMIONETE","CAMINHÃO BASCULANTE"],
 "Apoio financeiro":[],
 "Abrigo e moradia":[],
 "Roupas e cobertores":[],
 "Medicamentos e saúde":[],
 "Limpeza e remoção":["LIMPEZA","PÁ CARREGADEIRA","RETROESCAVADEIRA","BOBCAT","MOTOSSERRA COM OPERADOR"],
 "Material de construção":["MATERIAL DE CONSTRUÇÃO","PEDREIRO","CARPINTEIRO"],
 "Eletricidade e gerador":["ELETRICISTA","GERADOR"],
 "Água potável":[],
 "Transporte":["CAMIONETE","CAMINHÃO BASCULANTE","CAMINHÃO GARRA"],
 "Cuidados especiais":["CUIDADOR","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS"],
 "Laudos de prejuízos":["LAUDO","EMITIR LAUDOS DE PREJUÍZOS"],
 "Apoio a empreendedores":["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO"],
 "Outro":[]
};
const LIMITE_MENSAGEM=2500;
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const telefone=x=>String(x??"").replace(/\D/g,"");
const mesmoTelefone=(a,b)=>{const x=telefone(a),y=telefone(b);return x&&y&&(x===y||x.length>=10&&y.length>=10&&x.slice(-11)===y.slice(-11));};
const resumoPonto=(x,c=0)=>({lat:Number(x.lat),lng:Number(x.lng),label:x.nome});
function waLink(numero,mensagem) {
 const n=telefone(numero);
 if(n.length<10||n.length>13)return null;
 const full=n.startsWith("55")?n:"55"+n;
 return "https://wa.me/"+full+"?text="+encodeURIComponent(String(mensagem||"").slice(0,LIMITE_MENSAGEM));
}
function criar({armazenamento=root.localStorage,municipioId=null,escopoMunicipal=false}={}) {
 const D=root.AlertaGestaoDados;
 if(!D)throw Error("Carregue gestao/dados.js primeiro.");
 const db=D.criar(armazenamento,escopoMunicipal&&municipioId?{municipioId}:{});
 if(municipioId&&db.municipioAtivo()?.id!==municipioId&&!escopoMunicipal)db.selecionarMunicipio(municipioId);
 const prefeitura=()=>db.municipioAtivo();
 function zonas() {
  const locais=db.lista("zonas").map(x=>x.nome).filter(Boolean);
  const base=prefeitura()?.id==="maringa"?ZONAS_MARINGA.map(x=>x.nome):[];
  return [...new Set([...base,...locais])].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 }
 function pontoDaZona(nome) {
  const z=ZONAS_MARINGA.find(z=>norm(z.nome)===norm(nome));
  if(prefeitura()?.id==="maringa"&&z)return resumoPonto(z);
  const p=prefeitura();
  return p?.lat!==undefined&&p?.lng!==undefined?{lat:Number(p.lat),lng:Number(p.lng),label:p.nome}:null;
 }
 function oferentes() {return db.lista("voluntarios");}
 function pedidos(){return db.lista("solicitacoes");}
 function mobilizacoes(){return db.lista("mobilizacoes");}
 function apoios(){return db.lista("apoios");}
 function encontrarPessoa(tel) {return oferentes().find(x=>mesmoTelefone(x.telefone,tel))||null;}
 function encontrarIdentidade(tel){
  return encontrarPessoa(tel)||pedidos().find(x=>mesmoTelefone(x.telefone,tel))||null;
 }
 function validarBase({nome,telefone:tel,endereco,tipo_pessoa}) {
  if(!String(nome||"").trim())throw Error("Informe o nome ou a razão social.");
  if(!["FÍSICA","JURÍDICA"].includes(tipo_pessoa))throw Error("Escolha pessoa física ou jurídica.");
  if(!String(endereco||"").trim())throw Error("Informe o endereço.");
  if(telefone(tel).length<10||telefone(tel).length>13)throw Error("Informe um telefone/WhatsApp válido.");
 }
 const array=x=>Array.isArray(x)?x.filter(Boolean):typeof x==="string"?x.split(/[;,]/).map(y=>y.trim()).filter(Boolean):[];
 function registrarColaborador(dados){
  validarBase(dados);
  const existente=encontrarPessoa(dados.telefone);
  const campos={nome:String(dados.nome).trim(),tipo_pessoa:dados.tipo_pessoa,
    endereco:String(dados.endereco).trim(),telefone:String(dados.telefone).trim(),
    zona:String(dados.zona||"").trim(),
    ajudas:array(dados.ajudas),maquinas:array(dados.maquinas),empreendedores:array(dados.empreendedores),
    materiais:array(dados.materiais),outros:String(dados.outros||"").trim(),
    contribuicao:String(dados.contribuicao||"").trim(),disponibilidade:dados.disponibilidade||"Disponível"};
  return db.gravar("voluntarios",campos,existente?.id||null);
 }
 function pontuacaoOferta(pedido,voluntario) {
  if(pedido.telefone&&mesmoTelefone(pedido.telefone,voluntario.telefone))return -1;
  if(voluntario.disponibilidade==="Indisponível")return -1;
  const candidatas=COMPATIBILIDADE[pedido.necessidade]||[];
  if(!candidatas.length)return -1; // "Outros" e ajuda financeira pedem verificação.
  const recursos=[...array(voluntario.ajudas),...array(voluntario.maquinas),
    ...array(voluntario.empreendedores),...array(voluntario.materiais)];
  if(!recursos.some(x=>candidatas.some(t=>norm(t)===norm(x))))return -1;
  const mesmaZona=Boolean(pedido.zona&&voluntario.zona&&norm(pedido.zona)===norm(voluntario.zona));
  return (mesmaZona?100:10)+(voluntario.disponibilidade==="Disponível"?5:0);
 }
 function compatíveis(pedido) {
  return oferentes().map(x=>({colaborador:x,pontos:pontuacaoOferta(pedido,x)}))
   .filter(x=>x.pontos>=0)
   .sort((a,b)=>b.pontos-a.pontos||String(a.colaborador.nome).localeCompare(String(b.colaborador.nome)))
   .map(x=>x.colaborador);
 }
 function registrarPedido(dados) {
  const pessoa=encontrarIdentidade(dados.telefone);
  const base={...dados,nome:dados.nome||pessoa?.nome,tipo_pessoa:dados.tipo_pessoa||pessoa?.tipo_pessoa,
    endereco:dados.endereco||pessoa?.endereco,zona:dados.zona||pessoa?.zona};
  validarBase(base);
  if(!D.CATALOGOS.necessidades.includes(base.necessidade))throw Error("Escolha o tipo de ajuda.");
  // Não criar fluxo de pagamento/dinheiro direto. Requer referência institucional.
  const preview={necessidade:base.necessidade,zona:base.zona,telefone:base.telefone};
  // Pedidos críticos ficam com a autoridade competente; nunca atribuir automaticamente a voluntários.
  const matches=base.urgencia==="Crítica"?[]:compatíveis(preview);
  const atribuido=matches[0]||null;
  const result=db.gravar("solicitacoes",{
   nome:String(base.nome).trim(),tipo_pessoa:base.tipo_pessoa,telefone:String(base.telefone).trim(),
   endereco:String(base.endereco).trim(),zona:String(base.zona||"").trim(),
   necessidade:base.necessidade,descricao:String(base.descricao||"").trim(),urgencia:base.urgencia||"Normal",
   status:atribuido?"Encaminhada":"Aguardando",atribuido_a:atribuido?.id||"",
   evento_referencia:String(base.evento_referencia||"").trim(),criado_em:new Date().toISOString()
  });
  return {pedido:result,indicados:matches,mensagemPreparada:atribuido?mensagemParaColaborador(result):null,
   aviso:base.urgencia==="Crítica"?"Pedido prioritário para avaliação por equipe competente. Em risco imediato, contate 190, 192 ou 193.":atribuido?"Há colaborador compatível no cadastro; mensagem apenas preparada na simulação.":"A solicitação está aguardando disponibilidade/triagem."};
 }
 function mensagemParaColaborador(pedido){
  const p=prefeitura();
  return "MARINGÁ UNIDA · "+(p?.nome||"Município")+
   "\nHá um pedido de ajuda "+(pedido.necessidade||"")+" na zona "+(pedido.zona||"não informada")+
   ".\nReferência: "+pedido.id+"\nAo chegar, envie CHEGUEI. Ao concluir, envie TERMINEI."+
   "\nUma equipe municipal deve fornecer instruções e endereço privadamente.";
 }
 function registrarFase(pedidoId,fase) {
  if(!["Cheguei","Terminei"].includes(fase))throw Error("Só são aceitos Cheguei e Terminei.");
  const pedido=db.registro("solicitacoes",pedidoId);
  if(!pedido)throw Error("Pedido não encontrado.");
  if(!pedido.atribuido_a)throw Error("Nenhum colaborador encaminhado para este pedido.");
  if(fase==="Cheguei"&&pedido.status!=="Encaminhada")throw Error("Cheguei exige um acionamento prévio.");
  if(fase==="Terminei"&&pedido.status!=="Cheguei")throw Error("Terminei exige o registro Cheguei.");
  const novo=fase==="Cheguei"?"Cheguei":"Atendida";
  const result=db.gravar("solicitacoes",{...pedido,status:novo},pedido.id);
  return result;
 }
 function acionarBrigada(zona,descricao=""){
  if(!zona||!zonas().includes(zona))throw Error("Selecione uma zona cadastrada.");
  const voluntarios=oferentes().filter(x=>norm(x.zona)===norm(zona)&&x.disponibilidade!=="Indisponível");
  const equipes=db.lista("equipes").filter(x=>norm(x.zona)===norm(zona)&&x.status!=="Indisponível");
  const destinatarios=[...voluntarios.map(x=>({id:x.id,nome:x.nome,telefone:x.telefone,tipo:"colaborador"})),
   ...equipes.map(x=>({id:x.id,nome:x.nome,telefone:x.telefone,tipo:"equipe"}))];
  const unicos=[];const telefones=new Set();
  for(const x of destinatarios){const f=telefone(x.telefone);if(f&&telefones.has(f))continue;if(f)telefones.add(f);unicos.push(x);}
  const msg="MARINGÁ UNIDA · Brigada da zona "+zona+"\n"+(String(descricao).trim()||"Solicitação de mobilização da equipe e dos colaboradores disponíveis.")+
    "\nPara participação em campo, registre apenas CHEGUEI e TERMINEI.";
  const item=db.gravar("mobilizacoes",{nome:"Brigada · "+zona,zona,mensagem:msg,status:"Preparada",
    destinatarios:JSON.stringify(unicos),criado_em:new Date().toISOString()});
  return {mobilizacao:item,destinatarios:unicos,mensagem:msg,envios:unicos.map(x=>({nome:x.nome,tipo:x.tipo,link:waLink(x.telefone,msg)}))};
 }
 function solicitarOutraPrefeitura(destinoId,recurso){
  const origem=prefeitura(),destino=db.municipios().find(x=>x.id===destinoId);
  if(!destino||destino.id===origem?.id)throw Error("Selecione outra prefeitura cadastrada.");
  if(!String(recurso||"").trim())throw Error("Especifique o recurso ou apoio solicitado.");
  const msg="SOLICITAÇÃO INTERMUNICIPAL · MARINGÁ UNIDA\nOrigem: "+origem.nome+"/"+origem.uf+
    "\nDestino: "+destino.nome+"/"+destino.uf+"\nRecurso solicitado: "+String(recurso).trim()+
    "\nSolicitação preparada no protótipo; validação institucional obrigatória.";
  const item=db.gravar("apoios",{nome:"Pedido a "+destino.nome,destino:destino.nome+" / "+destino.uf,
    destino_id:destino.id,recurso:String(recurso).trim(),mensagem:msg,status:"Preparada",criado_em:new Date().toISOString()});
  return {pedido:item,mensagem:msg,link:waLink(destino.telefone,msg),destino};
 }
 return {db,prefeitura,zonas,pontoDaZona,oferentes,pedidos,mobilizacoes,apoios,
  encontrarPessoa,encontrarIdentidade,registrarColaborador,registrarPedido,compatíveis,registrarFase,acionarBrigada,
  solicitarOutraPrefeitura,mensagemParaColaborador};
}
return {criar,ZONAS_MARINGA,COMPATIBILIDADE,norm,telefone,mesmoTelefone,waLink};
});
