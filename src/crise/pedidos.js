/* Domínio de pedidos: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
function criar({db,D,prefeitura,encontrarIdentidade,validarBase,compatíveis}){
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
return {registrarPedido,mensagemParaColaborador,registrarFase};
}
root.AlertaCrisePedidos={criar};
})(globalThis);
