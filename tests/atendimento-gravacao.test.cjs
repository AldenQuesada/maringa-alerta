const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const Dados=require('../gestao/dados.js');
function pendente(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function service(args){const ctx={};vm.runInNewContext(fs.readFileSync('src/atendimento/registro.js','utf8'),ctx);return ctx.AlertaAtendimentoRegistro.criar(args);}
test('registro aguarda persistência assíncrona e só confirma a identidade salva',async()=>{
 const hold=pendente();let payload;
 const app={registrarColaborador:input=>{payload=input;return hold.promise;}};
 const registro=service({app,dados:{tipo:'supabase'},zonaPeloEndereco:()=> 'Zona Norte'});
 const answers={nome:'Pessoa',telefone:'92999990000',endereco:'Rua fixture',outros:' teste '};
 let complete=false;const request=registro.concluir({papel:'colaborador',respostas:answers}).then(result=>{complete=true;return result;});
 await Promise.resolve();assert.equal(complete,false);assert.equal(payload.zona,'Zona Norte');assert.equal(answers.zona,undefined);
 hold.resolve({...payload,id:'fixture-id',ajudas:['CUIDADOR']});
 const result=await request;assert.equal(result.identidade.nome,'Pessoa');assert.match(result.mensagem,/no sistema municipal/);assert.doesNotMatch(result.mensagem,/undefined/);
});
test('falha de gravação não retorna sucesso; relato preserva o fluxo de triagem',async()=>{
 const registro=service({app:{registrarPedido:async()=>{throw Error('sem permissão');}},dados:{},zonaPeloEndereco:()=>''});
 await assert.rejects(registro.concluir({papel:'solicitacao',respostas:{descricao:'Pedido'}}),/sem permissão/);
 let tipo,payload;
 const relatos=service({app:{},dados:{gravar:async(t,p)=>{tipo=t;payload=p;return {...p,id:'relato-fixture'};}},zonaPeloEndereco:()=>''});
 const result=await relatos.concluir({papel:'relato',respostas:{nome:'Pessoa',endereco_ocorrencia:'Rua',pessoas_no_local:['PCD']},foto:{nome:'fixture.jpg',dados:'data:image/jpeg;base64,AA=='}});
 assert.equal(tipo,'relatos');assert.equal(payload.status,'Em triagem');assert.equal(payload.foto_nome,'fixture.jpg');assert.match(result.mensagem,/triagem/);
});
test('DOM do atendimento impede confirmação dupla e preserva respostas após erro',async()=>{
 const {document,HTMLElement}=parseHTML(fs.readFileSync('atendimento/index.html','utf8'));
 HTMLElement.prototype.focus=function(){};
 const hold=pendente();let writes=0;
 const cidade={id:'manaus',nome:'Manaus',uf:'AM',codigo_ibge:'1302603'};
 const db={tipo:'supabase',municipioAtivo:()=>cidade,municipios:()=>[cidade],lista:()=>[]};
 const app={db,prefeitura:()=>cidade,registrarPedido:()=>{writes++;return hold.promise;}};
 const ctx={document,AlertaGestaoDados:{...Dados,criar:()=>db},MaringaCrise:{criar:()=>app,telefone:x=>x.replace(/\D/g,'')},sessionStorage:{getItem:()=>null},URL,Image:class{},setTimeout,clearTimeout,confirm:()=>true};ctx.window=ctx;
 vm.runInNewContext(fs.readFileSync('atendimento/chat.js','utf8'),ctx);
 const buttons=()=>Array.from(document.querySelectorAll('#options button'));
 buttons().find(x=>x.textContent==='Preciso de ajuda').onclick();
 for(const value of ['Pessoa','Rua fixture','92999990000','Preciso de telhas']){
  document.getElementById('reply').value=value;document.getElementById('reply-form').onsubmit({preventDefault(){}});
 }
 const confirm=buttons().find(x=>x.textContent.includes('Confirmar'));
 assert.ok(confirm);confirm.onclick();confirm.onclick();
 assert.equal(writes,1);assert.equal(buttons().length,0);assert.doesNotMatch(document.getElementById('history').textContent,/pedido de ajuda foi registrado/);
 hold.reject(Error('sem permissão'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(document.getElementById('history').textContent,/Não foi possível salvar: sem permissão/);
 buttons().find(x=>x.textContent==='Revisar respostas').onclick();
 assert.match(document.getElementById('history').textContent,/Preciso de telhas/);
 assert.ok(buttons().some(x=>x.textContent.includes('Confirmar')));
});
