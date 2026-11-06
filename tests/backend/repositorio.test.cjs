const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../gestao/dados.js');
const R=require('../../backend/repositorio.js');
function fixture({reject=false,pause=false}={}){
 const city={id:'maringa',nome:'Maringá',codigo_ibge:'4115200',uf:'PR',status:'ativa'};
 const calls=[];let release;
 const client={from(table){return {select(){return this},order(){return this},async range(){return {data:table==='ma_prefeituras'?[{dados:city,versao:1}]:[],error:null}}}},async rpc(name,args){if(name==='ma_meu_perfil')return {data:{admin_plataforma:true}};calls.push(args);if(pause)await new Promise(r=>release=r);return reject?{error:{message:'offline'}}:{data:null};}};
 return {client,calls,release:()=>release()};
}
test('escrita só aparece na memória depois de confirmada pelo servidor',async()=>{
 const f=fixture({pause:true}),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 const saving=db.gravar('bases',{nome:'Estrutura de teste exclusivamente local'});
 await new Promise(r=>setImmediate(r));assert.equal(db.lista('bases').length,0);assert.equal(f.calls.length,1);
 f.release();const saved=await saving;assert.equal(db.registro('bases',saved.id).nome,'Estrutura de teste exclusivamente local');
 assert.equal(f.calls[0].alteracoes[0].municipio_id,'maringa');
});
test('falha de rede mantém o cadastro anterior e propaga erro',async()=>{
 const f=fixture({reject:true}),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 await assert.rejects(db.gravar('bases',{nome:'Somente no teste'}),/offline/);assert.deepEqual(db.lista('bases'),[]);
});
test('duas gravações simultâneas são serializadas sem perda',async()=>{
 const f=fixture(),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 await Promise.all([db.gravar('bases',{nome:'Local A'}),db.gravar('bases',{nome:'Local B'})]);assert.equal(db.lista('bases').length,2);
 const item=db.lista('bases')[0];await db.gravar('bases',{...item,nome:'Local C'},item.id);assert.equal(f.calls[2].alteracoes[0].versao,1);
 await db.excluir('bases',item.id);assert.equal(f.calls[3].alteracoes[0].versao,2);
});
test('transação conserva validações e envia um lote único',async()=>{
 const f=fixture(),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 await db.transacao(draft=>{draft.gravar('bases',{nome:'A'});draft.gravar('bases',{nome:'B'});});assert.equal(f.calls.length,1);assert.equal(f.calls[0].alteracoes.length,2);
 await assert.rejects(db.transacao(draft=>{draft.gravar('bases',{nome:'C'});draft.gravar('bases',{nome:''});}),/Preencha/);assert.equal(db.lista('bases').length,2);assert.equal(f.calls.length,1);
});
test('escopo autorizado não recria município demonstrativo',async()=>{
 const f=fixture();f.client.from=table=>({select(){return this},order(){return this},async range(){return {data:table==='ma_prefeituras'?[{dados:{id:'outro',nome:'Outro',codigo_ibge:'0000001',uf:'PR'},versao:1}]:[]}}});
 const remote=await R.criar({client:f.client,dados:D});assert.deepEqual(remote.repositorio().municipios().map(x=>x.id),['outro']);assert.throws(()=>remote.repositorio({municipioId:'maringa'}),/Sem acesso/);
});
test('fontes públicas e colaboradores demonstrativos não são importados no modo conectado',async()=>{
 const importer=require('../../dados-territoriais/importacao-publica.js');let called=false;
 const result=await importer.importar({tipo:'supabase',gravar(){called=true}},{});assert.equal(called,false);assert.equal(result.novos,0);
});
