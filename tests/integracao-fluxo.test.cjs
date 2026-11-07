const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const AlertaFluxo = require('../fluxo-ajuda.js');

// Executa o adaptador real, sem depender do mapa ou de mensagens externas.
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const evento = fs.readFileSync(path.join(__dirname, '../evento/app.js'), 'utf8');
const inicio = evento.indexOf('function acionarAjuda(');
const fim = evento.indexOf('function calcularTempos(', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'Adaptador de acionamento disponível');
const adaptador = evento.slice(inicio, fim);

function cenario(quantidade) {
  const o = {
    id: 'oc-teste', tenantId: 'maringa', confirmado: true, status: 'ativa',
    protocolo: 'MA-TESTE', tipo: 'Distribuição de água e alimentos', bairro: 'Zona 7',
    pos: [-23.4, -51.9], responsavel: { id: 'responsavel', nome: 'Responsável regional', tel: 'demo' }
  };
  const voluntarios = Array.from({ length: quantidade }, (_, i) => ({
    id: `v${i}`, nome: `Pessoa ${i}`, tenantId: o.tenantId,
    bairro: o.bairro, pos: o.pos, ajuda: 'Comida'
  }));
  const mensagens = [], etapas = [];
  const contexto = vm.createContext({
    AlertaFluxo, voluntarios, ocorrencias: [o], map: { distance: () => 100 },
    registrarEtapa: (...args) => etapas.push(args),
    enviarMensagemDemo: (...args) => mensagens.push(args),
    refreshVolMarker: () => {}
  });
  contexto.dependencias=contexto;
  vm.runInContext(adaptador, contexto);
  return { o, voluntarios, mensagens, etapas, acionar: () => contexto.acionarAjuda(o) };
}

test('capacidade parcial aciona a equipe para completar o atendimento, uma única vez', () => {
  const c = cenario(1);
  const resultado = c.acionar();
  assert.equal(resultado.faltam, 1);
  assert.equal(c.o.participacoes.length, 1);
  assert.equal(c.o.participacoes[0].status, 'convidado');
  assert.equal(c.o.atendimentoEquipe.status, 'acionada');
  assert.equal(c.o.pendenciaTecnica, true);
  assert.equal(c.mensagens.filter(m => m[3] === 'convite').length, 1);
  assert.equal(c.mensagens.filter(m => m[3] === 'aviso_regional').length, 1);
  assert.equal(c.mensagens.filter(m => m[3] === 'encaminhamento').length, 1);
  c.acionar();
  assert.equal(c.mensagens.filter(m => m[3] === 'encaminhamento').length, 1);
});

test('capacidade completa mantém os dois convites sem acionamento municipal redundante', () => {
  const c = cenario(2);
  assert.equal(c.acionar().faltam, 0);
  assert.equal(c.o.participacoes.length, 2);
  assert.equal(c.o.atendimentoEquipe, undefined);
  assert.equal(c.mensagens.filter(m => m[3] === 'encaminhamento').length, 0);
});

test('cadastro de colaboradores segue um único fluxo canônico nos três mapas', () => {
  const chat = fs.readFileSync(path.join(__dirname, '../atendimento/chat.js'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, '../crise/core.js'), 'utf8');
  const mapa = fs.readFileSync(path.join(__dirname, '../mapas/app.js'), 'utf8');
  assert.match(html, /<a class="register-fab" id="fab-cadastro" href="\.\/atendimento\/"/);
  assert.doesNotMatch(html, /id="cadastro-overlay"|function cadastroFinalizar\(/);
  assert.match(chat, /app\.registrarColaborador\(/);
  assert.match(core, /db\.gravar\("voluntarios"/);
  assert.match(mapa, /app\.oferentes\(\)/);
  assert.match(evento, /cadastro\.lista\('voluntarios',dependencias.tenantId\)/);
  assert.match(evento, /Gerenciar colaboradores na Gestão/);
  assert.doesNotMatch(evento, /data-action="rm-vol"/);
});
