/* Composição de controladores com estado privado e referências vivas explícitas. */
(function(root){'use strict';
const definicoes=new Map();
function definir(nome,contrato){if(definicoes.has(nome))throw Error('Controlador repetido: '+nome);definicoes.set(nome,contrato);}
function criar(){
 const instancias=new Map();
 for(const [nome,contrato]of definicoes){
  const dependencias={};
  for(const [campo,origem]of Object.entries(contrato.dependencias)){
   if(!definicoes.has(origem))throw Error('Controlador ausente: '+origem);
   Object.defineProperty(dependencias,campo,{enumerable:true,get:()=>instancias.get(origem)[campo],set:valor=>{instancias.get(origem)[campo]=valor;}});
  }
  instancias.set(nome,contrato.criar(dependencias));
 }
 for(const contrato of definicoes.values())for(const [campo,origem]of Object.entries(contrato.dependencias))if(!Object.hasOwn(instancias.get(origem),campo))throw Error('Dependência ausente: '+origem+'.'+campo);
 let inicio;
 return {iniciar(){return inicio??=(async()=>{for(const instancia of instancias.values())if(await instancia.iniciar()===false)return false;return true;})();},obter:nome=>instancias.get(nome)};
}
root.AlertaEventoControladores={definir,criar};
})(globalThis);
