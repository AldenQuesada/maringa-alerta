const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('alterações da Gestão atualizam eventos, opções, recorte e pontos do mapa',()=>{
 const source=fs.readFileSync('src/evento/05-seletores-de-zona-part02.js','utf8');
 const trecho=source.slice(source.indexOf('function atualizarCadastroMapa(){'),source.indexOf('\nconst localizacoes='));
 assert.ok(trecho.includes("window.addEventListener('focus'"));
 const listeners={},chamadas=[];
 const ctx={window:{addEventListener:(nome,fn)=>{listeners[nome]=fn}},AlertaGestaoDados:{CHAVE:'cadastro'},
  atualizarFiltroEventos:()=>chamadas.push('eventos'),filtroOcorrencias:{atualizarOpcoes:()=>chamadas.push('filtros')},
  atualizarRecorte:()=>chamadas.push('recorte'),montarMarcadoresPublicos:()=>chamadas.push('pontos'),
  filtrosMunicipaisProntos:true,atualizarFiltroCadastros:()=>chamadas.push('cadastros')};
 vm.runInNewContext(trecho,ctx);
 listeners.storage({key:'outra'});assert.deepEqual(chamadas,[]);
 listeners.storage({key:'cadastro'});assert.deepEqual(chamadas,['eventos','filtros','recorte','pontos','cadastros']);
 chamadas.length=0;listeners.focus();assert.deepEqual(chamadas,['eventos','filtros','recorte','pontos','cadastros']);
});
