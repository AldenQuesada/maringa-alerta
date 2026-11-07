"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../acoes-cabecalho.css"),"utf8");
const js=fs.readFileSync(path.join(__dirname,"../acoes-cabecalho.js"),"utf8");
const dados=fs.readFileSync(path.join(__dirname,"../dados.js"),"utf8");
test("três mapas têm nomes completos e abrem telas independentes",()=>{
 assert.match(html,/>Mapa de Evento<\/span>/);
 assert.match(html,/>Mapa de Colaboradores<\/span>/);
 assert.match(html,/>Mapa da Ajuda<\/span>/);
 assert.match(html,/href="\.\.\/index\.html"/);
 assert.match(html,/href="\.\.\/mapas\/\?tipo=colaboradores"/);
 assert.match(html,/href="\.\.\/mapas\/\?tipo=ajuda"/);
 assert.equal((html.match(/class="map-arrow"/g)||[]).length,0,"não usar setas decorativas");
 assert.equal((html.match(/class="map-symbol"/g)||[]).length,3,"os três botões devem ter o mesmo ícone");
});
test("o cabeçalho preserva sessão, três mapas e acesso canônico sem menus redundantes",()=>{
 assert.match(html,/id="sidebar-nav"/);
 assert.match(html,/id="header-actions"/);
 assert.match(html,/id="session-anchor"/);
 assert.match(html,/src="\.\/gestao.js/);
 assert.match(html,/src="\.\/acoes-cabecalho.js/);
 const groups=dados.slice(dados.indexOf("const GROUPS=["),dados.indexOf("const COLLECTIONS="));
 for(const name of ["equipes","integrantes","voluntarios","solicitacoes","mobilizacoes","apoios",
  "veiculos","equipamentos","estoques","abrigos","pontos","ocorrencias","canais","regras"]){
  assert.match(groups,new RegExp('"'+name+'"'),"Acesso pelo menu: "+name);
 }
 for(const name of ["bairros","zonas","pessoas","saude","emergencias","parceiros","bases","riscos"]){
  assert.match(dados,new RegExp(name+':\\{'),"Cadastro canônico da aba: "+name);
 }
 assert.doesNotMatch(groups,/"administradores"|"responsaveis"|"substitutos"|"coordenadores"|"operadores"/);
});

test("não inclui Vigilância Sanitária nem chamada de colaboradores internos",()=>{
 assert.doesNotMatch(html+css+js,/Vigilância Sanitária|chamar colaboradores internos|TeamCallBar|SanitaryInspectionAlertButton/i);
 assert.match(js,/SAMU/);
 assert.match(js,/Bombeiros/);
 assert.match(js,/Tarefas/);
 assert.match(js,/Alertas/);
});
test("no mobile ficam visíveis os três mapas e todos os quatro ícones",()=>{
 assert.match(css,/\.map-hub \.map-secondary:last-child\{display:flex/);
 assert.match(css,/\.header-actions\{gap:3px\}/);
 assert.match(css,/\.ma-action\{width:31px/);
 assert.doesNotMatch(css,/\.header-actions\s*\{[^}]*display:none/);
});
function harness(nuvem=null){
 const store=new Map();
 const memory={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 store.set("maringa_alerta_tarefas_gestao_v1_maringa",JSON.stringify([{id:"t1",title:"Verificar veículos",priority:"Alta",status:"open"}]));
 const idmap=new Map();
 const node=id=>{if(!idmap.has(id))idmap.set(id,{id,hidden:false,innerHTML:"",textContent:"",focus(){},querySelectorAll(){return []},setAttribute(){},dataset:{}});return idmap.get(id);};
 const buttons=["tasks","alerts","samu","bombeiros"].map(id=>({dataset:{headerAction:id},onclick:null,setAttribute(){}}));
 const wrap=node("header-actions");wrap.querySelectorAll=()=>buttons;
 const overlay={hidden:true,innerHTML:"",addEventListener(){},querySelectorAll(){return []}};
 const fakeDoc={getElementById:id=>node(id),createElement:()=>overlay,body:{appendChild(){}},addEventListener(){}};
 const state={solicitacoes:[{id:"p1",municipioId:"maringa",status:"Aguardando",necessidade:"Alimentação",urgencia:"Alta",zona:"Zona 7"}],mobilizacoes:[],apoios:[]};
 const db={municipioAtivo:()=>({id:"maringa",nome:"Maringá",uf:"PR"}),estado:()=>state};
 const ctx={AlertaNuvem:nuvem,document:fakeDoc,AlertaGestaoDados:{CHAVE:"local_data",criar:()=>db},localStorage:memory,crypto:{randomUUID:()=>"newtask"},navigator:{clipboard:{writeText:async()=>{}}},addEventListener(){},confirm:()=>true,
  FormData:class{constructor(form){this.form=form;}get(k){return this.form[k]}},setTimeout,clearTimeout};
 vm.runInNewContext(js,ctx,{filename:"acoes-cabecalho.js"});
 return {buttons,node,overlay,store,ctx};
}
test("ícones iniciais mostram tarefa pendente e alerta de ajuda",()=>{
 const h=harness();
 assert.match(h.node("header-actions").innerHTML,/data-header-action="tasks"/);
 assert.match(h.node("header-actions").innerHTML,/data-header-action="bombeiros"/);
 assert.equal(h.node("ma-count-tasks").textContent,"1");
 assert.equal(h.node("ma-count-alerts").textContent,"1");
});
test("Tarefas abre painel e permite criar atividade local",async()=>{
 const h=harness();
 h.buttons[0].onclick();
 assert.match(h.node("ma-dialog-body").innerHTML,/Verificar veículos/);
 const form=h.node("ma-task-form");form.title="Separar mantimentos";form.date="";form.priority="Normal";
 await form.onsubmit({preventDefault(){},currentTarget:form});
 const stored=JSON.parse(h.store.get("maringa_alerta_tarefas_gestao_v1_maringa"));
 assert.equal(stored.length,2);
 assert.equal(stored[1].title,"Separar mantimentos");
 assert.equal(h.node("ma-count-tasks").textContent,"2");
});
test("Alertas abre painel de avisos locais, sem confundir com meteorologia oficial",async()=>{
 const h=harness();h.buttons[1].onclick();
 const body=h.node("ma-dialog-body").innerHTML;
 assert.match(body,/Pedido aguardando/);
 assert.match(body,/Não substituem alertas oficiais/);
 await h.node("ma-mark-all").onclick();
 assert.equal(h.node("ma-count-alerts").hidden,true);
});
test("SAMU e Bombeiros exibem números corretos sem disparo automático",()=>{
 const h=harness();
 h.buttons[2].onclick();
 assert.match(h.node("ma-dialog-body").innerHTML,/href="tel:192"/);
 assert.match(h.node("ma-dialog-body").innerHTML,/abrir a discagem não significa despacho realizado/i);
 h.buttons[3].onclick();
 assert.match(h.node("ma-dialog-body").innerHTML,/href="tel:193"/);
 assert.equal(h.overlay.hidden,false);
});

test("cabeçalho conectado salva tarefas e leituras no servidor sem modificar dados locais",async()=>{
 const rows={tasks:[],alerts:[]},writes=[];
 const h=harness({ativo:true,painel:{ler:(city,key)=>rows[key],salvar:async(city,key,value)=>{writes.push([city,key]);rows[key]=value;return true;}}});
 const before=JSON.stringify([...h.store]);
 h.buttons[0].onclick();const form=h.node('ma-task-form');form.title='Conferir cadastro';form.date='';form.priority='Normal';
 await form.onsubmit({preventDefault(){},currentTarget:form});
 assert.equal(rows.tasks.length,1);assert.equal(h.node('ma-count-tasks').textContent,'1');
 h.buttons[1].onclick();await h.node('ma-mark-all').onclick();
 assert.deepEqual(writes,[['maringa','tasks'],['maringa','alerts']]);assert.equal(JSON.stringify([...h.store]),before);
});
