const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const central = require('../central-conversas.js');
const root = path.join(__dirname, '..', '..');

const bairros = [
  {nome: 'Jardim Alvorada', zona: 'Zona 5'},
  {nome: 'Centro', zona: 'Zona 1'}
];
const pessoas = [
  {id: 'a', municipioId: 'maringa', nome: 'Ana Silva', zona: 'Zona 1',
    tipo_pessoa: 'FÍSICA', endereco: 'Rua A, 10', telefone: '44999999999',
    ajudas: ['LIMPEZA'], maquinas: [], empreendedores: [], materiais: []},
  {id: 'b', municipioId: 'maringa', nome: 'Carlos Souza', bairro: 'Jardim Alvorada',
    tipo_pessoa: 'JURÍDICA', endereco: 'Rua B, 20', telefone: '44988888888',
    ajudas: [], maquinas: ['GERADOR'], empreendedores: [], materiais: []},
  {id: 'c', municipioId: 'maringa', nome: 'Sem zona', telefone: '44977777777',
    ajudas: ['OPERADOR DE DRONE']}
];

test('zona é a do cadastro ou vínculo territorial exato, sem adivinhação', () => {
  assert.equal(central.zonaDaPessoa(pessoas[0], bairros), 'Zona 1');
  assert.equal(central.zonaDaPessoa(pessoas[1], bairros), 'Zona 5');
  assert.equal(central.zonaDaPessoa(pessoas[2], bairros), central.SEM_ZONA);
  assert.equal(central.zonaDaPessoa({bairro:'Outro lugar'}, bairros), central.SEM_ZONA);
});

test('filtro multizona, combinação com busca e ausência de categoria fictícia', () => {
  assert.deepEqual(
    central.filtrarPessoas(pessoas,bairros,new Set(['Zona 1','Zona 5']),'').map(x=>x.id),
    ['a','b']);
  assert.deepEqual(
    central.filtrarPessoas(pessoas,bairros,new Set(['Zona 5']),'gerador').map(x=>x.id),
    ['b']);
  assert.deepEqual(
    central.filtrarPessoas(pessoas,bairros,new Set([central.SEM_ZONA]),'').map(x=>x.id),
    ['c']);
  assert.deepEqual(
    central.filtrarPessoas(pessoas,bairros,new Set(['Zona 1']),'gerador').map(x=>x.id),
    []);
});

test('reconstitui o roteiro oficial sem inventar resposta para campo ausente', () => {
  const fluxo = central.fluxoCadastro(pessoas[0]);
  assert.match(fluxo[0].texto, /Bem-vindo ao Maringá Alerta/);
  assert.equal(fluxo[1].texto, 'Ser colaborador');
  assert.match(fluxo[2].texto, /Para começar, digite seu nome e sobrenome/);
  assert.equal(fluxo[3].texto, 'Ana Silva');
  assert.match(fluxo[4].texto, /Muito obrigado, Ana Silva! Como você gostaria de se cadastrar/);
  assert.equal(fluxo[5].texto, 'Pessoa física');
  assert.ok(fluxo.some(x => x.tipo === 'ausente'));
  assert.match(fluxo.at(-1).texto, /não são conversas WhatsApp enviadas ou recebidas/);
});

test('fluxo inclui pergunta condicional apenas quando aplicável', () => {
  const comDoacao = central.fluxoCadastro({
    ...pessoas[0], ajudas: ['FORNECER ALIMENTAÇÃO'],
    forma_entrega_doacao: 'Consigo entregar no centro de acolhimento mais próximo'
  });
  assert.ok(comDoacao.some(x => x.texto === 'Como você disponibiliza sua doação?'));
  assert.ok(!central.fluxoCadastro(pessoas[0])
    .some(x => x.texto === 'Como você disponibiliza sua doação?'));
});

test('a Central usa a coleção municipal canônica e não tem cadastro paralelo', () => {
  const js = fs.readFileSync(path.join(root,'gestao/central-conversas.js'),'utf8');
  const bundle = fs.readFileSync(path.join(root,'gestao/gestao.js'),'utf8');
  const html = fs.readFileSync(path.join(root,'gestao/index.html'),'utf8');
  assert.match(js, /db\.lista\("voluntarios"\)/);
  assert.doesNotMatch(js, /localStorage\.setItem|gerarVoluntarios|nomesVol|Math\.random/);
  assert.match(bundle, /AlertaCentralConversas\.montar/);
  assert.match(bundle, /data-nav="conversas"/);
  assert.match(html, /central-conversas\.js/);
  assert.match(html, /central-conversas\.css/);
});
