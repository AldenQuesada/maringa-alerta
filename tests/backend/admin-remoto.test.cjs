'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {criar}=require('../../backend/admin.js');
function fixture(responses=[]){
 const calls=[];
 const client={
  from(table){
   const call={table,steps:[]};calls.push(call);
   const query={then(resolve,reject){return Promise.resolve(responses.shift()||{data:[],count:0}).then(resolve,reject);}};
   for(const method of ['select','eq','ilike','order','range','single'])query[method]=(...args)=>{call.steps.push([method,...args]);return query;};
   return query;
  },
  async rpc(name,args){calls.push({rpc:name,args});return responses.shift()||{data:null};}
 };
 return {service:criar(client),calls};
}
test('listagem global é paginada e não busca JSON completo nem cadastros operacionais',async()=>{
 const f=fixture([{data:[{id:'cidade'}],count:51}]);
 const result=await f.service.listar({uf:'SP',busca:'3550308',pagina:1});
 assert.equal(result.total,51);assert.equal(result.items[0].id,'cidade');
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].table,'ma_prefeituras');
 assert.deepEqual(f.calls[0].steps.find(x=>x[0]==='range'),['range',25,49]);
 assert.deepEqual(f.calls[0].steps.find(x=>x[0]==='ilike'),['ilike','codigo_ibge','%3550308%']);
 assert.doesNotMatch(f.calls[0].steps[0][1],/\*|limite_geojson/);
});
test('busca escapa curingas para não ampliar o conjunto solicitado',async()=>{
 const f=fixture();await f.service.listar({busca:'Nome_100%'});
 assert.deepEqual(f.calls[0].steps.find(x=>x[0]==='ilike'),['ilike','dados->>nome','%Nome\\_100\\%%']);
});
test('edição mantém geometria e usa versão original no RPC canônico',async()=>{
 const original={id:'x',nome:'Cidade',codigo_ibge:'1234567',limite_geojson:'poligono'};
 const f=fixture([{data:{dados:original,versao:4}},{data:null}]);
 const row=await f.service.detalhe('x');await f.service.salvar({...row,status:'suspensa'},row);
 const op=f.calls[1].args.alteracoes[0];assert.equal(f.calls[1].rpc,'ma_aplicar_alteracoes');
 assert.equal(op.versao,4);assert.equal(op.operacao,'atualizar');assert.equal(op.dados.limite_geojson,'poligono');assert.equal(op.dados._versao,undefined);
});
test('falhas de escrita e conflito são propagados sem confirmação falsa',async()=>{
 const f=fixture([{error:{message:'Conflito de versão'}}]);
 await assert.rejects(f.service.salvar({id:'x'},{_versao:2}),/Conflito/);
 await assert.rejects(f.service.salvar({id:'x'},{_versao:2}),/Atualize a página/);
 assert.equal(f.calls.length,1);
});
test('catálogo estadual percorre páginas sem depender do limite de retorno da API',async()=>{
 const f=fixture([{data:Array.from({length:500},(_,i)=>({codigo_ibge:String(i)}))},{data:[{codigo_ibge:'ultimo'}]}]);
 const rows=await f.service.catalogo('SP');assert.equal(rows.length,501);
 assert.deepEqual(f.calls[1].steps.find(x=>x[0]==='range'),['range',500,999]);
});
test('revogação envia papel esperado e mantém o escopo municipal explícito',async()=>{
 const f=fixture();await f.service.definirVinculo({municipio:'x',email:'user@example.invalid',papel:null,anterior:'leitor'});
 assert.deepEqual(f.calls[0],{rpc:'ma_admin_definir_vinculo',args:{municipio:'x',email_usuario:'user@example.invalid',papel_novo:null,papel_esperado:'leitor'}});
});
async function boot(admin){
 const fields=new Map(),elements=[];let municipalLoads=0,adminLoads=0;
 const element=()=>({remove(){},querySelector(key){if(!fields.has(key))fields.set(key,{focus(){}});return fields.get(key);}});
 const ctx={URL,URLSearchParams,location:{href:'http://localhost/plataforma/',search:''},
  document:{currentScript:{dataset:{area:'plataforma'}},createElement:element,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},documentElement:{classList:{add(){},remove(){}}},body:{appendChild(e){elements.push(e);}}},
  MARINGA_SUPABASE:{url:'https://example.invalid',publishableKey:'sb_publishable_fixture'},
  supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{email:'fixture@example.invalid'}}}),onAuthStateChange(){}},rpc:async()=>({data:{admin_plataforma:admin}})})},
  AlertaRepositorioSupabase:{criar(){municipalLoads++;throw Error('Não deve carregar cadastros municipais');}},
  AlertaAdminRemoto:{criar(){adminLoads++;return {};}}
 };
 ctx.window=ctx;
 await vm.runInNewContext(fs.readFileSync(require.resolve('../../backend/boot.js'),'utf8'),ctx);
 return {municipalLoads,adminLoads,fields,ctx};
}
test('guard da rota nega não-admin antes de carregar serviços ou dados',async()=>{
 const f=await boot(false);assert.equal(f.municipalLoads,0);assert.equal(f.adminLoads,0);
 assert.match(f.fields.get('[role=alert]').textContent,/Administração Geral/);assert.equal(f.ctx.AlertaNuvem,undefined);
});
test('administrador global inicia mesmo sem prefeitura ou vínculo municipal',async()=>{
 const f=await boot(true);assert.equal(f.municipalLoads,0);assert.equal(f.adminLoads,1);assert.equal(f.ctx.AlertaNuvem.ativo,true);
});
