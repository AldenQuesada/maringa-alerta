// Execute com servidor local em 8783. Supabase remoto bloqueado em ambiente.cjs.
const {ambiente}=require('./ambiente.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.BROWSER_EVIDENCE_DIR||'/tmp/maringa-integracao-browser-evidencias';fs.mkdirSync(out,{recursive:true});
const report=[];
const only=process.env.BROWSER_SCENARIO;
async function run(name,options,fn){if(only&&name!==only)return;const a=await ambiente(options);try{a.page.setDefaultTimeout(10000);await fn(a);assert.deepEqual(a.errors,[]);assert.deepEqual(a.blocked,[]);report.push({name,ok:true});}catch(e){report.push({name,ok:false,error:e.message});await a.page.screenshot({path:out+'/'+name+'-falha.png',fullPage:true}).catch(()=>{});}finally{await a.browser.close();console.log(JSON.stringify(report.at(-1)));}}
async function open(a,url){await a.page.goto('http://127.0.0.1:8783/'+url);await a.page.locator('#backend-bar').waitFor();}
(async()=>{
await run('cadastros-editor',{},async a=>{const p=a.page;await open(a,'gestao/#bases');
 await p.locator('[data-new="bases"]').click();await p.locator('#field-nome').fill('Nova base do teste');await p.locator('#drawer-save').click();await p.locator('#drawer-overlay').waitFor({state:'hidden'});
 assert.ok(a.rows.some(x=>x.dados.nome==='Nova base do teste'));
 const row=p.locator('tr').filter({hasText:'Nova base do teste'});await row.locator('[data-edit]').click();await p.locator('#field-nome').fill('Base editada no teste');await p.locator('#drawer-save').click();await p.locator('#drawer-overlay').waitFor({state:'hidden'});
 await p.reload();await p.locator('#backend-bar').waitFor();assert.ok(await p.getByText('Base editada no teste',{exact:true}).isVisible());
 p.once('dialog',d=>d.accept());await p.locator('tr').filter({hasText:'Base editada no teste'}).locator('[data-delete]').click();await p.getByText('Base editada no teste',{exact:true}).waitFor({state:'hidden'});
 a.reject();await p.locator('[data-new="bases"]').click();await p.locator('#field-nome').fill('Não pode salvar');await p.locator('#drawer-save').click();await p.getByText(/Falha de gravação do teste isolado/).first().waitFor();assert.ok(!a.rows.some(x=>x.dados.nome==='Não pode salvar'));
});
await run('cadastro-mobile',{width:390},async a=>{const p=a.page;await open(a,'gestao/#bases');await p.locator('[data-new="bases"]').click();await p.locator('#field-nome').fill('Cadastro móvel isolado');await p.locator('#drawer-save').click();await p.locator('#drawer-overlay').waitFor({state:'hidden'});assert.ok(a.rows.some(x=>x.dados.nome==='Cadastro móvel isolado'));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/cadastro-mobile.png',fullPage:true});});

for(const width of [1440,390])await run('ocorrencia-banco-'+width,{width},async a=>{
 const p=a.page;const finalStatus=width===390?'Arquivada':'Resolvida';await open(a,'index.html');
 const start=async()=>{
  await p.locator('#demo-new').click();await p.locator('[name=tipo]').selectOption('tipo-teste');
  await p.locator('[name=gravidade]').selectOption('3');await p.locator('[name=responsabilidade]').selectOption('publica');await p.locator('[name=evento]').selectOption('evento-teste');
  await p.locator('#cad-oc-next').click();await p.locator('[name=endereco]').fill('Endereço do teste isolado');await p.locator('#cad-oc-map').click();await p.locator('#cad-oc-pos').getByText(/Local selecionado/).waitFor();await p.locator('[name=bairro]').selectOption('Bairro Teste');
  await p.locator('#cad-oc-next').click();await p.locator('#cad-oc-next').click();
 };
 await start();await p.locator('button[value=triagem]').click();await p.locator('.cadastro-ocorrencia').waitFor({state:'hidden'});
 assert.equal(a.rows.filter(x=>x.colecao==='incidentes').length,1);
 assert.match(await p.locator('#panel-body').innerText(),/OC-/);
 await p.locator('#incidente-acoes').getByRole('button',{name:'Confirmada',exact:true}).click();await p.getByText('Queda de árvore · Confirmada',{exact:true}).waitFor();
 await p.reload();await p.locator('#backend-bar').waitFor();
 const records=await p.evaluate(()=>AlertaNuvem.repositorio().lista('incidentes'));assert.equal(records[0].status,'Confirmada');
 assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('operacao'))),false);
 await p.locator('#demo-new').waitFor();await start();await p.locator('[data-link]').click();await p.locator('.cadastro-ocorrencia').waitFor({state:'hidden'});
 assert.equal(a.rows.filter(x=>x.colecao==='incidentes').length,1);assert.equal(a.rows.find(x=>x.colecao==='incidentes').dados.relatos.length,1);
 await p.locator('#incidente-acoes').getByRole('button',{name:finalStatus,exact:true}).click();await p.getByText('Queda de árvore · '+finalStatus,{exact:true}).waitFor();
 await p.locator('#panel-close').click();await open(a,'gestao/#incidentes');assert.ok(await p.getByText('Abrir no mapa',{exact:true}).isVisible());assert.equal(await p.locator('[data-edit]').count(),0);await p.getByText('Abrir no mapa',{exact:true}).click();await p.locator('#backend-bar').waitFor();await p.getByText('Queda de árvore · '+finalStatus,{exact:true}).waitFor();await p.locator('#panel-close').click();a.reject();await start();await p.locator('button[value=triagem]').click();await p.locator('#cad-oc-error').getByText(/Falha de gravação/).waitFor();
 assert.equal(a.rows.filter(x=>x.colecao==='incidentes').length,1);
 await p.screenshot({path:out+'/ocorrencia-'+width+'.png',fullPage:true});
});
await run('permissoes-leitor' ,{role:'leitor'},async a=>{const p=a.page;await open(a,'gestao/#bases');assert.equal(await p.locator('[data-new="bases"]').isVisible(),false);assert.equal(await p.locator('[data-edit]').first().isVisible(),false);assert.equal(await p.locator('[data-delete]').first().isVisible(),false);
 const denied=await p.evaluate(async()=>{try{await AlertaNuvem.repositorio().gravar('bases',{nome:'Proibido'});return false}catch{return true}});assert.equal(denied,true);assert.equal(a.calls.length,0);await open(a,'index.html');assert.equal(await p.locator('#demo-new').isEnabled(),false);
 await open(a,'mapas/?tipo=colaboradores');assert.equal(await p.locator('[data-checkin]').first().isVisible(),false);assert.equal(await p.locator('[data-permission-collection="mobilizacoes"]').isVisible(),false);
});
await run('permissoes-rota',{role:'restrito'},async a=>{await open(a,'gestao/#bases');assert.match(await a.page.locator('#page').innerText(),/Acesso restrito/);});
await run('login-sem-sessao',{role:'anon'},async a=>{await a.page.goto('http://127.0.0.1:8783/gestao/');await a.page.locator('#backend-email').waitFor();assert.equal(await a.page.locator('#backend-demo').count(),0);assert.equal(await a.page.locator('#page [data-new]').count(),0);});
for(const width of [1440,390])for(const tipo of ['evento','colaboradores','ajuda'])await run(tipo+'-'+width,{width},async a=>{
 const p=a.page;await open(a,tipo==='evento'?'index.html':'mapas/?tipo='+tipo);await p.locator('.leaflet-marker-icon').first().waitFor();
 assert.ok(await p.locator('.leaflet-marker-icon').count()>=2);
 assert.doesNotMatch(await p.locator('body').innerText(),/Dados locais de demonstração|Act: presença registrada e situações simuladas/);
 if(tipo==='evento'){assert.equal(await p.locator('#demo-new').isEnabled(),true);}
 await p.screenshot({path:out+'/'+tipo+'-'+width+'.png',fullPage:true});
 if(tipo!=='evento'){
  await p.locator('#eventos-open').click();await p.locator('#eventos-painel').waitFor();
  assert.match(await p.locator('#eventos-painel').innerText(),/Saúde|saúde/);
  const before=await p.locator('.leaflet-marker-icon').count();
  await p.locator('[data-tipos="nenhum"]').click();assert.ok(await p.locator('.leaflet-marker-icon').count()<before);
  await p.locator('[data-tipos="todos"]').click();assert.equal(await p.locator('.leaflet-marker-icon').count(),before);
  await p.locator('#mun-busca').fill('Base de teste');assert.match(await p.locator('#mun-rows').innerText(),/Base de teste isolado/);
  await p.locator('[data-mun-loc]').first().click();
  await p.locator('#mun-busca').fill('');
  await p.locator('#eventos-close').click();
  if(tipo==='ajuda')await p.locator('#painel-ajuda-toggle').click();
  await p.locator('#camada').selectOption('bases');await p.locator('#busca').fill('inexistente');assert.match(await p.locator('#results').innerText(),/Nenhum|Não há/);
  await p.locator('#busca').fill('Base de teste');assert.match(await p.locator('#results').innerText(),/Base de teste isolado/);
  await p.locator('#zona').selectOption({label:'Zona Teste'});assert.match(await p.locator('#results').innerText(),/Base de teste isolado/);
 }
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'sem rolagem horizontal global');
});
fs.writeFileSync(out+'/resultado.json',JSON.stringify(report,null,2));if(report.some(x=>!x.ok))process.exitCode=1;
})();
