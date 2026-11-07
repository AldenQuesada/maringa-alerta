
(async function(){
"use strict";
const {validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox}=globalThis.AlertaEventoFormatacao;
const conectado=!!globalThis.AlertaNuvem?.ativo;
const tenantId=AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage);
const prefeituraContexto=AlertaGestaoDados.criar(undefined,{municipioId:tenantId}).municipioAtivo();
const referenciaDemonstracao=globalThis.AlertaEventoDemonstracaoConfiguracao[prefeituraContexto.codigo_ibge];
const demoMode=!conectado&&!!referenciaDemonstracao&&(new URLSearchParams(location.search).get('demo')==='1'||new URLSearchParams(location.search).get('modo')==='demo');
const tenantConfig={nome:prefeituraContexto.nome,marca:AlertaGestaoDados.config.marca(prefeituraContexto),prefixo:prefeituraContexto.sigla||'AL'};
document.title=tenantConfig.marca;
for(const node of document.querySelectorAll('#municipal-brand,.status-brand'))node.textContent=tenantConfig.marca;
const storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`;
 // O cadastro operacional salvo antes da migração continua visível no modo normal.
 // A ausência de ?demo=1 não apaga nem oculta equipes que já estavam salvas.
 const estadoAnterior=conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
 const exibirEquipesLegadas=!!referenciaDemonstracao&&(demoMode||
   (estadoAnterior.estado==='restauravel'&&estadoAnterior.dados.voluntarios.length>0));

// Fim da resolução de contexto municipal.


