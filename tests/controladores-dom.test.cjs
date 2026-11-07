const {test}=require('node:test'),assert=require('node:assert/strict');
const {iniciarPagina}=require('./helpers/pagina-dom.cjs');
test('Mapa de Evento inicializa todos os controladores com estado municipal e sem fixtures alheias',async()=>{
 const {instance,document,map,errors}=await iniciarPagina();
 assert.equal(instance.obter('contexto').tenantId,'manaus');
 assert.equal(instance.obter('conversas').estadoPronto,true);
 assert.equal(instance.obter('contexto').demoMode,false);
 assert.equal(instance.obter('regioes').bairros.length,0);
 assert.equal(instance.obter('cadastro-territorial').ocorrencias.length,0);
 assert.equal(instance.obter('cadastro-territorial').voluntarios.length,0);
 assert.match(document.title,/Manaus/);
 assert.deepEqual(map.center,{lat:-3.1,lng:-60});assert.deepEqual(errors,[]);
 const perfil=instance.obter('cadastro-territorial');assert.equal(perfil.currentRole.tipo,'visualizacao');
 instance.obter('permissoes').selecionarPerfilDemo('visualizacao');
 assert.equal(instance.obter('permissoes').isViewOnly(),true);
});
test('Mapa de Colaboradores inicializa os controladores e mantém o contexto da prefeitura',async()=>{
 const {document,map,errors}=await iniciarPagina('mapas/index.html');
 assert.match(document.title,/Manaus/);assert.deepEqual(map.center,{lat:-3.1,lng:-60});assert.deepEqual(errors,[]);
 assert.match(document.getElementById('results').textContent,/Não há colaboradores/);
 document.getElementById('busca').value='sem registro';document.getElementById('busca').oninput();
 assert.match(document.getElementById('results').textContent,/Não há colaboradores/);
});

test('Central de Conversas abre cadastro, mostra a prefeitura certa e retorna às regiões',async()=>{
 const {document,ctx,errors}=await iniciarPagina('gestao/index.html');
 const db=ctx.AlertaGestaoDados.criar(undefined,{municipioId:'manaus'});
 const pessoa=db.gravar('voluntarios',{nome:'Pessoa de teste',tipo_pessoa:'FÍSICA',telefone:'92999990000',endereco:'Rua fixture',ajudas:['LIMPEZA']});
 const target=document.getElementById('page');
 ctx.AlertaCentralConversas.montar({target,db});
 target.querySelector('[data-cv-open="'+pessoa.id+'"]').click();
 assert.match(target.querySelector('#cv-transcript').textContent,/Manaus Alerta/);
 assert.doesNotMatch(target.querySelector('#cv-transcript').textContent,/Maringá/);
 target.querySelector('[data-cv-all]').click();
 assert.match(target.querySelector('#cv-transcript').textContent,/Nenhuma conversa selecionada/);
 assert.deepEqual(errors,[]);
});

test('composição do Evento mantém referências vivas e não registra eventos duas vezes',async()=>{
 const {instance,document,listeners}=await iniciarPagina();
 const before=Object.fromEntries(Object.entries(listeners).map(([k,v])=>[k,v.length]));
 await instance.iniciar();
 assert.deepEqual(Object.fromEntries(Object.entries(listeners).map(([k,v])=>[k,v.length])),before);
 instance.obter('permissoes').selecionarPerfilDemo({tipo:'admin'});
 assert.equal(instance.obter('cadastro-territorial').currentRole.tipo,'admin');
 assert.equal(document.getElementById('demo-new').disabled,false);
 instance.obter('permissoes').selecionarPerfilDemo({tipo:'visualizacao'});
 assert.equal(document.getElementById('demo-new').disabled,true);
});

test('Gestão percorre os cadastros pelas rotas existentes',async()=>{
 const {ctx,document,listeners,errors}=await iniciarPagina('gestao/index.html');
 for(const rota of ['territorio','estruturas','geoterritorialidade','bairros','zonas','pessoas','bases','riscos','voluntarios','eventos','conversas','inicio']){
  ctx.location.hash='#'+rota;
  for(const handler of listeners.hashchange)handler();
  assert.ok(document.getElementById('page').textContent.trim(),rota);
 }
 assert.deepEqual(errors,[]);
});

test('implantação renderiza inventário, prepara prévia e limpa lote ao trocar de prefeitura',async()=>{
 const {ctx,document,errors}=await iniciarPagina('gestao/index.html');
 const db=ctx.AlertaGestaoDados.criar(undefined,{municipioId:'manaus'}),page=document.getElementById('page');
 const ui=ctx.AlertaImplantacaoUI;
 ui.montar({db,page,mode:'implantacao'});
 assert.match(page.querySelector('.mi-context').textContent,/Manaus/);
 assert.match(page.querySelector('.mi-summary').textContent,/Unidades de saúde/);
 document.getElementById('mi-gg').click();
 assert.ok(Object.values(ui.preview().grupos).flat().length>0);
 ui.montar({db,page,mode:'pessoas'});
 assert.match(page.textContent,/Gabinete de Crise/i);
 const outro=ctx.AlertaGestaoDados.criarLocal({getItem:()=>JSON.stringify({version:1,municipioAtivo:'recife',prefeituras:[{id:'recife',codigo_ibge:'2611606',nome:'Recife',uf:'PE',status:'ativa'}]}),setItem(){}},{semBootstrap:true,municipioId:'recife'});
 ui.montar({db:outro,page,mode:'implantacao'});
 assert.match(page.querySelector('.mi-context').textContent,/Recife/);
 assert.equal(Object.values(ui.preview().grupos).flat().length,0);
 assert.deepEqual(errors,[]);
});

test('Pra Somar inicializa no município escolhido sem ativar demonstração',async()=>{
 const {document,errors}=await iniciarPagina('mapas/index.html','?tipo=ajuda');
 assert.match(document.title,/Pra Somar Manaus/);
 assert.equal(document.body.classList.contains('mapa-ajuda'),true);
 assert.match(document.getElementById('results').textContent,/Nenhum registro neste filtro/);
 assert.deepEqual(errors,[]);
});
