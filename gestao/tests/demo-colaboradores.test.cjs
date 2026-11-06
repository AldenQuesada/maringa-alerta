const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../dados.js');
const demo=require('../demo-colaboradores.js');
const central=require('../central-conversas.js');
const core=require('../../crise/core.js');

function armazenamento(){
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
function preparar(){
 const storage=armazenamento();
 const db=D.criar(storage,{municipioId:'maringa'});
 return {storage,db};
}
test('a Central importa imediatamente os ajudantes-modelo do mapa e cria seus cadastros no mesmo armazenamento municipal',()=>{
 const {db,storage}=preparar();
 assert.equal(db.lista('voluntarios').length,0);
 const r=demo.garantir(db,storage);
 assert.equal(r.adicionados,42);
 assert.equal(r.origem,'modelo_legado');
 const pessoas=db.lista('voluntarios');
 assert.equal(pessoas.length,42);
 assert.equal(new Set(pessoas.map(p=>p.bairro)).size,6);
 assert.ok(pessoas.some(p=>p.nome==='Antônio Silva'));
 assert.ok(pessoas.some(p=>p.nome==='Beatriz Nunes'));
 assert.ok(pessoas.every(p=>p.municipioId==='maringa'&&p.status_simulacao==='simulado'));
 assert.ok(pessoas.every(p=>p.disponibilidade==='Indisponível'));
 assert.ok(pessoas.every(p=>!/^(\+?55)?\d{10,13}$/.test(p.telefone)));
 assert.ok(pessoas.every(p=>p.origem_cadastro==='mapa_evento_demo'));
 assert.equal(central.fluxoCadastro(pessoas[0]).find(x=>x.texto.includes('Muito obrigado')).tipo,'bot');
 assert.ok(central.fluxoCadastro(pessoas[0]).some(x=>x.texto.includes('Cadastro demonstrativo')));
 assert.equal(demo.garantir(db,storage).adicionados,0);
 assert.equal(db.lista('voluntarios').length,42);
});

test('se a operação antiga tiver ajudantes salvos, usa os mesmos identificadores, nomes, bairros e ofertas sem substituição por outros',()=>{
 const {db,storage}=preparar();
 const legados=[
  {id:'v41',nome:'Joana Ribas',bairro:'Zona 7',ajuda:'Comida',tenantId:'maringa'},
  {id:'v42',nome:'Gustavo Peres',bairro:'Jardim Universo',ajuda:'Gerador',tenantId:'maringa'},
  {id:'v43',nome:'Larissa Toledo',bairro:'Centro Cívico',ajuda:'Mão de obra',tenantId:'maringa'}
 ];
 storage.setItem(demo.CHAVE_OPERACAO,JSON.stringify({versao:1,tenantId:'maringa',voluntarios:legados}));
 const r=demo.garantir(db,storage);
 assert.equal(r.adicionados,3);
 assert.equal(r.origem,'mapa_local');
 const pessoas=db.lista('voluntarios');
 assert.deepEqual(new Set(pessoas.map(p=>p.nome)),new Set(legados.map(x=>x.nome)));
 assert.ok(pessoas.every(p=>legados.some(v=>p.origem_id_legado===v.id&&p.bairro===v.bairro)));
 assert.deepEqual(pessoas.find(p=>p.origem_id_legado==='v41').ajudas,['FORNECER ALIMENTAÇÃO']);
 assert.deepEqual(pessoas.find(p=>p.origem_id_legado==='v42').maquinas,['GERADOR']);
 assert.equal(pessoas.find(p=>p.origem_id_legado==='v43').outros,'Mão de obra');
 assert.equal(demo.garantir(db,storage).adicionados,0);
});

test('não altera cadastros existentes e respeita exclusões posteriores de demonstrações',()=>{
 const {db,storage}=preparar();
 db.gravar('voluntarios',{nome:'Colaborador já existente',tipo_pessoa:'FÍSICA',
  endereco:'Rua documentada',telefone:'44999990000'});
 assert.equal(demo.garantir(db,storage).adicionados,42);
 const todos=db.lista('voluntarios');
 assert.equal(todos.length,43);
 assert.ok(todos.some(p=>p.nome==='Colaborador já existente'&&!p.status_simulacao));
 const exemplo=todos.find(p=>p.status_simulacao==='simulado');
 db.excluir('voluntarios',exemplo.id);
 assert.equal(demo.garantir(db,storage).adicionados,0);
 assert.equal(db.lista('voluntarios').length,42);
});

test('não importa ajudantes para outra prefeitura e não mistura municípios',()=>{
 const {db,storage}=preparar();
 const dadosMunicipais=D.criar(storage,{municipioId:'outra-prefeitura'});
 assert.equal(demo.garantir(dadosMunicipais,storage).adicionados,0);
 assert.equal(db.lista('voluntarios').length,0);
});

test('cadastros simulados nunca podem virar destinos de brigada nem de pedidos reais, mesmo com disponibilidade alterada',()=>{
 const {db,storage}=preparar();
 db.gravar('zonas',{nome:'Zona 7'});
 demo.garantir(db,storage);
 let p=db.lista('voluntarios').find(x=>x.zona==='Zona 7');
 assert.ok(p);
 db.gravar('voluntarios',{...p,disponibilidade:'Disponível'},p.id);
 const sistema=core.criar({armazenamento:storage,municipioId:'maringa',escopoMunicipal:true});
 const mobilizacao=sistema.acionarBrigada('Zona 7');
 assert.equal(mobilizacao.destinatarios.filter(x=>x.tipo==='colaborador').length,0);
 assert.throws(()=>sistema.registrarCheckin({colaboradorId:p.id,bairro:p.bairro,lat:-23.4,lng:-51.9,
  precisao:12,geometry:{type:'Polygon',coordinates:[]}}),/demonstração/);
});

test('Dashboard carrega o importador antes da Central e mantém a UI de três colunas',()=>{
 const root=path.join(__dirname,'..','..');
 const html=fs.readFileSync(path.join(root,'gestao/index.html'),'utf8');
 const render=fs.readFileSync(path.join(root,'gestao/gestao.js'),'utf8');
 const centralJs=fs.readFileSync(path.join(root,'gestao/central-conversas.js'),'utf8');
 assert.ok(html.indexOf('demo-colaboradores.js')>0);
 assert.ok(html.indexOf('demo-colaboradores.js')<html.indexOf('central-conversas.js'));
 assert.ok(html.indexOf('central-conversas.js')<html.indexOf('gestao.js'));
 assert.match(render,/MaringaColaboradoresDemo\?\.garantir/);
 assert.match(centralJs,/cv-inbox/);
 assert.match(centralJs,/cv-chat/);
 assert.match(centralJs,/cv-inspector/);
 assert.match(centralJs,/DEMONSTRAÇÃO/);
});
