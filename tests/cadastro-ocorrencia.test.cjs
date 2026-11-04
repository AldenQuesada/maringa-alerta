const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const dados = require('../gestao/dados.js');

function armazenamento() {
  const dados = new Map();
  return {getItem: key => dados.get(key) ?? null, setItem: (key, value) => dados.set(key, String(value))};
}

test('evento e relato vinculado pertencem à prefeitura em que foram criados', () => {
  const store = armazenamento();
  const plataforma = dados.criar(store);
  const londrina = plataforma.gravar('prefeituras', {nome:'Londrina', uf:'PR', codigo_ibge:'4113700'});
  plataforma.selecionarMunicipio(londrina.id);
  const maringa = dados.criar(store, {municipioId:'maringa'});
  const evento = maringa.gravar('eventos', {nome:'Tempestade',tipo:'Chuva',status:'Em andamento'});
  const pedido = maringa.gravar('solicitacoes', {
    nome:'Pessoa',tipo_pessoa:'FÍSICA',telefone:'44999999999',endereco:'Rua A, 10',
    necessidade:'Alimentação',relatos:[{origem:'Operador',descricao:'Relato adicional'}]
  });
  assert.equal(evento.municipioId, 'maringa');
  assert.equal(maringa.registro('solicitacoes', pedido.id).relatos[0].descricao, 'Relato adicional');
  assert.equal(plataforma.lista('eventos').length, 0);
  assert.equal(plataforma.lista('solicitacoes').length, 0);
});

test('sugestão de bairro usa polígono e respeita buracos e sobreposições', () => {
  const codigo = fs.readFileSync(path.join(__dirname, '../cadastro-ocorrencia.js'), 'utf8');
  const contexto = {window:{}};
  vm.runInNewContext(codigo, contexto);
  const encontrar = contexto.window.CadastroOcorrencia.encontrarBairro;
  const poligono = {tipoArea:'Bairro',nome:'A',geojson:{type:'Polygon',coordinates:[
    [[0,0],[10,0],[10,10],[0,10],[0,0]],
    [[4,4],[6,4],[6,6],[4,6],[4,4]]
  ]}};
  assert.equal(encontrar([poligono],[2,2]), 'A');
  assert.equal(encontrar([poligono],[5,5]), null);
  assert.equal(encontrar([poligono,{...poligono,nome:'B'}],[2,2]), null);
  assert.equal(encontrar([poligono],[11,11]), null);
});
