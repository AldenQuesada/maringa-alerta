const fs=require('node:fs'),vm=require('node:vm');
function criar(nome,dependencias={},globais=dependencias){
 let contrato;
 const ctx={...globais,AlertaGestaoDados:{parametros:require('../../gestao/dados.js').parametros,...globais.AlertaGestaoDados},AlertaEventoControladores:{definir:(_nome,def)=>{contrato=def;}}};
 vm.runInNewContext(fs.readFileSync('src/evento/controladores/'+nome+'.js','utf8'),ctx);
 return contrato.criar(dependencias);
}
module.exports={criar};
