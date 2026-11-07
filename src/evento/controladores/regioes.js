/* Controlador regioes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('regioes',{
 dependencias:{
  "randPointInBox": "contexto",
  "prefeituraContexto": "contexto",
  "referenciaDemonstracao": "contexto",
  "exibirEquipesLegadas": "contexto"
},
 criar(dependencias){
 let bairros,PAPEL_LABEL,MUNICIPIO_CENTER;
 function todosFuncionarios(){return bairros.flatMap(b=>Object.values(b.equipe));}
 async function iniciar(){
 (bairros=AlertaEventoRegioesDemonstrativas.criar({referencia:dependencias.referenciaDemonstracao,habilitado:dependencias.exibirEquipesLegadas,ponto:dependencias.randPointInBox}));
(PAPEL_LABEL={responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenador'});
(MUNICIPIO_CENTER=AlertaGestaoDados.config.centro(dependencias.prefeituraContexto));
 return true;
 }
 return {iniciar,get bairros(){return bairros;},get PAPEL_LABEL(){return PAPEL_LABEL;},get MUNICIPIO_CENTER(){return MUNICIPIO_CENTER;},todosFuncionarios};
 }
});
})(globalThis);
