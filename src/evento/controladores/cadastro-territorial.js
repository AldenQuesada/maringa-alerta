/* Controlador cadastro-territorial: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('cadastro-territorial',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "prefeituraContexto": "contexto",
  "exibirEquipesLegadas": "contexto",
  "bairros": "regioes"
},
 criar(dependencias){
 let ocorrencias,voluntarios,idCounter,gestao,normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel,camadasVisiveis,eventoAtivo,eventosCache,eventosMunicipio,abriuEventoDaUrl,noEvento,filtroOcorrencias,noFiltro,ocorrenciaVisivel,currentRole;

 async function iniciar(){
 (ocorrencias=[]);
(voluntarios=[]);
(idCounter=1);
(gestao=AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId}));
({normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel}=await AlertaEventoTerritorio.criar({db:gestao,municipio:dependencias.prefeituraContexto,config:AlertaGestaoDados.config,bairros:dependencias.bairros,conectado:dependencias.conectado}));
(camadasVisiveis={Zona:true,Bairro:true,'Zona cartográfica':false,'Zona demonstrativa':dependencias.exibirEquipesLegadas});
(eventoAtivo=new URLSearchParams(location.search).get('evento')||'');
(eventosCache=[]);
(eventosMunicipio=()=>eventosCache);
(abriuEventoDaUrl=false);
(noEvento=o=>EventosMapa.corresponde(o,eventoAtivo,eventosMunicipio()));
(filtroOcorrencias=null);
(noFiltro=o=>!filtroOcorrencias||filtroOcorrencias.corresponde(o));
(ocorrenciaVisivel=o=>noRecorte(o.bairro)&&noEvento(o)&&noFiltro(o));
(currentRole={tipo:"visualizacao"});
 return true;
 }
 return {iniciar,get ocorrencias(){return ocorrencias;},set ocorrencias(valor){ocorrencias=valor;},get voluntarios(){return voluntarios;},set voluntarios(valor){voluntarios=valor;},get idCounter(){return idCounter;},set idCounter(valor){idCounter=valor;},get gestao(){return gestao;},get normalizarTerritorio(){return normalizarTerritorio;},get areasCadastradas(){return areasCadastradas;},get areas(){return areas;},get selecao(){return selecao;},get areasSelecionadas(){return areasSelecionadas;},get pertence(){return pertence;},get noRecorte(){return noRecorte;},get recorteLabel(){return recorteLabel;},get camadasVisiveis(){return camadasVisiveis;},get eventoAtivo(){return eventoAtivo;},set eventoAtivo(valor){eventoAtivo=valor;},get eventosCache(){return eventosCache;},set eventosCache(valor){eventosCache=valor;},get eventosMunicipio(){return eventosMunicipio;},get abriuEventoDaUrl(){return abriuEventoDaUrl;},set abriuEventoDaUrl(valor){abriuEventoDaUrl=valor;},get noEvento(){return noEvento;},get filtroOcorrencias(){return filtroOcorrencias;},set filtroOcorrencias(valor){filtroOcorrencias=valor;},get noFiltro(){return noFiltro;},get ocorrenciaVisivel(){return ocorrenciaVisivel;},get currentRole(){return currentRole;},set currentRole(valor){currentRole=valor;}};
 }
});
})(globalThis);
