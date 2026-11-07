const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
test('implantação bloqueia gravação simultânea, preserva prévia após falha e permite repetir',async()=>{
 const scope={AlertaGestaoDados:require('../gestao/dados.js'),confirm:()=>true};
 vm.createContext(scope);vm.runInContext(fs.readFileSync('src/implantacao/importacao.js','utf8'),scope);
 let resolve,reject,chamadas=0;const pacotes=[],mensagens=[],estados=[];
 const state={busy:false,C:{MUNICIPIO:'1302603'},ctx:{db:{implantarPacote:pacote=>{
  chamadas++;pacotes.push(pacote);return new Promise((ok,erro)=>{resolve=ok;reject=erro;});
 }}}};
 const stage={grupos:{bairros:[{nome:'Bairro teste'}]},geo:null,ibge:null};
 const {saveAll}=scope.AlertaImplantacaoImportacao.criar({state,stage,ready:()=>true,renderTerritory:()=>estados.push(state.busy),notify:x=>mensagens.push(x),log(){}});
 const primeira=saveAll();await saveAll();
 assert.equal(chamadas,1);assert.equal(state.busy,true);assert.equal(estados[0],true);
 assert.equal(pacotes[0].codigo_ibge,'1302603');
 reject(Error('Indisponível'));await primeira;
 assert.equal(state.busy,false);assert.equal(stage.grupos.bairros.length,1);assert.match(mensagens.at(-1),/Falha: Indisponível/);
 const repeticao=saveAll();assert.equal(chamadas,2);
 resolve({totais:{bairros:{novos:1,atualizados:0}}});await repeticao;
 assert.equal(state.busy,false);assert.equal(Object.keys(stage.grupos).length,0);
 assert.equal(estados.at(-1),false);assert.match(mensagens.at(-1),/Implantação salva: 1/);
});
