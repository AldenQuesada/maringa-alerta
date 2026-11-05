"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Dados=require("../../gestao/dados.js");
const Crise=require("../core.js");
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const novo=()=>{const memoria=storage();return {core:Crise.criar({armazenamento:memoria}),memoria};};
const pessoa=(n,tel,extra={})=>({nome:n,tipo_pessoa:"FÍSICA",endereco:"Rua fictícia",telefone:tel,zona:"Zona 7",...extra});
test("três mapas conceituais: Maringá possui zonas e o mapa original permanece em index.html",()=>{
 const {core}=novo();assert.equal(core.prefeitura().nome,"Maringá");
 assert.equal(core.pontoDaZona("Zona 7"),null,"Sem limites verificados não pode criar ponto fictício");
 core.db.gravar("zonas",{nome:"Zona 7",tipo:"Zona numerada",geojson:JSON.stringify({type:"Polygon",coordinates:[[[-51.94,-23.40],[-51.93,-23.40],[-51.93,-23.39],[-51.94,-23.40]]]})});
 assert.ok(core.zonas().includes("Zona 7"));
 assert.ok(core.pontoDaZona("Zona 7").lat<0);
});
test("cadastro PF exige quatro campos básicos",()=>{
 const {core}=novo();assert.throws(()=>core.registrarColaborador({nome:"Teste",tipo_pessoa:"FÍSICA",telefone:"44999990000"}),/endereço/i);
 assert.throws(()=>core.registrarColaborador(pessoa("Teste","123")) ,/telefone/i);
});
test("cadastro PF com múltiplas ajudas e maquinário",()=>{
 const {core}=novo();
 const p=core.registrarColaborador(pessoa("Ana Teste","44999990001",{ajudas:["FORNECER ALIMENTAÇÃO","LIMPEZA"],maquinas:["MOTOSSERRA COM OPERADOR"]}));
 assert.deepEqual(p.ajudas,["FORNECER ALIMENTAÇÃO","LIMPEZA"]);assert.equal(p.maquinas[0],"MOTOSSERRA COM OPERADOR");
});
test("novas capacidades e logística preservam o cadastro de colaborador único",()=>{
 const {core}=novo();
 assert.ok(Dados.CATALOGOS.ajudas.includes("INFLUENCIADORES E DIVULGAÇÃO DE NOTÍCIAS"));
 assert.ok(Dados.CATALOGOS.ajudas.includes("OPERADOR DE DRONE"));
 const registrado=core.registrarColaborador(pessoa("Apoiador","44999990189",{
  ajudas:["INFLUENCIADORES E DIVULGAÇÃO DE NOTÍCIAS","OPERADOR DE DRONE","FORNECER ALIMENTAÇÃO"],
  forma_entrega_doacao:"Consigo entregar no centro de acolhimento/coleta mais próximo"
 }));
 assert.equal(registrado.forma_entrega_doacao,"Consigo entregar no centro de acolhimento/coleta mais próximo");
 assert.ok(core.oferentes()[0].ajudas.includes("OPERADOR DE DRONE"));
 assert.equal(core.oferentes().length,1);
});
test("cadastro PJ com apoio a empreendedores",()=>{
 const {core}=novo();
 const p=core.registrarColaborador(pessoa("Empresa Teste","44999990002",{tipo_pessoa:"JURÍDICA",empreendedores:["ESPAÇO EM FREEZER PARA PERECÍVEIS"],maquinas:["MATERIAL DE CONSTRUÇÃO"]}));
 assert.equal(p.tipo_pessoa,"JURÍDICA");assert.ok(p.empreendedores.includes("ESPAÇO EM FREEZER PARA PERECÍVEIS"));
});
test("cadastro no mesmo telefone atualiza sem duplicar a identidade de colaborador",()=>{
 const {core}=novo();const x=core.registrarColaborador(pessoa("Ana Teste","44999990003"));
 const y=core.registrarColaborador(pessoa("Ana Teste","(44) 99999-0003"));
 assert.equal(x.id,y.id);assert.equal(core.oferentes().length,1);
});
test("a mesma pessoa pode pedir ajuda sem ser designada para atender a si própria",()=>{
 const {core}=novo();const p=core.registrarColaborador(pessoa("Ana Teste","44999990004",{ajudas:["FORNECER ALIMENTAÇÃO"]}));
 const d=core.registrarPedido({telefone:p.telefone,necessidade:"Alimentação"});
 assert.equal(d.pedido.nome,p.nome);assert.equal(d.pedido.status,"Aguardando");
 assert.equal(d.pedido.atribuido_a,"");
 assert.equal(d.indicados.length,0);
});
test("pedido financeiro fica aguardando e não cria transferência",()=>{
 const {core}=novo();core.registrarColaborador(pessoa("Empresa Teste","44999990005",{tipo_pessoa:"JURÍDICA",maquinas:["MATERIAL DE CONSTRUÇÃO"]}));
 const d=core.registrarPedido({...pessoa("Solicitante","44999990006"),necessidade:"Apoio financeiro"});
 assert.equal(d.pedido.status,"Aguardando");assert.equal(d.indicados.length,0);
});
test("pedido de telhas encontra material de construção",()=>{
 const {core}=novo();const emp=core.registrarColaborador(pessoa("Fornecedor","44999990007",{tipo_pessoa:"JURÍDICA",maquinas:["MATERIAL DE CONSTRUÇÃO"]}));
 const d=core.registrarPedido({...pessoa("Solicitante","44999990008"),necessidade:"Telhas e cobertura"});
 assert.equal(d.indicados[0].id,emp.id);
});
test("pessoa que pediu ajuda também pode se tornar colaboradora",()=>{
 const {core}=novo();core.registrarPedido({...pessoa("Solicitante","44999990009"),necessidade:"Alimentação"});
 const c=core.registrarColaborador(pessoa("Solicitante","44999990009",{ajudas:["LIMPEZA"]}));
 assert.equal(core.encontrarIdentidade("44999990009").id,c.id);
});
test("após encaminhamento, colaborador só confirma Cheguei e Terminei",()=>{
 const {core}=novo();core.registrarColaborador(pessoa("Fornecedor","44999990010",{ajudas:["FORNECER ALIMENTAÇÃO"]}));
 const p=core.registrarPedido({...pessoa("Solicitante","44999990011"),necessidade:"Alimentação"}).pedido;
 assert.throws(()=>core.registrarFase(p.id,"Terminei"),/Cheguei/);
 assert.equal(core.registrarFase(p.id,"Cheguei").status,"Cheguei");
 assert.equal(core.registrarFase(p.id,"Terminei").status,"Atendida");
});
test("brigada reúne colaboradores e equipes da zona em um clique, mas não envia automaticamente",()=>{
 const {core}=novo();core.registrarColaborador(pessoa("Fornecedor","44999990012",{ajudas:["LIMPEZA"]}));
 core.db.gravar("equipes",{nome:"Equipe municipal",zona:"Zona 7",telefone:"44999990013"});
 const out=core.acionarBrigada("Zona 7","Teste de mobilização");
 assert.equal(out.destinatarios.length,2);assert.equal(out.mobilizacao.status,"Preparada");
 assert.equal(out.envios.filter(x=>x.link?.startsWith("https://wa.me/")).length,2);
});
test("pedido a outra prefeitura depende de prefeitura cadastrada",()=>{
 const {core}=novo();
 const outra=core.db.gravar("prefeituras",{nome:"Florianópolis",uf:"SC",codigo_ibge:"4205407",telefone:"48999998888"});
 const x=core.solicitarOutraPrefeitura(outra.id,"Retroescavadeira");
 assert.equal(x.pedido.status,"Preparada");assert.ok(x.link.startsWith("https://wa.me/55"));
 assert.throws(()=>core.solicitarOutraPrefeitura("maringa","Gerador"),/outra prefeitura/);
});
test("dados municipais não vazam para a prefeitura de outro tenant local",()=>{
 const memoria=storage(),maringa=Crise.criar({armazenamento:memoria});
 maringa.registrarColaborador(pessoa("Colaborador","44999990014"));
 const cidade=maringa.db.gravar("prefeituras",{nome:"Florianópolis",uf:"SC",codigo_ibge:"4205407"});
 const outra=Crise.criar({armazenamento:memoria,municipioId:cidade.id});
 assert.equal(outra.oferentes().length,0);assert.equal(outra.pedidos().length,0);
});
test("nenhum canal WhatsApp real é usado no core",()=>{
 const {core}=novo();const out=core.acionarBrigada("Zona 7");
 assert.equal(out.destinatarios.length,0);assert.ok(out.mensagem.includes("REDE MUNICIPAL"));
});

test("uma pessoa que precisa de ajuda encontra outro colaborador, mas não a si mesma",()=>{
 const {core}=novo();
 core.registrarColaborador(pessoa("Solicitante","44999990020",{ajudas:["FORNECER ALIMENTAÇÃO"]}));
 const outro=core.registrarColaborador(pessoa("Fornecedor","44999990021",{ajudas:["FORNECER ALIMENTAÇÃO"]}));
 const pedido=core.registrarPedido({telefone:"44999990020",necessidade:"Alimentação"});
 assert.equal(pedido.pedido.atribuido_a,outro.id);
});
test("urgência crítica não é automaticamente encaminhada ao colaborador comum",()=>{
 const {core}=novo();core.registrarColaborador(pessoa("Fornecedor","44999990022",{ajudas:["FORNECER ALIMENTAÇÃO"]}));
 const pedido=core.registrarPedido({...pessoa("Solicitante","44999990023"),necessidade:"Alimentação",urgencia:"Crítica"});
 assert.equal(pedido.pedido.status,"Aguardando");assert.equal(pedido.indicados.length,0);
 assert.match(pedido.aviso,/190/);
});
