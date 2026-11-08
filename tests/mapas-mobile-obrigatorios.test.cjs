const {test}=require('node:test'),assert=require('node:assert/strict');
const Reporter=require('./browser/mapas-obrigatorios.reporter.cjs');
test('check móvel exige aprovação de todos os mapas, motores e tamanhos, inclusive sem skips',async()=>{
 const ci=process.env.CI;process.env.CI='true';
 const log=console.error;console.error=()=>{};
 try{
  const reporter=new Reporter();
  const caso=(motor,largura,mapa)=>({parent:{project:()=>({name:motor+'-'+largura})},title:mapa+': câmera'});
  for(const motor of ['chromium','webkit'])for(const largura of [390,320])for(const mapa of ['ajuda','colaboradores','evento']){
   if(motor==='webkit'&&largura===320&&mapa==='evento')continue;
   reporter.onTestEnd(caso(motor,largura,mapa),{status:'passed'});
  }
  assert.equal((await reporter.onEnd({status:'passed'})).status,'failed','caso ausente deve bloquear');
  reporter.onTestEnd(caso('webkit',320,'evento'),{status:'skipped'});
  assert.equal((await reporter.onEnd({status:'passed'})).status,'failed','skip deve bloquear');
  reporter.onTestEnd(caso('webkit',320,'evento'),{status:'failed'});
  assert.equal((await reporter.onEnd({status:'passed'})).status,'failed','falha deve bloquear');
  reporter.onTestEnd(caso('webkit',320,'evento'),{status:'passed'});
  assert.equal((await reporter.onEnd({status:'passed'})).status,'passed');
  assert.equal((await reporter.onEnd({status:'failed'})).status,'failed','outras falhas não podem ser encobertas');
 }finally{console.error=log;if(ci===undefined)delete process.env.CI;else process.env.CI=ci;}
});
