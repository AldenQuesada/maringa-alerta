/* Dados de referência e bootstrap exclusivo da demonstração local.
 * Novos municípios são cadastrados no Admin Geral; não exigem alterar regras. */
(function(root){
'use strict';
const demonstracao={id:'maringa',nome:'Maringá',uf:'PR',codigo_ibge:'4115200',pais:'Brasil',paisId:'BR',estado:'Paraná',codigo_uf:'41',status:'ativa',origem_provisionamento:'bootstrap',lat:-23.4205,lng:-51.9333,zoom:12,bbox_verificacao:[-25,-22,-53,-50],bbox_navegacao:[-23.578,-23.235,-52.123,-51.813]};
const referencias={
 '4115200':{
  publicas:['dados-territoriais/maringa-bases-riscos-publicos.json','dados-territoriais/maringa-abrigos-publicos.json','dados-territoriais/maringa-apoio-imagens-2026.json'],
  cnes:{url:'dados-territoriais/maringa-unidades-cnes.json',quantidade:69},
  identidade:{logo:'https://previdencia.maringa.pr.gov.br/assets/images/logoprefeituranova.png',perfil:'@prasomarmga',apresentacao:'assets/pra-somar-original.webp'},
  catalogoBairros:'MaringaBairros',
  eventoHistorico:{adaptador:'EventoTornado2026',rotulo:'Importar tornado de 02/11/2026'},
  mapaDemonstrativo:true,
  importarZonasReferencia:true,
  legadoAdmin:"maringa_admin_v1",
  vistaAjuda:{lat:-23.4398505,lng:-51.9680312,zoom:12.7027}
 }
};
root.AlertaMunicipiosConfiguracao={demonstracao,referencias};
if(typeof module==='object'&&module.exports)module.exports=root.AlertaMunicipiosConfiguracao;
})(globalThis);
