/* Gera as equipes locais apenas a partir de uma referência municipal explícita. */
(function(root){
'use strict';
function criar({referencia,habilitado,sortear=Math.random,ponto}){
 if(!habilitado||!referencia)return [];
 const dados=JSON.parse(JSON.stringify(referencia));
 const {equipe,equipamentos,bairros}=dados;
 let cursor=0,id=1;
 const escolher=lista=>lista[Math.floor(sortear()*lista.length)];
 for(const b of bairros){
  b.equipamentos=[escolher(equipamentos),escolher(equipamentos)];
  b.equipe={};
  for(const papel of ['responsavel','substituto','coordenador']){
   const p={...equipe[cursor++%equipe.length]};
   Object.assign(p,{id:'f'+id++,papel,zona:b.nome,pos:ponto(b.poly),tel:'('+dados.ddd+') 9'+Math.floor(1000+sortear()*8999)+'-'+Math.floor(1000+sortear()*8999)});
   b.equipe[papel]=p;
  }
 }
 return bairros;
}
root.AlertaEventoRegioesDemonstrativas={criar};
})(globalThis);
