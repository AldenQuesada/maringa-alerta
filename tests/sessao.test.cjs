"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {criar}=require("../sessao.js");
function storage(){
 const dados=new Map();
 return {
   getItem:k=>dados.has(k)?dados.get(k):null,
   setItem:(k,v)=>dados.set(k,String(v)),
   removeItem:k=>dados.delete(k)
 };
}
const novo=(municipioId,contasStorage,sessaoStorage)=>criar({municipioId,contasStorage,sessaoStorage});

test("entra como visitante sem abrir um bloqueio de perfil",()=>{
 const app=novo("maringa",storage(),storage());
 assert.equal(app.obterSessao(),null);
 assert.deepEqual(app.listarContas(),[]);
});
test("cadastra conta local e restaura sua sessão na mesma aba",()=>{
 const db=storage(),sessao=storage();
 const app=novo("maringa",db,sessao);
 const entrada=app.cadastrar({nome:"Joana Pessoa",email:"JOANA@EXEMPLO.COM",perfil:{tipo:"responsavel",zona:"Zona 7"}});
 assert.equal(entrada.conta.email,"joana@exemplo.com");
 assert.equal(entrada.conta.perfil.zona,"Zona 7");
 assert.ok(entrada.iniciadaEm);
 assert.equal(novo("maringa",db,sessao).obterSessao().conta.id,entrada.conta.id);
});
test("troca de conta, logout e nova entrada não apagam contas",()=>{
 const db=storage(),ss=storage(),app=novo("maringa",db,ss);
 const primeiro=app.cadastrar({nome:"Joana",email:"joana@example.org",perfil:{tipo:"admin"}}).conta.id;
 const segundo=app.cadastrar({nome:"Carlos",email:"carlos@example.org",perfil:{tipo:"visualizacao"}}).conta.id;
 assert.equal(app.listarContas().length,2);
 app.trocar(primeiro);
 assert.equal(app.obterSessao().conta.perfil.tipo,"admin");
 app.sair();
 assert.equal(app.obterSessao(),null);
 assert.equal(app.listarContas().length,2);
 app.trocar(segundo);
 assert.equal(app.obterSessao().conta.nome,"Carlos");
});
test("contas e sessões são separadas por município",()=>{
 const db=storage(),ss=storage();
 const maringa=novo("maringa",db,ss),outro=novo("exemplo",db,ss);
 const conta=maringa.cadastrar({nome:"Ana",email:"ana@example.org",perfil:{tipo:"visualizacao"}}).conta;
 assert.equal(outro.listarContas().length,0);
 assert.equal(outro.obterSessao(),null);
 assert.throws(()=>outro.trocar(conta.id));
 assert.equal(maringa.obterSessao().conta.id,conta.id);
});
test("não cadastra perfil inválido nem e-mail repetido",()=>{
 const app=novo("maringa",storage(),storage());
 assert.throws(()=>app.cadastrar({nome:"Ana",email:"invalido",perfil:{tipo:"admin"}}));
 assert.throws(()=>app.cadastrar({nome:"Ana",email:"a@b.com",perfil:{tipo:"responsavel"}}));
 app.cadastrar({nome:"Ana",email:"a@b.com",perfil:{tipo:"admin"}});
 assert.throws(()=>app.cadastrar({nome:"Outra",email:"A@B.COM",perfil:{tipo:"admin"}}));
 assert.equal(app.listarContas().length,1);
});
