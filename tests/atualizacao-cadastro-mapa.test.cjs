const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {criar}=require('./helpers/evento-controlador.cjs');
test('alterações da Gestão atualizam eventos, opções, recorte e pontos do mapa',async()=>{
 const listeners={},chamadas=[];
 const ctx={window:{addEventListener:(nome,fn)=>{listeners[nome]=fn}},AlertaGestaoDados:{CHAVE:'cadastro'},
  gestao:{lista:()=>[]},tenantId:'cidade',
  atualizarFiltroEventos:()=>chamadas.push('eventos'),filtroOcorrencias:{atualizarOpcoes:()=>chamadas.push('filtros')},
  location:{reload:()=>chamadas.push('reload')},atualizarRecorte:()=>chamadas.push('recorte'),montarMarcadoresPublicos:()=>chamadas.push('pontos'),
  filtrosMunicipaisProntos:true,atualizarFiltroCadastros:()=>chamadas.push('cadastros')};
 const controller=criar('pessoas',ctx);await controller.iniciar();
 listeners.storage({key:'outra'});assert.deepEqual(chamadas,[]);
 listeners.storage({key:'cadastro'});assert.deepEqual(chamadas,['eventos','filtros','recorte','pontos','cadastros']);
 chamadas.length=0;listeners.focus();assert.deepEqual(chamadas,['eventos','filtros','recorte','pontos','cadastros']);
 chamadas.length=0;controller.ultimaAssinaturaTerritorial='alterado';listeners.focus();assert.deepEqual(chamadas,['reload']);
});

test('colaboradores cadastrados no WhatsApp são lidos da mesma coleção pelo Mapa de Eventos',()=>{
 const Dados=require('../gestao/dados.js');
 const Crise=require('../crise/core.js');
 const m=new Map();
 const armazenamento={
  getItem:key=>m.has(key)?m.get(key):null,
  setItem:(key,value)=>m.set(key,String(value)),
  removeItem:key=>m.delete(key)
 };
 const app=Crise.criar({armazenamento,municipioId:'maringa',escopoMunicipal:true});
 const gravado=app.registrarColaborador({
  nome:'Colaborador de teste',tipo_pessoa:'FÍSICA',
  endereco:'Rua Teste, 15, Maringá, PR',telefone:'44999990123',
  ajudas:['LIMPEZA'],bairro:'',zona:''
 });
 const base=Dados.criar(armazenamento,{municipioId:'maringa'});
 const {pessoasMunicipio}=criar('pessoas',{
  AlertaGestaoDados:{criar:()=>base},tenantId:'maringa',PAPEL_LABEL:{},demoMode:false,
  exibirEquipesLegadas:false,voluntarios:[],todosFuncionarios:()=>[]
 });
 const pessoas=pessoasMunicipio();
 const pessoa=pessoas.find(x=>x.id==='cad:'+gravado.id);
 assert.ok(pessoa,'cadastro não pode desaparecer quando não há região inferida');
 assert.equal(pessoa.nome,'Colaborador de teste');
 assert.equal(pessoa.bairroOrigem,'');
 assert.deepEqual(Array.from(pessoa.sub.split(', ')),['LIMPEZA']);
 assert.equal(base.lista('voluntarios','maringa').length,1);
});
test('menu de colaboradores sinaliza registros ocultos por filtro e sem bairro vinculado',()=>{
 const source=fs.readFileSync('src/evento/controladores/painel-colaboradores.js','utf8');
 assert.match(source,/const todosCadastrados=dependencias.pessoasMunicipio\(\)/);
 assert.match(source,/const ocultos=Math\.max\(0,todosCadastrados\.length-exibidos\)/);
 assert.match(source,/const semTerritorio=todosCadastrados\.filter/);
 assert.match(source,/Selecione "Todo o município" para conferir a lista completa/);
 assert.match(source,/Bairro a confirmar/);
});


