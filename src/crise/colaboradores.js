/* Domínio de colaboradores: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
function criar({db,validarBase,encontrarPessoa,array}){
function registrarColaborador(dados){
  validarBase(dados);
  const existente=encontrarPessoa(dados.telefone);
  const campos={...(existente||{}),nome:String(dados.nome).trim(),tipo_pessoa:dados.tipo_pessoa,
    endereco:String(dados.endereco).trim(),telefone:String(dados.telefone).trim(),email:String(dados.email||existente?.email||"").trim(),
    zona:String(dados.zona||existente?.zona||"").trim(),bairro:String(dados.bairro||existente?.bairro||"").trim(),
    ajudas:array(dados.ajudas),maquinas:array(dados.maquinas),empreendedores:array(dados.empreendedores),
    materiais:array(dados.materiais),forma_entrega_doacao:String(dados.forma_entrega_doacao||"").trim(),outros:String(dados.outros||"").trim(),
    contribuicao:String(dados.contribuicao||"").trim(),disponibilidade:dados.disponibilidade||"Disponível"};
  const pessoa=db.gravar("voluntarios",campos,existente?.id||null);
  if(dados.ponto_publico==="Sim, cadastrar ponto público"){
   const idExterno="colaborador:ponto:"+pessoa.id;
   const anterior=db.lista("bases").find(x=>x.externalId===idExterno);
   const tipos=["Ponto de água potável","Ponto de banho","Centro de coleta de donativos","Outro"];
   const ponto={...(anterior||{}),nome:String(dados.ponto_nome||anterior?.nome||("Ponto de atendimento · "+pessoa.nome)),tipo:tipos.includes(dados.ponto_tipo)?dados.ponto_tipo:"Outro",responsavel:String(dados.ponto_responsavel||pessoa.nome),telefone:String(dados.ponto_telefone||pessoa.telefone),endereco:String(dados.ponto_endereco||pessoa.endereco),zona:pessoa.zona,bairro:pessoa.bairro,funcao:String(dados.ponto_funcao||""),horario:String(dados.ponto_horario||""),capacidade:String(dados.ponto_capacidade||""),externalId:idExterno,fonte:"Colaborador · atendimento simulado",verificacao:anterior?.verificacao||"Em conferência"};
   db.gravar("bases",ponto,anterior?.id||null);
  }
  return pessoa;
 }
return {registrarColaborador};
}
root.AlertaCriseColaboradores={criar};
})(globalThis);
