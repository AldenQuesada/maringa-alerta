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
  if(voluntario.status_simulacao==="simulado")return -1;
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
