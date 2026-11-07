const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
async function boot({missingRules=false}={}){
 const calls=[],fields=new Map(),storage=new Map([['alerta_contexto_municipal_demo_v1','cidade-antiga']]);
 const node=()=>({remove(){},querySelector(key){if(!fields.has(key))fields.set(key,{focus(){}});return fields.get(key);}});
 const db={municipioAtivo:()=>({id:'cidade-pedida'}),pode:()=>false};
 const ctx={URL,URLSearchParams,Event,location:{href:'http://localhost/gestao/?municipio=cidade-pedida',search:'?municipio=cidade-pedida',hash:''},
 document:{currentScript:{src:'http://localhost/backend/boot.js',dataset:{area:'gestao'}},createElement:node,head:{appendChild(script){script.onload();}},body:{appendChild(){}},querySelectorAll:()=>[],getElementById:()=>null,documentElement:{classList:{add(){},remove(){}}}},
 sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},MutationObserver:class{},addEventListener(){},
 MARINGA_SUPABASE:{url:'https://fixture.invalid',publishableKey:'sb_publishable_fixture'},
 supabase:{createClient:()=>({
  auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{email:'fixture@example.invalid'}}}),onAuthStateChange(){}},
  from(table){return {
   select(){return this;},
   eq(field,id){calls.push(['config',table,id]);this.id=id;return this;},
   async single(){return missingRules&&this.id==='operacao'?{error:{message:'ausente'}}:{data:{documento:{origem:this.id}}};}
  };}
 })},
 AlertaGestaoDados:{aplicarConfiguracao(value){calls.push(['schema',value.origem]);}},
 AlertaRepositorioSupabase:{async criar(options){calls.push(['repository',options.municipioId]);return {repositorio(options){if(options)calls.push(['scope',options.municipioId]);return db;},atualizarPermissoes:async()=>false};}},
 AlertaPermissoesUI:{instalar({db}){calls.push(['controls',db.pode('bases','gravar')]);}}
 };
 ctx.window=ctx;
 await vm.runInNewContext(fs.readFileSync(require.resolve('../../backend/boot.js'),'utf8'),ctx);
 return {calls,fields,storage,ctx};
}
test('boot integrado aplica regras, escolhe município da URL e instala controles do servidor',async()=>{
 const result=await boot();
 assert.deepEqual(result.calls,[['config','ma_configuracao','interface'],['schema','interface'],['config','ma_configuracao','operacao'],['repository','cidade-pedida'],['scope','cidade-pedida'],['controls',false]]);
 assert.equal(result.storage.get('alerta_contexto_municipal_demo_v1'),'cidade-pedida');assert.equal(result.ctx.AlertaNuvem.ativo,true);
});
test('boot integrado não carrega cadastros nem controladores quando faltam regras',async()=>{
 const result=await boot({missingRules:true});
 assert.equal(result.calls.some(x=>x[0]==='repository'),false);
 assert.equal(result.ctx.AlertaNuvem,undefined);assert.match(result.fields.get('[role=alert]').textContent,/Regras operacionais/);
});
