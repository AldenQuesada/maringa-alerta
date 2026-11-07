/* Composição do repositório local. O modo remoto é escolhido somente na entrada. */
(function(global){
'use strict';
const {CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,COLLECTIONS}=global.AlertaCadastrosEsquemas;
function criar(armazenamento=global.localStorage,options={}){
 const scopedId=typeof options.municipioId==='string'?options.municipioId:null;
 const store=global.AlertaCadastrosEstado.criar({armazenamento,options,CHAVE,COLLECTIONS});
 const context={store,scopedId,ESQUEMAS,COLLECTIONS,CHAVE,criar};
 const read=global.AlertaCadastrosConsultas.criar(context);context.read=read;
 const write=global.AlertaCadastrosEscrita.criar(context);
 const imports=global.AlertaCadastrosImportacao.criar(context);
 const packages=global.AlertaCadastrosImplantacao.criar(context);
 const {municipioCorrente,estadoVisivel,...queries}=read;
 return {...queries,...write,...imports,...packages,estado:estadoVisivel,modo:scopedId?'municipal':'plataforma',municipioEscopo:scopedId};
}
function criarAdaptador(storage,options={}){
 if(global.AlertaNuvem?.ativo&&(storage===undefined||storage===global.localStorage))return global.AlertaNuvem.repositorio(options);
 return criar(storage,options);
}
const api={CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,config:global.AlertaMunicipios,parametros:global.AlertaParametros,criar:criarAdaptador,criarLocal:criar};
global.AlertaGestaoDados=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
