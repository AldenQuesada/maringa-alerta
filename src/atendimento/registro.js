/* Um registro por conclusão; aguarda a persistência local ou remota antes de confirmar. */
(function(root){'use strict';
function protocolo(prefixo,id){return prefixo+"-SIM-"+String(id).replace(/[^a-z0-9]/gi,"").slice(-7).toUpperCase();}
function criar({app,dados,zonaPeloEndereco}){
 async function concluir({papel:role,respostas,foto:arquivosFoto,identidade}){
  if(!['colaborador','solicitacao','relato'].includes(role))throw Error('Fluxo de atendimento inválido.');
  const answers=JSON.parse(JSON.stringify(respostas));
  let identity=identidade?{...identidade}:null,mensagem='';
  const destino=dados.tipo==='supabase'?'no sistema municipal':'neste navegador';
  if(role==="colaborador"||role==="solicitacao")answers.zona=zonaPeloEndereco(answers.endereco);
  if(role==="colaborador"){
   const outros=String(answers.outros||"").trim();
   const resultado=await app.registrarColaborador({...answers,outros,disponibilidade:"A combinar"});
   identity={nome:resultado.nome,tipo_pessoa:resultado.tipo_pessoa,telefone:resultado.telefone,endereco:resultado.endereco,email:resultado.email,zona:resultado.zona};
   mensagem="Cadastro de colaborador concluído! ✅\n\nProtocolo: "+protocolo("COL",resultado.id)+
    "\nOfertas cadastradas: "+new Set([resultado.ajudas,resultado.maquinas,resultado.empreendedores,resultado.materiais].flat().filter(Boolean)).size+
    (resultado.forma_entrega_doacao?"\nDoação: "+resultado.forma_entrega_doacao:"")+
    "\n\nOs dados aparecem na Gestão e no Mapa de Colaboradores "+destino+". Nenhuma mensagem foi enviada a órgãos ou voluntários.";
  }else if(role==="solicitacao"){
   // "Outro" é somente a classificação interna; a necessidade fica no texto original do cidadão.
   const pedido=(await app.registrarPedido({...answers,necessidade:"Outro",descricao:String(answers.descricao||"").trim(),urgencia:"Não avaliada"})).pedido;
   identity={...identity,nome:pedido.nome,telefone:pedido.telefone,endereco:pedido.endereco,zona:pedido.zona};
   mensagem="Seu pedido de ajuda foi registrado. ✅\n\nAjuda solicitada: "+pedido.descricao+
    "\nSituação: "+pedido.status+
    "\n\nO pedido aparece no Mapa da Ajuda "+destino+", sem divulgar seu endereço. Nenhuma mensagem real foi enviada.";
  }else if(role==="relato"){
   const registro=await dados.gravar("relatos",{
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
   identity={...identity,nome:registro.nome,telefone:registro.telefone};
   mensagem="Relato recebido para triagem! ✅\n\nProtocolo de demonstração: "+protocolo("OCO",registro.id)+
    "\nEndereço: "+registro.endereco+
    "\nSituação: "+registro.status+
    (registro.foto?"\nFoto anexada com sucesso.":"\nSem foto anexada.")+
    "\n\nA equipe deverá verificar antes de confirmar uma ocorrência no Mapa de Evento. Nenhum acionamento real foi realizado.";
  }
  return {identidade:identity,mensagem};
 }
 return {concluir};
}
root.AlertaAtendimentoRegistro={criar};
})(globalThis);
