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
function aplicarConfiguracao(config){
 if(!config?.esquemas||!config?.catalogos||!Array.isArray(config.grupos))throw Error('Configuração inválida do servidor.');
 for(const key of Object.keys(ESQUEMAS))delete ESQUEMAS[key];
 Object.assign(ESQUEMAS,config.esquemas);
 for(const key of Object.keys(CATALOGOS))delete CATALOGOS[key];
 Object.assign(CATALOGOS,config.catalogos);
 GROUPS.splice(0,GROUPS.length,...config.grupos);
 COLLECTIONS.splice(0,COLLECTIONS.length,...new Set(Object.values(ESQUEMAS).map(x=>x.collection)));
}
const api={aplicarConfiguracao,CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,config:global.AlertaMunicipios,parametros:global.AlertaParametros,criar:criarAdaptador,criarLocal:criar};
global.AlertaGestaoDados=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
