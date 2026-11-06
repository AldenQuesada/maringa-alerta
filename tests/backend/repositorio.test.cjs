const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../gestao/dados.js');
const R=require('../../backend/repositorio.js');
function fixture({reject=false,pause=false}={}){
 const city={id:'maringa',nome:'Maringá',codigo_ibge:'4115200',uf:'PR',status:'ativa'};
 const calls=[];let release;
 const client={from(table){return {select(){return this},eq(){return this},order(){return this},async range(){return {data:table==='ma_prefeituras'?[{dados:city,versao:1}]:[],error:null}}}},async rpc(name,args){if(name==='ma_meu_perfil')return {data:{admin_plataforma:true}};calls.push(args);if(pause)await new Promise(r=>release=r);return reject?{error:{message:'offline'}}:{data:null};}};
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
test('resposta perdida bloqueia novas gravações em todos os escopos até recarregar',async()=>{
 const f=fixture({pause:true,reject:true}),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 const first=assert.rejects(db.gravar('bases',{nome:'Somente no teste'}),/Atualize a página/);
 const second=assert.rejects(remote.repositorio().gravar('bases',{nome:'Tentativa repetida'}),/Atualize a página/);
 await new Promise(r=>setImmediate(r));f.release();await Promise.all([first,second]);
 assert.equal(f.calls.length,1);assert.deepEqual(db.lista('bases'),[]);
});
test('duas gravações simultâneas são serializadas sem perda',async()=>{
 const f=fixture(),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 await Promise.all([db.gravar('bases',{nome:'Local A'}),db.gravar('bases',{nome:'Local B'})]);assert.equal(db.lista('bases').length,2);
 const item=db.lista('bases')[0];await db.gravar('bases',{...item,nome:'Local C'},item.id);assert.equal(f.calls[2].alteracoes[0].versao,1);
 await db.excluir('bases',item.id);assert.equal(f.calls[3].alteracoes[0].versao,2);
});
test('cache das leituras preserva isolamento e invalida após gravação confirmada',async()=>{
 const f=fixture(),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 const other=remote.repositorio({municipioId:'maringa'});assert.equal(other.lista('bases').length,0);
 const saved=await db.gravar('bases',{nome:'Local confirmado'});const rows=other.lista('bases');rows[0].nome='Alteração fora da transação';
 assert.equal(db.registro('bases',saved.id).nome,'Local confirmado');assert.equal(other.lista('bases')[0].nome,'Local confirmado');
 await db.excluir('bases',saved.id);assert.equal(other.lista('bases').length,0);
});
test('transação conserva validações e envia um lote único',async()=>{
 const f=fixture(),remote=await R.criar({client:f.client,dados:D}),db=remote.repositorio({municipioId:'maringa'});
 await db.transacao(draft=>{draft.gravar('bases',{nome:'A'});draft.gravar('bases',{nome:'B'});});assert.equal(f.calls.length,1);assert.equal(f.calls[0].alteracoes.length,2);
 await assert.rejects(db.transacao(draft=>{draft.gravar('bases',{nome:'C'});draft.gravar('bases',{nome:''});}),/Preencha/);assert.equal(db.lista('bases').length,2);assert.equal(f.calls.length,1);
 await db.gravar('bases',{nome:'D'});assert.equal(f.calls.length,2);
});
test('escopo autorizado não recria município demonstrativo',async()=>{
 const f=fixture();f.client.from=table=>({select(){return this},eq(){return this},order(){return this},async range(){return {data:table==='ma_prefeituras'?[{dados:{id:'outro',nome:'Outro',codigo_ibge:'0000001',uf:'PR'},versao:1}]:[]}}});
 const remote=await R.criar({client:f.client,dados:D});assert.deepEqual(remote.repositorio().municipios().map(x=>x.id),['outro']);assert.throws(()=>remote.repositorio({municipioId:'maringa'}),/Sem acesso/);
});
test('fontes públicas e colaboradores demonstrativos não são importados no modo conectado',async()=>{
 const importer=require('../../dados-territoriais/importacao-publica.js');let called=false;
 const result=await importer.importar({tipo:'supabase',gravar(){called=true}},{});assert.equal(called,false);assert.equal(result.novos,0);
});
test('carrega registros apenas da prefeitura selecionada e recusa mudança sem recarga',async()=>{
 const queries=[];
 const cities=['a','b'].map(id=>({dados:{id,nome:id,codigo_ibge:id==='a'?'3500105':'3550308',uf:'SP'},versao:1}));
 const client={from(table){let filter;return {select(){return this},order(){return this},eq(field,value){filter={field,value};return this},async range(){queries.push({table,filter});return {data:table==='ma_prefeituras'?cities.filter(c=>!filter||c.dados.id===filter.value):[]}}}},rpc:async()=>({data:{admin_plataforma:true}})};
 const remote=await R.criar({client,dados:D,municipioId:'b'});
 assert.deepEqual(queries.find(q=>q.table==='ma_cadastros').filter,{field:'municipio_id',value:'b'});
 assert.equal(remote.repositorio().municipioAtivo().id,'b');
 assert.throws(()=>remote.repositorio({municipioId:'a'}),/Sem acesso/);
 assert.throws(()=>remote.repositorio().selecionarMunicipio('a'),/nova sessão/);
});