test('equipes previamente persistidas continuam visíveis sem ?demo=1',async()=>{
 const restauracao=require('../operacao-restauracao.js');
 const registro={
  versao:1,tenantId:'maringa',voluntarios:[
   {id:'v17',nome:'Ana teste',bairro:'Jardim Alvorada',pos:[-23.387,-51.912],
    contribuicoes:['Mão de obra'],demo:true}
  ],ocorrencias:[]
 };
 const armazenamento={getItem:key=>key==='alerta_prototipo_v2_maringa_operacao'?JSON.stringify(registro):null};
 const modelo={config:{selecionar:()=> 'maringa',marca:()=> 'Maringá Alerta'},criar:()=>({municipioAtivo:()=>({id:'maringa',nome:'Maringá',codigo_ibge:'4115200'})})};
 const ctx={AlertaEventoFormatacao:{},AlertaEventoDemonstracaoConfiguracao:{4115200:{}},document:{querySelectorAll:()=>[]},AlertaGestaoDados:modelo,sessionStorage:{getItem:()=>null},location:{search:''},localStorage:armazenamento,URLSearchParams,OperacaoRestauracao:restauracao};
 const carregar=async scope=>{const c=criar('contexto',{},scope);await c.iniciar();return c;};
 const antigo=await carregar(ctx);
 assert.equal(antigo.demoMode,false);
 assert.equal(antigo.exibirEquipesLegadas,true);
 assert.equal((await carregar({...ctx,localStorage:{getItem:()=>null}})).exibirEquipesLegadas,false,
  'sem arquivo salvo não se pode inventar equipes');
 assert.equal((await carregar({...ctx,location:{search:'?demo=1'},localStorage:{getItem:()=>null}})).exibirEquipesLegadas,true);
 const online=await carregar({...ctx,AlertaNuvem:{ativo:true},sessionStorage:{getItem:()=> 'maringa'},AlertaGestaoDados:modelo,location:{search:'?demo=1'}});
 assert.equal(online.exibirEquipesLegadas,false,'A sessão real não restaura pessoas da demonstração local');
 assert.equal(online.demoMode,false);
 assert.match(fs.readFileSync('src/evento/controladores/regioes.js','utf8'),/habilitado:dependencias.exibirEquipesLegadas/);
 assert.match(fs.readFileSync('src/evento/controladores/cadastro-territorial.js','utf8'),/'Zona demonstrativa':dependencias.exibirEquipesLegadas/);
 assert.match(fs.readFileSync('src/evento/controladores/inicializacao.js','utf8'),
  /if\(recuperacao\.estado==='vazio'&&dependencias.demoMode\)\{/,
  'geração de voluntários fictícios segue limitada à opção explícita');
});
test('Mapa de Eventos consulta os colaboradores operacionais já salvos e a equipe da região',()=>{
 const fake={id:'v5',nome:'Carlos teste',bairro:'Zona 7',pos:[-23.3995,-51.9395],
  contribuicoes:['Transporte de pessoas'],ajuda:'Transporte de pessoas'};
 const {pessoasMunicipio}=criar('pessoas',{
  AlertaGestaoDados:{criar:()=>({lista:()=>[]})},tenantId:'maringa',
  PAPEL_LABEL:{responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenador'},
  exibirEquipesLegadas:true,demoMode:false,voluntarios:[fake],
  estadoPessoa:()=> 'Aguardando',todosFuncionarios:()=>[
   {id:'f1',nome:'Coordenador teste',papel:'coordenador',zona:'Zona 7'}
  ]
 });
 const pessoas=pessoasMunicipio();
 assert.equal(pessoas.length,2);
 assert.equal(pessoas.find(x=>x.id==='v5')?.nome,'Carlos teste');
 assert.equal(pessoas.find(x=>x.id==='v5')?.bairroOrigem,'Zona 7');
 assert.equal(pessoas.find(x=>x.id==='f1')?.oficial,true);
 assert.ok(pessoas.some(x=>x.sub==='Coordenador'));

});
