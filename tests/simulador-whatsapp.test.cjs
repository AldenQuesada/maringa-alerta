"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Dados=require("../gestao/dados.js"),Crise=require("../crise/core.js");
const root=path.resolve(__dirname,"..");
const page=fs.readFileSync(path.join(root,"atendimento/index.html"),"utf8");
const chat=fs.readFileSync(path.join(root,"atendimento/chat.js"),"utf8");
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
test("o cabeçalho identifica Prefeitura Maringá e o perfil Pra Somar, sem avisos no chat",()=>{
 assert.match(page,/<div class="header-title"><strong>Prefeitura Maringá<\/strong><small>@prasomarmga<\/small><\/div>/);
 assert.match(page,/<div class="avatar"><img src="https:\/\/previdencia\.maringa\.pr\.gov\.br\/assets\/images\/logoprefeituranova\.png"/);
 assert.doesNotMatch(page,/Atendimento demonstrativo/);
 assert.doesNotMatch(page,/SIMULAÇÃO · Não envia mensagens reais/);
 assert.doesNotMatch(page,/class="sim-banner"/);
});
test("interface de smartphone inclui reinício e apresentação do Pra Somar",()=>{
 assert.match(page,/class="phone-frame"/);
 assert.match(page,/id="restart-demo"/);
 assert.match(page,/id="go-home"/);
 assert.match(page,/logoprefeituranova\.png/);
 assert.match(chat,/abrirPraSomar\(\)/);
 assert.match(chat,/assets\/pra-somar-original\.webp/);
 assert.ok(fs.existsSync(path.join(root,"assets/pra-somar-original.webp")));
});
test("apresentação do Pra Somar conserva o lema e une empresas, voluntários e entidades",()=>{
 assert.match(chat,/Programa de Apoio Social e Mobilização Voluntária de Maringá/);
 assert.match(chat,/Onde a boa vontade se transforma em ação/);
 assert.match(chat,/Empresas 🤝 Voluntários 🤝 Entidades/);
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
test("Ser colaborador começa pelo nome na mensagem com a foto, sem outra introdução ou e-mail",()=>{
 const vm=require("node:vm");
 const img=chat.slice(chat.indexOf("function abrirPraSomar(){"),chat.indexOf("const BENS=new Set("));
 assert.match(img,/Pra Somar/);
 assert.match(img,/Para começar, digite seu nome e sobrenome 👇/);
 assert.doesNotMatch(img,/nome completo|razão social/i);
 assert.match(img,/start\("colaborador",true\)/);
 assert.doesNotMatch(img,/Continuar cadastro/);
 const inicio=chat.indexOf("function identificarCampos(papel)");
 const fim=chat.indexOf("function zonaPeloEndereco(",inicio);
 assert.ok(inicio>=0&&fim>inicio,"campos de identificação ausentes");
 const campos=vm.runInNewContext("let identity=null;\n"+chat.slice(inicio,fim)+"\nidentificarCampos;")("colaborador");
 assert.deepEqual(Array.from(campos.map(x=>x.key)),["nome","tipo_pessoa","endereco","telefone"]);
 assert.equal(campos.filter(x=>x.required).length,4);
 assert.equal(campos[1].kind,"single");
 assert.deepEqual(Array.from(campos[1].opts),["FÍSICA","JURÍDICA"]);
 const start=chat.slice(chat.indexOf("function start(papel"),chat.indexOf("function gravarResposta("));
 assert.match(start,/if\(papel==="colaborador" && nomeJaPerguntado\)\{proxima\(true\);return;\}/);
 const proxima=chat.slice(chat.indexOf("function proxima("),chat.indexOf("function mostrarRevisao("));
 assert.match(proxima,/if\(!perguntaJaExibida\)msg\(current.q\)/);
 assert.match(proxima,/Você pode escolher mais de uma opção/);
});
test("depois do nome o colaborador recebe agradecimento personalizado e dois botões legíveis",()=>{
 const vm=require("node:vm");
 const inicio=chat.indexOf("function proxima(");
 const fim=chat.indexOf("function mostrarRevisao(){",inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const mensagens=[],botoes=[],respostas=[];
 const ctx={
  steps:[{key:"tipo_pessoa",kind:"single",q:"Como você gostaria de se cadastrar?",opts:["FÍSICA","JURÍDICA"]}],
  index:0,current:null,answers:{nome:"Maria Silva"},role:"colaborador",
  clear:()=>{},msg:texto=>mensagens.push(texto),
  button:(texto,fn)=>botoes.push({texto,fn}),
  gravarResposta:(valor,exibicao)=>respostas.push({valor,exibicao}),
  form:{hidden:true},input:{},photoPreview:{},uploadArea:{},
  $:()=>({hidden:true}),history:{scrollTop:0,scrollHeight:0},arquivosFoto:null,
  mostrarRevisao:()=>{throw Error("Não deveria encerrar cadastro antes da escolha.");}
 };
 const proxima=vm.runInNewContext(chat.slice(inicio,fim)+"\nproxima;",ctx);
 proxima();
 assert.doesNotMatch(chat,/Você é pessoa física ou jurídica\?/,"pergunta antiga não pode reaparecer no bundle");
 assert.equal(mensagens.length,1);
 assert.equal(mensagens[0],"Muito obrigado, Maria Silva! Como você gostaria de se cadastrar?\n\n◾ Pessoa física\n◾ Pessoa jurídica\n\nToque em uma das opções abaixo. 👇");
 assert.deepEqual(botoes.map(b=>b.texto),["Pessoa física","Pessoa jurídica"]);
 botoes[0].fn();botoes[1].fn();
 assert.deepEqual(respostas.map(r=>r.valor),["FÍSICA","JURÍDICA"]);
 assert.deepEqual(respostas.map(r=>r.exibicao),["Pessoa física","Pessoa jurídica"]);
});
test("colaborador informa endereço no padrão brasileiro com exemplo e sem nova etapa",()=>{
 const vm=require("node:vm");
 const inicio=chat.indexOf("function identificarCampos(papel){");
 const fim=chat.indexOf("function zonaPeloEndereco(",inicio);
 const identificar=vm.runInNewContext("let identity=null;\n"+chat.slice(inicio,fim)+"\nidentificarCampos;");
 const campos=identificar("colaborador");
 assert.deepEqual(Array.from(campos.map(x=>x.key)),["nome","tipo_pessoa","endereco","telefone"]);
 const endereco=campos.find(c=>c.key==="endereco");
 assert.equal(endereco.kind,"text");
 assert.equal(endereco.required,true);
 assert.match(endereco.q,/Informe seu endereço seguindo este formato:/);
 assert.match(endereco.q,/Rua ou avenida, número, complemento \(se houver\), bairro, cidade\/UF e CEP \(se souber\)/);
 assert.match(endereco.q,/Av\. XV de Novembro, 701, Centro, Maringá\/PR, 87013-230/);
 assert.match(endereco.q,/Se não houver número, escreva s\/n/);
 assert.equal(identificar("solicitacao").find(x=>x.key==="endereco").q,"Qual é o endereço onde você precisa de ajuda?");
 assert.equal(identificar("relato").some(x=>x.key==="endereco"),false);
});
test("o formulário não exige que o cidadão conheça a zona",()=>{
 const inicio=chat.indexOf("function definirSteps(papel)");
 const fim=chat.indexOf("function start(papel",inicio);
 const codigo=chat.slice(inicio,fim);
 assert.ok(inicio>0&&fim>inicio);
 assert.doesNotMatch(codigo, /key:"zona"/);
 assert.match(chat,/function zonaPeloEndereco\(/);
});
test("escolha única apresenta botões e múltipla apresenta lista numerada para digitar",()=>{
 const passo=chat.slice(chat.indexOf("function proxima("),chat.indexOf("function mostrarRevisao(){"));
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
 const fim=chat.indexOf("function proxima(",inicio);
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


test("cadastro de colaborador segue somente campos e ordem do formulário aprovado",()=>{
 const vm=require("node:vm");
 const inicio=chat.indexOf("function definirSteps(papel){");
 const fim=chat.indexOf("function start(papel",inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const trecho=chat.slice(inicio,fim);
 const preparar=[
  "const catalogos="+JSON.stringify(Dados.CATALOGOS)+";",
  'const BENS=new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);',
  'const ofereceBens=a=>["ajudas","maquinas","materiais"].some(k=>(a[k]||[]).some(x=>BENS.has(x)));',
  'const identificarCampos=()=>[{key:"nome",kind:"text",required:true},{key:"tipo_pessoa",kind:"single",required:true,opts:["FÍSICA","JURÍDICA"]},{key:"endereco",kind:"text",required:true},{key:"telefone",kind:"tel",required:true}];',
  trecho,
  "definirSteps;"
 ].join("\n");
 const definirSteps=vm.runInNewContext(preparar);
 const fluxo=definirSteps("colaborador");
 assert.deepEqual(Array.from(fluxo.map(s=>s.key)),[
  "nome","tipo_pessoa","endereco","telefone",
  "ajudas","maquinas","empreendedores","outros","materiais","forma_entrega_doacao",
  "ponto_publico","ponto_tipo","ponto_nome","ponto_responsavel","ponto_endereco","ponto_telefone","ponto_funcao","ponto_horario","ponto_capacidade"
 ]);
 assert.equal(fluxo.length,19);
 assert.equal(fluxo.find(s=>s.key==="ponto_nome").quando({ponto_publico:"Não"}),false);
 assert.equal(fluxo.find(s=>s.key==="ponto_nome").quando({ponto_publico:"Sim, cadastrar ponto público"}),true);
 assert.equal(fluxo.some(s=>s.key==="email"||s.key==="disponibilidade"||s.key==="zona"),false);
 assert.equal(fluxo.find(s=>s.key==="tipo_pessoa").kind,"single");
 for(const grupo of ["ajudas","maquinas","empreendedores","materiais"])assert.equal(fluxo.find(s=>s.key===grupo).kind,"multi");
 const ajudas=Array.from(fluxo.find(s=>s.key==="ajudas").opts);
 assert.deepEqual(ajudas,[
  "FORNECER ALIMENTAÇÃO","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS","CUIDADOR","LIMPEZA",
  "PEDREIRO","METALÚRGICO","CARPINTEIRO","OPERADOR DE MOTOSSERRA","ELETRICISTA",
  "LAUDO","EMITIR LAUDOS DE PREJUÍZOS","OUTRO",
  "INFLUENCIADORES E DIVULGAÇÃO DE NOTÍCIAS","OPERADOR DE DRONE"
 ]);
 assert.equal(fluxo.find(s=>s.key==="maquinas").opts.length,13);
 assert.deepEqual(Array.from(fluxo.find(s=>s.key==="empreendedores").opts),[
  "ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO","OUTRO"
 ]);
 assert.deepEqual(Array.from(fluxo.find(s=>s.key==="materiais").opts),["MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);
 const outros=fluxo.find(s=>s.key==="outros");
 assert.equal(outros.required,true);
 assert.equal(outros.quando({ajudas:["OUTRO"],maquinas:[],empreendedores:[]}),true);
 assert.equal(outros.quando({ajudas:[],maquinas:["OUTRO"],empreendedores:[]}),true);
 assert.equal(outros.quando({ajudas:[],maquinas:[],empreendedores:["OUTRO"]}),true);
 assert.equal(outros.quando({ajudas:[],maquinas:[],empreendedores:[]}),false);
 const entrega=fluxo.find(s=>s.key==="forma_entrega_doacao");
 assert.equal(entrega.kind,"single");
 assert.deepEqual(Array.from(entrega.opts),[
  "Preciso que retirem no meu endereço",
  "Consigo entregar no centro de acolhimento mais próximo"
 ]);
 assert.equal(entrega.quando({ajudas:["FORNECER ALIMENTAÇÃO"]}),true);
 assert.equal(entrega.quando({maquinas:["MATERIAL DE CONSTRUÇÃO"]}),true);
 assert.equal(entrega.quando({materiais:["COMBUSTÍVEL"]}),true);
 assert.equal(entrega.quando({ajudas:["OPERADOR DE DRONE"],maquinas:[],materiais:[]}),false);
 assert.doesNotMatch(trecho,/outros_ajudas|outros_maquinas|outros_empreendedores/);
});
test("resumo de colaborador permite confirmar ou corrigir sem terceira etapa",()=>{
 const inicio=chat.indexOf("function mostrarRevisao(){");
 const fim=chat.indexOf("function responderEtapa(",inicio);
 const revisao=chat.slice(inicio,fim);
 assert.ok(revisao.includes('outros:"Especificar outros"'));
 assert.ok(revisao.includes('if(role==="relato")acoes.push('));
 const conclusao=chat.slice(chat.indexOf('if(role==="colaborador"){',fim),chat.indexOf('}else if(role==="solicitacao"){',fim));
 assert.match(conclusao,/const outros=String\(answers\.outros\|\|""\)\.trim\(\)/);
 assert.match(conclusao,/new Set\(\[resultado\.ajudas/);
 assert.doesNotMatch(conclusao,/answers\.outros_ajudas|answers\.outros_maquinas/);
});

test("Preciso de ajuda usa só nome, endereço, telefone e relato da necessidade",()=>{
 const vm=require("node:vm");
 const a=chat.indexOf("function identificarCampos(papel){");
 const b=chat.indexOf("function zonaPeloEndereco(",a);
 const c=chat.indexOf("function definirSteps(papel){");
 const d=chat.indexOf("function start(papel",c);
 assert.ok(a>=0&&b>a&&c>b&&d>c);
 const definirSteps=vm.runInNewContext("let identity=null;\n"+chat.slice(a,b)+chat.slice(c,d)+"\ndefinirSteps;");
 const passos=definirSteps("solicitacao");
 assert.deepEqual(Array.from(passos.map(x=>x.key)),["nome","endereco","telefone","descricao"]);
 assert.ok(passos.every(x=>x.kind==="text"||x.kind==="tel"));
 assert.ok(passos.every(x=>x.required));
 assert.doesNotMatch(chat.slice(c,d),/key:"urgencia"|key:"modo_recebimento"/);
 const inicio=chat.slice(chat.indexOf("function start(papel"),chat.indexOf("function gravarResposta("));
 assert.match(inicio,/if\(papel==="solicitacao"\)\{proxima\(\);return;\}/,"a primeira mensagem já pergunta o nome");
 const conclusao=chat.slice(chat.indexOf('}else if(role==="solicitacao"){'),chat.indexOf('}else if(role==="relato"){'));
 assert.match(conclusao,/necessidade:"Outro",descricao:String\(answers\.descricao\|\|""\)\.trim\(\)/);
 assert.match(conclusao,/urgencia:"Não avaliada"/);
 assert.doesNotMatch(conclusao,/Você pode consultar a situação neste simulador/);
});


test("reiniciar demonstração preserva colaboradores, pedidos e relatos na base municipal",()=>{
 assert.match(chat,/MaringaCrise\.criar\(\{municipioId:"maringa",escopoMunicipal:true\}\)/,
  "a rota da Prefeitura Maringá não pode usar município de outra sessão");
 assert.doesNotMatch(chat,/sessionStorage\.getItem\("alerta_contexto_municipal_demo_v1"\)/);
 const inicio=chat.indexOf("function reiniciarDemonstracao(){");
 const fim=chat.indexOf('$("go-home").onclick=',inicio);
 assert.ok(inicio>=0&&fim>inicio);
 const reset=chat.slice(inicio,fim);
 assert.match(reset,/Os cadastros, pedidos e relatos já registrados serão preservados/);
 assert.doesNotMatch(reset,/dados\.excluir|dados\.gravar|registrarMudanca|rastreio\(|guardarRastreio/);
 assert.doesNotMatch(chat,/registrarMudanca\("voluntarios"|registrarMudanca\("solicitacoes"|registrarMudanca\("relatos"/);
 assert.match(page,/Reiniciar a conversa não apaga cadastros, pedidos ou relatos/);
});
