const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('zonas numeradas usam polígonos estaduais e preservam partes repetidas',async()=>{
 const root=process.cwd();
 const context={URL,location:{href:'http://localhost/'},document:{currentScript:{src:'http://localhost/dados-territoriais/camadas-mapas.js'}},fetch:async url=>{
  const file=root+'/dados-territoriais/'+new URL(url).pathname.split('/').pop();
  return fs.existsSync(file)?{ok:true,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))}:{ok:false};
 }};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('dados-territoriais/camadas-mapas.js','utf8'),context);
 const data=await context.MaringaBairros.carregar();
 assert.equal(data.zonasNumeradas.count,46);
 assert.equal(data.zonasNumeradas.features.find(f=>f.properties.nome==='Zona 38').geometry.coordinates.length,2);
 assert.ok(data.zonasNumeradas.features.some(f=>f.properties.nome==='Zona 7'));
 assert.ok(!data.zonasNumeradas.features.some(f=>f.properties.nome==='Zona 16'));
 assert.ok(!data.zonasNumeradas.features.some(f=>f.properties.nome==='Zona 32'));
});
