const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const central = require('../central-conversas.js');

const pessoas=[
  {id:'ana',nome:'Ana Silva',zona:'Zona 1'},
  {id:'bia',nome:'Bia Santos',zona:'Zona 2'}
];

test('nenhuma conversa é selecionada automaticamente ao abrir a Central',()=>{
 assert.equal(central.manterSelecao(null,pessoas),null);
 assert.equal(central.manterSelecao(undefined,pessoas),null);
 assert.equal(central.manterSelecao('ana',pessoas),'ana');
});

test('desmarcar ou perder a conversa no filtro devolve à visão geral, sem selecionar outra',()=>{
 assert.equal(central.manterSelecao(null,pessoas),null);
 assert.equal(central.manterSelecao('ana',[pessoas[1]]),null);
 assert.equal(central.manterSelecao('inexistente',pessoas),null);
 assert.equal(central.manterSelecao('bia',[pessoas[1]]),'bia');
});

test('botão Todas fica à direita de Conversas e contagem, com ícone de casa',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../central-conversas.js'),'utf8');
 const header=js.split('<div class="cv-panel-head cv-inbox-head">')[1]
   .split('<div class="cv-search-wrap">')[0];
 assert.match(header, /<strong>Conversas<\/strong><small id="cv-visible-count">0 colaboradores<\/small>/);
 assert.match(header, /class="cv-all"/);
 assert.match(header, /data-cv-all/);
 assert.match(header, /<svg viewBox="0 0 24 24"/);
 assert.match(header, /<span>Todas<\/span>/);
 assert.ok(header.indexOf('cv-visible-count')<header.indexOf('data-cv-all'));
 assert.doesNotMatch(js,/Voltar às regiões|data-cv-back/);
});

test('Todas desmarca a conversa e restaura a visão geral sem filtros',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../central-conversas.js'),'utf8');
 const trecho=js.split('} else if (botao.hasAttribute("data-cv-all")) {')[1]
   .split('} else if (botao.hasAttribute("data-cv-clear")) {')[0];
 assert.match(trecho,/ativa = null;\s*selecionadas\.clear\(\);\s*busca = "";\s*buscarEl\.value = "";\s*renderDados\(\)/);
 assert.match(trecho,/painelRegioes\.focus\(/);
 assert.match(trecho,/painelRegioes\.scrollIntoView/);
 assert.match(js,/if \(botao\.hasAttribute\("data-cv-open"\)\)/);
});

test('em telas pequenas, o cabeçalho Conversas + Todas continua acessível durante o chat',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../central-conversas.css'),'utf8');
 assert.match(css,/\.cv-shell\{flex:1;display:grid;grid-template-columns:/);
 assert.match(css,/\.cv-root\.is-conversation-open \.cv-inbox\{display:flex;height:66px/);
 assert.match(css,/\.cv-root\.is-conversation-open \.cv-inspector\{display:none/);
 assert.match(css,/\.cv-root\.is-conversation-open \.cv-chat\{display:flex/);
 assert.match(css,/\.cv-all svg\{/);
});
