// O CI não pode ficar verde executando só parte dos mapas ou ignorando casos.
class MapasObrigatorios {
 constructor(){this.aprovados=new Set();}
 onTestEnd(test,result){
  if(result.status==='passed')this.aprovados.add(test.parent.project().name+'/'+test.title.split(':')[0]);
 }
 async onEnd(result){
  if(!process.env.CI)return;
  const faltantes=[];
  for(const motor of ['chromium','webkit'])for(const largura of [390,320])for(const mapa of ['ajuda','colaboradores','evento']){
   const caso=motor+'-'+largura+'/'+mapa;if(!this.aprovados.has(caso))faltantes.push(caso);
  }
  if(faltantes.length){
   console.error('Verificação móvel obrigatória incompleta: '+faltantes.join(', '));
   return {status:'failed'};
  }
  return {status:result.status};
 }
}
module.exports=MapasObrigatorios;
