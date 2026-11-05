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
test("escolha única apresenta botões e múltipla apresenta lista numerada para digitar",()=>{
 const passo=chat.slice(chat.indexOf("function proxima(){"),chat.indexOf("function mostrarRevisao(){"));
 assert.match(passo,/current.kind==="single"/);
 assert.match(passo,/current.opts.forEach\(opt=>button\(opt/);
 assert.match(passo,/current.kind==="multi"/);
 assert.ok(passo.includes('current.opts.map((opcao,i)=>(i+1)+". "'),"lista numerada ausente");
 assert.match(passo,/input.inputMode="text"/);
 assert.match(passo,/form.hidden=false/);
 const ini=chat.indexOf("function responderEtapa(");
 const responder=chat.slice(ini,chat.indexOf("form.onsubmit=responderEtapa;",ini));
 assert.match(responder,/interpretarEscolhaMultipla\(valor,current\)/);
});
test("números são validados e convertidos nas opções originais sem perder as duas categorias novas",()=>{
 const vm=require("node:vm");
 const inicio=chat.indexOf("function interpretarEscolhaMultipla(");
 const fim=chat.indexOf("function proxima(){",inicio);
 assert.ok(inicio>=0&&fim>inicio,"parser numérico ausente");
 const interpretar=vm.runInNewContext(chat.slice(inicio,fim)+"\ninterpretarEscolhaMultipla;");
 const ajuda=Dados.CATALOGOS.ajudas;
 const influencer=ajuda.indexOf("INFLUENCIADORES E DIVULGAÇÃO DE NOTÍCIAS");
 const drone=ajuda.indexOf("OPERADOR DE DRONE");
 assert.ok(influencer>=0&&drone>=0,"novas categorias ausentes do catálogo");
 const pergunta={kind:"multi",required:false,opts:ajuda};
 const entrada=(influencer+1)+", "+(drone+1);
 assert.deepEqual(Array.from(interpretar(entrada,pergunta).opcoes),[ajuda[influencer],ajuda[drone]]);
 assert.deepEqual(Array.from(interpretar("0",pergunta).opcoes),[]);
 assert.deepEqual(Array.from(interpretar("1, 1, 2",pergunta).opcoes),ajuda.slice(0,2));
 assert.deepEqual(Array.from(interpretar("1 e 3",pergunta).opcoes),[ajuda[0],ajuda[2]]);
 for(const valor of ["1, 0","99","-1","palavra","1-3",""])assert.ok(interpretar(valor,pergunta).erro,valor);
 const vulneraveis={kind:"multi",required:true,opts:["CRIANÇA / ADOLESCENTE","PESSOA IDOSA","PCD","NÃO HÁ"],exclusive:"NÃO HÁ"};
 assert.deepEqual(Array.from(interpretar("1, 3",vulneraveis).opcoes),["CRIANÇA / ADOLESCENTE","PCD"]);
 assert.deepEqual(Array.from(interpretar("4",vulneraveis).opcoes),["NÃO HÁ"]);
 assert.ok(interpretar("1, 4",vulneraveis).erro);
 assert.ok(interpretar("0",vulneraveis).erro);
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

test("link do simulador permanece único e recursos mudam versão quando o código muda",()=>{
 const hash=require("node:crypto").createHash;
 const assetVersions={
  "./chat.css":"atendimento/chat.css",
  "../gestao/dados.js":"gestao/dados.js",
  "../crise/core.js":"crise/core.js",
  "./chat.js":"atendimento/chat.js"
 };
 const home=fs.readFileSync(path.join(root,"index.html"),"utf8");
 assert.match(home,/href="\.\/atendimento\/"/,"link canônico do Mapa de Evento");
 for(const [url,arquivo] of Object.entries(assetVersions)){
  const bytes=fs.readFileSync(path.join(root,arquivo));
  const id=hash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex").slice(0,12);
  assert.ok(page.includes('"'+url+"?v="+id+'"'),"arquivo com versão obsoleta: "+arquivo);
 }
 const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
 assert.match(sw,/const simulador = url\.pathname\.includes\("\/atendimento\/"\)/);
 assert.match(sw,/simulador \? \{ cache: "no-store" \}/);
 assert.match(sw,/if \(simulador\) return new Response/,"não redirecionar o chat para o mapa offline");
});
