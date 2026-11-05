"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Dados=require("../gestao/dados.js"),Crise=require("../crise/core.js");
const root=path.resolve(__dirname,"..");
const page=fs.readFileSync(path.join(root,"atendimento/index.html"),"utf8");
const chat=fs.readFileSync(path.join(root,"atendimento/chat.js"),"utf8");
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
test("interface de smartphone inclui reinício e apresentação do Pra Somar",()=>{
 assert.match(page,/class="phone-frame"/);
 assert.match(page,/id="restart-demo"/);
 assert.match(page,/id="go-home"/);
 assert.match(page,/logoprefeituranova\.png/);
 assert.match(chat,/abrirPraSomar\(\)/);
 assert.match(chat,/assets\/pra-somar-original\.webp/);
 assert.ok(fs.existsSync(path.join(root,"assets/pra-somar-original.webp")));
});
test("a entrada cidadã oferece exatamente três fluxos canônicos",()=>{
 const menu=chat.match(/function startMenu\(\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(menu,"menu inicial ausente");
 const acoes=[...menu.matchAll(/\["([^"]+)",\(\)=>/g)].map(m=>m[1]);
 assert.deepEqual(acoes,["Ser colaborador","Relatar ocorrência","Preciso de ajuda"]);
 assert.doesNotMatch(menu,/Consultar cadastro|Cheguei|Terminei|protocolo/i);
 assert.match(menu,/identity=null/,"novo atendimento não deve reaproveitar a pessoa anterior");
 assert.match(chat,/function abrirPraSomar\(\)/);
 assert.match(chat,/src:"\.\.\/assets\/pra-somar-original\.webp"/);
 assert.match(chat,/function reiniciarDemonstracao\(/);
 assert.match(chat,/function mostrarRevisao\(/);
 assert.match(chat,/function prepararFoto\(/);
 assert.doesNotMatch(chat,/function consultarCadastro\(|function iniciarFase\(|function escolherFase\(/);
});
test("o formulário não exige que o cidadão conheça a zona",()=>{
 const inicio=chat.indexOf("function definirSteps(papel)");
 const fim=chat.indexOf("function start(papel)",inicio);
 const codigo=chat.slice(inicio,fim);
 assert.ok(inicio>0&&fim>inicio);
 assert.doesNotMatch(codigo, /key:"zona"/);
 assert.match(chat,/function zonaPeloEndereco\(/);
});
test("ofertas, email e logística são armazenados sem duplicar colaborador",()=>{
 const core=Crise.criar({armazenamento:storage(),municipioId:"maringa",escopoMunicipal:true});
 const dados={nome:"Teste Fictício",tipo_pessoa:"FÍSICA",endereco:"Rua Teste",telefone:"44999990090",email:"demo@example.org",zona:"Zona 7",ajudas:["FORNECER ALIMENTAÇÃO","OPERADOR DE DRONE"],forma_entrega_doacao:"Preciso que retirem no meu endereço"};
 const a=core.registrarColaborador(dados);const b=core.registrarColaborador({...dados,telefone:"(44) 99999-0090"});
 assert.equal(a.id,b.id);assert.equal(core.oferentes().length,1);
 assert.equal(b.email,"demo@example.org");assert.ok(b.ajudas.includes("OPERADOR DE DRONE"));
 assert.match(b.forma_entrega_doacao,/retirem/);
});
test("pedido de ajuda preserva modo de recebimento",()=>{
 const core=Crise.criar({armazenamento:storage(),municipioId:"maringa",escopoMunicipal:true});
 const r=core.registrarPedido({nome:"Pessoa Fictícia",tipo_pessoa:"FÍSICA",endereco:"Rua Teste",telefone:"44999990091",necessidade:"Alimentação",modo_recebimento:"Preciso receber no endereço informado",urgencia:"Normal"});
 assert.equal(r.pedido.modo_recebimento,"Preciso receber no endereço informado");
});
test("relatos de cidadão entram na coleção de triagem, não criam ocorrência confirmada",()=>{
 const db=Dados.criar(storage(),{municipioId:"maringa"});
 const relato=db.gravar("relatos",{nome:"Pessoa Fictícia",telefone:"44999990092",endereco:"Rua Teste, 100",pessoas_no_local:["PESSOA IDOSA","PCD"],descricao:"Árvore caída",status:"Em triagem",foto_nome:"foto.jpg",foto:"data:image/jpeg;base64,AA=="});
 assert.equal(db.lista("relatos").length,1);
 assert.equal(db.lista("relatos")[0].status,"Em triagem");
 assert.deepEqual(relato.pessoas_no_local,["PESSOA IDOSA","PCD"]);
 assert.equal(db.lista("ocorrencias").length,0);
 assert.equal(db.excluir("relatos",relato.id),true);
 assert.equal(db.lista("relatos").length,0);
});
