/* consultas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({INVENTARIO,TIPO,filtrosCadastros,state}){
function colaboradoresDisponiveis(){
 if(state.app.db.tipo==="supabase")return state.app.oferentes();
 const municipio=state.app.prefeitura()?.id;
 const anterior=municipio?OperacaoRestauracao.ler(localStorage,`alerta_prototipo_v2_${municipio}_operacao`,municipio):null;
 return ColaboradoresReferencia.listar(state.app.oferentes(),anterior);
}
function dadosFiltrados(){
 const inventario=INVENTARIO.registros(state.app.db);
 if(state.camadaAtual!=="principal")return INVENTARIO.filtrar(inventario,{modulo:state.camadaAtual,zona:state.filtroZona,classe:state.filtroClasse,busca:state.texto}).filter(filtrosCadastros.aceita);

 const xs=TIPO==="ajuda"?state.app.pedidos():colaboradoresDisponiveis();
 return xs.filter(x=>{
  if(state.filtroZona&&!(x.registroAnterior?INVENTARIO.normal(x.zona||x.bairro)===INVENTARIO.normal(state.filtroZona):INVENTARIO.filtrar(inventario,{modulo:TIPO==="ajuda"?"solicitacoes":"voluntarios",zona:state.filtroZona}).some(item=>item.id===String(x.id))))return false;
  if(state.filtroClasse&&(TIPO==="ajuda"?x.status:x.tipo_pessoa)!==state.filtroClasse)return false;
  if(state.texto){
   const campos=TIPO==="ajuda"?[x.necessidade,x.descricao,x.zona]:
     [x.nome,x.ajudas,x.maquinas,x.empreendedores,x.materiais,x.contribuicao,x.outros,x.zona,x.bairro];
   if(!campos.flat().join(" ").toLocaleLowerCase("pt-BR").includes(state.texto.toLocaleLowerCase("pt-BR")))return false;
  }
  return true;
 });
}
function colaboradoresAjudaFiltrados(){
 const inventario=INVENTARIO.registros(state.app.db);
 const permitidos=state.filtroZona?new Set(INVENTARIO.filtrar(inventario,{modulo:"voluntarios",zona:state.filtroZona}).map(x=>x.id)):null;
 const busca=INVENTARIO.normal(state.texto);
 return colaboradoresDisponiveis().filter(p=>{
  if(permitidos&&!(p.registroAnterior?INVENTARIO.normal(p.zona||p.bairro)===INVENTARIO.normal(state.filtroZona):permitidos.has(String(p.id))))return false;
  return !busca||INVENTARIO.normal([p.nome,p.zona,p.bairro,p.contribuicao,p.ajudas,p.maquinas,p.empreendedores,p.materiais,p.outros].flat().filter(Boolean).join(" ")).includes(busca);
 });
}
return {colaboradoresDisponiveis,dadosFiltrados,colaboradoresAjudaFiltrados};
}
root.AlertaMapasConsultas={criar};
})(globalThis);
