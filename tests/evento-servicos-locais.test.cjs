const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
function contexto(){const scope={crypto,TextEncoder,Uint8Array};vm.createContext(scope);for(const file of ['auditoria-local','fila-local'])vm.runInContext(fs.readFileSync('src/evento/'+file+'.js','utf8'),scope);return scope;}
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}
test('auditoria local serializa ações simultâneas e detecta adulteração',async()=>{
 const ctx=contexto(),store=storage();const audit=ctx.AlertaEventoAuditoriaLocal.criar({armazenamento:store,chave:'teste-a',habilitado:true,agora:()=>10});
 await Promise.all([audit.adicionar('a','criar','A'),audit.adicionar('a','editar','B')]);
 const rows=audit.listar();assert.equal(rows.length,2);assert.equal(rows[1].prev,rows[0].hash);assert.equal((await audit.verificar()).ok,true);
 rows[0].detalhe='não altera o serviço';assert.equal((await audit.verificar()).ok,true);
 audit.simularAdulteracao();assert.equal((await audit.verificar()).ok,false);
});
test('modo conectado não lê nem grava trilha ou fila demonstrativas',async()=>{
 const ctx=contexto(),store={getItem(){throw Error('leitura indevida')},setItem(){throw Error('escrita indevida')}};
 const audit=ctx.AlertaEventoAuditoriaLocal.criar({armazenamento:store,chave:'x',habilitado:false});
 await audit.adicionar('a','criar','X');assert.equal(audit.listar().length,0);assert.equal(audit.simularAdulteracao(),false);
 const fila=ctx.AlertaEventoFilaLocal.criar({armazenamento:store,chave:'x',habilitado:false});
 assert.throws(()=>fila.enfileirar('chat',{}),/indisponível/);assert.equal(fila.processar(()=>true),0);
});
test('fila preserva operações não consumidas e isola municípios pela chave',()=>{
 const ctx=contexto(),store=storage();let id=0;
 const a=ctx.AlertaEventoFilaLocal.criar({armazenamento:store,chave:'a',habilitado:true,uuid:()=>String(++id)});
 const b=ctx.AlertaEventoFilaLocal.criar({armazenamento:store,chave:'b',habilitado:true});
 a.enfileirar('chat',{texto:'teste'});a.enfileirar('pendente',{});
 assert.equal(b.processar(()=>true),0);assert.equal(a.processar(item=>item.tipo==='chat'),1);
 const reload=ctx.AlertaEventoFilaLocal.criar({armazenamento:store,chave:'a',habilitado:true});
 assert.equal(reload.processar(()=>true),1);assert.equal(reload.processar(()=>true),0);
});
