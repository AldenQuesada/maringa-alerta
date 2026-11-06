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

test('botão Voltar às regiões desmarca pessoa sem limpar busca nem seleções de zona',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../central-conversas.js'),'utf8');
 assert.match(js,/class="cv-back" data-cv-back/);
 assert.match(js,/aria-label="Desmarcar conversa e voltar às regiões"/);
 const trecho=js.split('} else if (botao.hasAttribute("data-cv-back")) {')[1]
   .split('} else if (botao.hasAttribute("data-cv-clear")) {')[0];
 assert.match(trecho,/ativa = null;\s*renderDados\(\)/);
 assert.match(trecho,/painelRegioes\.scrollTop = 0/);
 assert.match(trecho,/painelRegioes\.focus\(/);
 assert.doesNotMatch(trecho,/selecionadas\.clear\(\)|busca\s*=\s*""/);
});

test('mobile alterna entre painel de regiões e chat, preservando três painéis desktop',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../central-conversas.css'),'utf8');
 assert.match(css,/\.cv-shell\{flex:1;display:grid;grid-template-columns:/);
 assert.match(css,/\.cv-root\.is-conversation-open \.cv-chat\{display:flex/);
 assert.match(css,/\.cv-root\.is-conversation-open \.cv-inbox,\.cv-root\.is-conversation-open \.cv-inspector\{display:none/);
 assert.match(css,/\.cv-inspector\{order:0/);
});
