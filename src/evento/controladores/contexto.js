/* Controlador contexto: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('contexto',{
 dependencias:{},
 criar(dependencias){
 let validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox,conectado,tenantId,prefeituraContexto,referenciaDemonstracao,demoMode,tenantConfig,storageKey,estadoAnterior,exibirEquipesLegadas;

 async function iniciar(){
 ({validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox}=globalThis.AlertaEventoFormatacao);
(conectado=!!globalThis.AlertaNuvem?.ativo);
(tenantId=AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage));
(prefeituraContexto=AlertaGestaoDados.criar(undefined,{municipioId:tenantId}).municipioAtivo());
(referenciaDemonstracao=globalThis.AlertaEventoDemonstracaoConfiguracao[prefeituraContexto.codigo_ibge]);
(demoMode=!conectado&&!!referenciaDemonstracao&&(new URLSearchParams(location.search).get('demo')==='1'||new URLSearchParams(location.search).get('modo')==='demo'));
(tenantConfig={nome:prefeituraContexto.nome,marca:AlertaGestaoDados.config.marca(prefeituraContexto),prefixo:prefeituraContexto.sigla||'AL'});
document.title=tenantConfig.marca;
for(const node of document.querySelectorAll('#municipal-brand,.status-brand'))node.textContent=tenantConfig.marca;
(storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`);
(estadoAnterior=conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId));
(exibirEquipesLegadas=!!referenciaDemonstracao&&(demoMode||
   (estadoAnterior.estado==='restauravel'&&estadoAnterior.dados.voluntarios.length>0)));
 return true;
 }
 return {iniciar,get validaCPF(){return validaCPF;},get fmtCPF(){return fmtCPF;},get maskCPF(){return maskCPF;},get sortGravidade(){return sortGravidade;},get rnd(){return rnd;},get pick(){return pick;},get initials(){return initials;},get escHtml(){return escHtml;},get minutosDesde(){return minutosDesde;},get fmtDist(){return fmtDist;},get randPointInBox(){return randPointInBox;},get conectado(){return conectado;},get tenantId(){return tenantId;},get prefeituraContexto(){return prefeituraContexto;},get referenciaDemonstracao(){return referenciaDemonstracao;},get demoMode(){return demoMode;},get tenantConfig(){return tenantConfig;},get storageKey(){return storageKey;},get estadoAnterior(){return estadoAnterior;},get exibirEquipesLegadas(){return exibirEquipesLegadas;}};
 }
});
})(globalThis);
