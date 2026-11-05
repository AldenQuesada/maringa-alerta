/* Maringá Unida · Núcleo da simulação de assistência pós-evento.
   Não envia mensagens nem substitui autenticação, banco, reservas ou APIs oficiais.
   Reaproveita as coleções locais da Gestão; não modifica o mapa de eventos. */
(function(root,factory) {
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.MaringaCrise=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root) {
"use strict";
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
  return [...new Set(db.lista("zonas").map(x=>x.nome).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true}));
 }
 function pontoDaZona(nome) {
  const zona=db.lista("zonas").find(z=>norm(z.nome)===norm(nome));
  if(!zona)return null;
  const lat=Number(zona.lat),lng=Number(zona.lng);
  if(zona.lat!==""&&zona.lng!==""&&zona.lat!=null&&zona.lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)
   return {lat,lng,label:zona.nome};
  if(!zona.geojson)return null;
  try {
   const geo=typeof zona.geojson==="string"?JSON.parse(zona.geojson):zona.geojson;
   const pontos=[];
   const walk=c=>{if(Array.isArray(c)&&typeof c[0]==="number"&&typeof c[1]==="number")pontos.push(c);else if(Array.isArray(c))c.forEach(walk);};
   walk(geo.coordinates||geo.geometry?.coordinates||[]);
   if(!pontos.length)return null;
   const west=Math.min(...pontos.map(p=>p[0])),east=Math.max(...pontos.map(p=>p[0]));
   const south=Math.min(...pontos.map(p=>p[1])),north=Math.max(...pontos.map(p=>p[1]));
   if(![west,east,south,north].every(Number.isFinite))return null;
   return {lat:(south+north)/2,lng:(west+east)/2,label:zona.nome};
  }catch(_){return null}
 }
 const geofence=(point,geometry)=>{
  if(!point||!geometry||!["Polygon","MultiPolygon"].includes(geometry.type))return false;
  const insideRing=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit;};
  const insidePolygon=rings=>Array.isArray(rings)&&rings.length>0&&insideRing(rings[0])&&!rings.slice(1).some(insideRing);
  return (geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates).some(insidePolygon);
 };
 function situacaoBairro(bairro) {
  const pessoas=oferentes().filter(x=>norm(x.bairro||x.zona)===norm(bairro));
  const ativos=pessoas.filter(x=>x.checkin_status==="presente"&&x.checkin_bairro&&norm(x.checkin_bairro)===norm(bairro));
  return {bairro,colaboradores:pessoas.length,ativos:ativos.length,percentual:pessoas.length?Math.round(100*ativos.length/pessoas.length):0,pessoas};
 }
 function registrarCheckin({colaboradorId,bairro,lat,lng,precisao,geometry,origem="IBGE 2022"}={}) {
  const item=db.registro("voluntarios",colaboradorId);
  if(!item)throw Error("Colaborador não cadastrado nesta Prefeitura.");
  const origemBairro=String(item.bairro||item.zona||"").trim();
  if(!origemBairro||norm(origemBairro)!==norm(bairro))throw Error("A pessoa só pode registrar presença no bairro de cadastro.");
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(precisao)||precisao>100||precisao<0)
   throw Error("GPS insuficiente para validar chegada (precisão exigida: até 100 m).");
  if(!geometry||!geofence([lng,lat],geometry))throw Error("Fora do polígono do bairro cadastrado ou malha não disponível.");
  return db.gravar("voluntarios",{...item,checkin_status:"presente",checkin_bairro:origemBairro,
   checkin_em:new Date().toISOString(),checkin_lat:lat,checkin_lng:lng,checkin_precisao:precisao,
   checkin_fonte:origem,checkin_tipo:"autodeclarado_local"},colaboradorId);
 }
 function registrarSaida(colaboradorId) {
  const item=db.registro("voluntarios",colaboradorId);
  if(!item||item.checkin_status!=="presente")throw Error("Não há chegada ativa para este colaborador.");
  return db.gravar("voluntarios",{...item,checkin_status:"finalizado",checkout_em:new Date().toISOString()},colaboradorId);
 }
 function oferentes() {return db.lista("voluntarios");}
 function pedidos(){return db.lista("solicitacoes");}
 function mobilizacoes(){return db.lista("mobilizacoes");}
 function apoios(){return db.lista("apoios");}
 function encontrarPessoa(tel) {return oferentes().find(x=>mesmoTelefone(x.telefone,tel))||null;}
 function encontrarIdentidade(tel){
  return encontrarPessoa(tel)||pedidos().find(x=>mesmoTelefone(x.telefone,tel))||null;
 }
 function validarBase({nome,telefone:tel,endereco,tipo_pessoa},{exigirTipoPessoa=true}={}) {
  if(!String(nome||"").trim())throw Error("Informe o nome ou a razão social.");
  if((exigirTipoPessoa||tipo_pessoa)&&!["FÍSICA","JURÍDICA"].includes(tipo_pessoa))
   throw Error("Escolha pessoa física ou jurídica.");
  if(!String(endereco||"").trim())throw Error("Informe o endereço.");
  if(telefone(tel).length<10||telefone(tel).length>13)throw Error("Informe um telefone/WhatsApp válido.");
 }
 const array=x=>Array.isArray(x)?x.filter(Boolean):typeof x==="string"?x.split(/[;,]/).map(y=>y.trim()).filter(Boolean):[];
 function registrarColaborador(dados){
  validarBase(dados);
  const existente=encontrarPessoa(dados.telefone);
  const campos={...(existente||{}),nome:String(dados.nome).trim(),tipo_pessoa:dados.tipo_pessoa,
    endereco:String(dados.endereco).trim(),telefone:String(dados.telefone).trim(),email:String(dados.email||existente?.email||"").trim(),
    zona:String(dados.zona||existente?.zona||"").trim(),bairro:String(dados.bairro||existente?.bairro||"").trim(),
    ajudas:array(dados.ajudas),maquinas:array(dados.maquinas),empreendedores:array(dados.empreendedores),
    materiais:array(dados.materiais),forma_entrega_doacao:String(dados.forma_entrega_doacao||"").trim(),outros:String(dados.outros||"").trim(),
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
  validarBase(base,{exigirTipoPessoa:false});
  if(!D.CATALOGOS.necessidades.includes(base.necessidade))throw Error("Escolha o tipo de ajuda.");
  // Não criar fluxo de pagamento/dinheiro direto. Requer referência institucional.
  const preview={necessidade:base.necessidade,zona:base.zona,telefone:base.telefone};
  // Pedidos críticos ficam com a autoridade competente; nunca atribuir automaticamente a voluntários.
  const matches=base.urgencia==="Crítica"?[]:compatíveis(preview);
  const atribuido=matches[0]||null;
  const result=db.gravar("solicitacoes",{
   nome:String(base.nome).trim(),tipo_pessoa:base.tipo_pessoa,telefone:String(base.telefone).trim(),
   endereco:String(base.endereco).trim(),zona:String(base.zona||"").trim(),
   necessidade:base.necessidade,descricao:String(base.descricao||"").trim(),urgencia:base.urgencia||"Normal",modo_recebimento:String(base.modo_recebimento||"").trim(),
   status:atribuido?"Encaminhada":"Aguardando",atribuido_a:atribuido?.id||"",
   evento_referencia:String(base.evento_referencia||"").trim(),criado_em:new Date().toISOString()
  });
  return {pedido:result,indicados:matches,mensagemPreparada:atribuido?mensagemParaColaborador(result):null,
   aviso:base.urgencia==="Crítica"?"Pedido prioritário para avaliação por equipe competente. Em risco imediato, contate 190, 192 ou 193.":atribuido?"Há colaborador compatível no cadastro; mensagem apenas preparada na simulação.":"A solicitação está aguardando disponibilidade/triagem."};
 }
 function mensagemParaColaborador(pedido){
  const p=prefeitura();
  return "REDE MUNICIPAL · "+(p?.nome||"Município")+
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
  const msg="REDE MUNICIPAL · "+(prefeitura()?.nome||"Município")+" · Brigada da zona "+zona+"\n"+(String(descricao).trim()||"Solicitação de mobilização da equipe e dos colaboradores disponíveis.")+
    "\nPara participação em campo, registre apenas CHEGUEI e TERMINEI.";
  const item=db.gravar("mobilizacoes",{nome:"Brigada · "+zona,zona,mensagem:msg,status:"Preparada",
    destinatarios:JSON.stringify(unicos),criado_em:new Date().toISOString()});
  return {mobilizacao:item,destinatarios:unicos,mensagem:msg,envios:unicos.map(x=>({nome:x.nome,tipo:x.tipo,link:waLink(x.telefone,msg)}))};
 }
 function solicitarOutraPrefeitura(destinoId,recurso){
  const origem=prefeitura(),destino=db.municipios().find(x=>x.id===destinoId);
  if(!destino||destino.id===origem?.id)throw Error("Selecione outra prefeitura cadastrada.");
  if(!String(recurso||"").trim())throw Error("Especifique o recurso ou apoio solicitado.");
  const msg="SOLICITAÇÃO INTERMUNICIPAL · SISTEMA INTEGRADO DE CRISE\nOrigem: "+origem.nome+"/"+origem.uf+
    "\nDestino: "+destino.nome+"/"+destino.uf+"\nRecurso solicitado: "+String(recurso).trim()+
    "\nSolicitação preparada no protótipo; validação institucional obrigatória.";
  const item=db.gravar("apoios",{nome:"Pedido a "+destino.nome,destino:destino.nome+" / "+destino.uf,
    destino_id:destino.id,recurso:String(recurso).trim(),mensagem:msg,status:"Preparada",criado_em:new Date().toISOString()});
  return {pedido:item,mensagem:msg,link:waLink(destino.telefone,msg),destino};
 }
 return {db,prefeitura,zonas,pontoDaZona,oferentes,pedidos,mobilizacoes,apoios,
  encontrarPessoa,encontrarIdentidade,registrarColaborador,registrarPedido,compatíveis,registrarFase,acionarBrigada, situacaoBairro,registrarCheckin,registrarSaida,
  solicitarOutraPrefeitura,mensagemParaColaborador};
}
return {criar,COMPATIBILIDADE,norm,telefone,mesmoTelefone,waLink};
});
