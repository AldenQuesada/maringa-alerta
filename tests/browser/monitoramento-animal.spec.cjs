// Mapa Monitoramento animal: página e Leaflet reais; banco, tiles e rede externa isolados.
const {test,expect}=require('@playwright/test');
const {ambiente,enquadramento}=require('./ambiente-monitoramento-animal.cjs');
const url='http://127.0.0.1:8784/mapas/monitoramento-animal.html';

async function abrir({browser},testInfo,extra={}){
 const o=testInfo.project.use;
 const {viewport=o.viewport,...resto}=extra;
 const a=await ambiente({browser,...resto,contextOptions:{viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
 await a.page.addInitScript(()=>{
  let leaflet;
  Object.defineProperty(window,'L',{configurable:true,get:()=>leaflet,set:value=>{
   leaflet=value;if(!value?.Map||value.Map.__observado)return;value.Map.__observado=true;
   value.Map.addInitHook(function(){if(this.getContainer().id==='map')window.__cameraTeste={map:this};});
  }});
 });
 await a.page.goto(url,{waitUntil:'domcontentloaded'});
 await a.page.getByRole('button',{name:'Voltar à posição original',exact:true}).waitFor();
 await a.page.waitForFunction(()=>window.__cameraTeste?.map?.getMinZoom()>2);
 return a;
}

// Abertura: os limites dos bairros do perfil cabem inteiros no mapa, no celular e em monitor.
for(const viewport of [null,{width:1440,height:810},{width:1920,height:960}])
test('abre com a cidade inteira na tela'+(viewport?' em '+viewport.width+'x'+viewport.height:'')+', sem rolagem lateral e sem erros',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,viewport?{viewport}:{});const {page}=a;
 try{
  const m=await page.evaluate(([[s,w],[n,e]])=>{const m=window.__cameraTeste.map,b=m.getBounds();
   return {cabe:[[s,w],[s,e],[n,e],[n,w]].every(p=>b.contains(p)),minimo:m.getMinZoom(),zoom:m.getZoom()};},enquadramento);
  expect(m.cabe).toBe(true);expect(m.zoom).toBeCloseTo(m.minimo,3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#map')).toHaveCSS('background-color','rgb(23, 42, 55)');
  expect(a.errors).toEqual([]);expect(a.calls.map(x=>x.name).filter(n=>!['ma_catalogo_territorial','ma_territorio_listar'].includes(n))).toEqual([]);
  expect(a.blocked.filter(u=>!u.includes('fonts.g'))).toEqual([]);
 }finally{await a.context.close();}
});

test('nada do mapa de Ajuda: sem cadastros da Prefeitura, sem painel de filtros de unidades',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await expect(page.locator('.ma-animal-pin')).toHaveCount(3);
  await expect(page.getByTitle('Centro de doações fictício')).toHaveCount(0);
  await expect(page.locator('#eventos-open,#eventos-painel,#filtros-cadastros-municipais')).toHaveCount(0);
  expect(await page.evaluate(()=>['FiltrosCadastros','FichaPonto','PainelEventos'].filter(x=>x in window))).toEqual([]);
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('perfil, filtros e marcadores vêm do banco',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await expect(page.locator('#title')).toHaveText('Monitoramento animal');
  await expect(page.locator('#eyebrow')).toHaveText('PROTEÇÃO ANIMAL');
  await expect(page.locator('#filtro option')).toHaveText(['Todas as situações','Animal encontrado','Animal ferido ou em risco','Animal perdido','Maus-tratos ou abandono']);
  await expect(page.locator('#camada option')).toHaveText(['Todas as camadas','Triagem','Ocorrências','Ações nos bairros']);
  // Dois relatos de animal, uma ocorrência aberta e uma feira agendada; o relato fora do módulo, a resolvida,
  // a feira passada e a cancelada não aparecem.
  await expect(page.locator('#list-count')).toHaveText('4 registros · 1 sem posição');
  await expect(page.locator('#metric-one')).toHaveText('2');await expect(page.locator('#metric-two')).toHaveText('1');await expect(page.locator('#metric-three')).toHaveText('1');
  await expect(page.locator('.ma-animal-pin')).toHaveCount(3);
  await expect(page.locator('.ma-animal-pin.triagem')).toHaveCount(1);
  await expect(page.getByTitle('Clínica veterinária fictícia')).toHaveCount(1);
  await page.getByLabel('Mostrar resolvidas e arquivadas').check();
  await expect(page.locator('#list-count')).toHaveText('5 registros · 1 sem posição');
  await page.locator('#filtro').selectOption('animal-perdido');
  await expect(page.locator('.ma-animal-result')).toHaveCount(1);
  await page.locator('.ma-animal-result').click();
  await expect(page.locator('#ma-animal-ficha')).toBeVisible();
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('Aproximada pelo bairro');
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('Bairro Teste');
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('ações nos bairros: feira agendada no mapa, com data e horário na ficha, sem triagem',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#camada').selectOption('acoes');
  await expect(page.locator('.ma-animal-result')).toHaveCount(1);
  await expect(page.locator('.ma-animal-result')).toContainText('Feira de adoção fictícia');
  await page.locator('.ma-animal-result').click();
  await expect(page.locator('#ma-animal-ficha-tipo')).toHaveText('AÇÃO · Agendada');
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('Feira de adoção');
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('9h às 13h');
  await expect(page.locator('#ma-animal-ficha-triagem')).toBeEmpty();
  await expect(page.getByTitle(/Feira passada|Feira cancelada/)).toHaveCount(0);
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('sem perfil no banco, mostra o erro e não monta o mapa',async({browser},testInfo)=>{
 const o=testInfo.project.use;
 const a=await ambiente({browser,contextOptions:{viewport:o.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
 await a.page.route('**/monitoramento-animal.js*',async route=>{const r=await route.fetch();route.fulfill({response:r,body:(await r.text()).replace('documento?.[ID]','documento?.["inexistente"]')});});
 try{
  await a.page.goto(url);
  await expect(a.page.getByRole('alert')).toHaveText('Perfil do mapa Monitoramento animal não está configurado no banco.');
  expect(await a.page.evaluate(()=>!!document.querySelector('#map.leaflet-container'))).toBe(false);
 }finally{await a.context.close();}
});

test('triagem: ações do banco, exigência do banco e gravação só pela função do servidor',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#filtro').selectOption('animal-perdido');
  await page.locator('.ma-animal-result').click();
  const triagem=page.locator('#ma-animal-ficha-triagem');
  await expect(triagem.getByRole('button')).toHaveText(['Confirmar e abrir ocorrência','Arquivar relato']);
  // Confirmar: o bairro aproximado já vem escolhido; o cliente não envia coordenadas.
  await triagem.getByRole('button',{name:'Confirmar e abrir ocorrência'}).click();
  await expect(triagem.locator('select[name=bairro_id]')).toHaveValue('bairro-teste');
  await triagem.getByRole('button',{name:'Cancelar'}).click();
  await triagem.getByRole('button',{name:'Arquivar relato'}).click();
  await expect(triagem.locator('select[name=motivo] option')).toHaveText(['Escolha o motivo','Relato duplicado','Fora do município','Sem informação suficiente','Informação falsa ou trote']);
  await triagem.locator('select[name=motivo]').selectOption('Relato duplicado');
  await Promise.all([page.waitForEvent('load'),triagem.getByRole('button',{name:'Confirmar',exact:true}).click()]);
  expect(a.calls.filter(c=>c.name==='ma_triar_animal').map(c=>c.args)).toEqual([{municipio:'maringa',colecao_alvo:'relatos',registro:'relato-perdido',acao:'arquivar',status_esperado:'Em triagem',detalhe:{motivo:'Relato duplicado'}}]);
  await expect(page.locator('#toast')).toHaveText('Arquivar relato: registrado.');
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('sem a capacidade de triagem, a ficha só consulta',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,{capacidades:[]});const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('.ma-animal-result').first().click();
  await expect(page.locator('#ma-animal-ficha-triagem')).toContainText('Sua conta pode consultar, mas não fazer triagem.');
  await expect(page.locator('#ma-animal-ficha-triagem button')).toHaveCount(0);
  expect(a.calls.filter(c=>c.name==='ma_triar_animal')).toEqual([]);
 }finally{await a.context.close();}
});

// Alerta do bairro: aprovar e enviar só pelas funções do servidor; público, área e situação vêm do painel do banco.
test('alerta do bairro: aprova e envia pela função do servidor, com público e entrega do banco',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,{capacidades:['triar_animais','aprovar_alerta'],envioAtivo:true});const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#filtro').selectOption('animal-ferido');
  await page.locator('.ma-animal-result').click();
  const envio=page.locator('#ma-animal-ficha-envio');
  await expect(envio.getByRole('heading')).toHaveText('Alerta do bairro');
  await expect(envio).toContainText('4 inscritos na área: Bairro Teste');
  await envio.locator('textarea[name=mensagem]').fill('Cão ferido, porte médio, coleira vermelha.');
  await envio.getByRole('button',{name:'Aprovar e enviar'}).click();
  await expect(envio.getByRole('status')).toHaveText('4 mensagens na fila.');
  await expect(envio.locator('blockquote')).toHaveText('Cão ferido, porte médio, coleira vermelha.');
  await expect(envio.locator('[data-entregas]')).toHaveText('Na fila 4 · enviados 0 · entregues 0 · lidos 0 · falhas 0');
  await expect(envio.getByRole('link',{name:'Ver página do alerta'})).toHaveAttribute('href','../alerta/?m=maringa&c=alertas&id=alerta-teste');
  expect(a.calls.filter(c=>c.name.startsWith('ma_alerta')||c.name==='ma_enviar_inscritos').map(c=>[c.name,c.args])).toEqual([
   ['ma_alerta_aprovar',{municipio:'maringa',incidente:'oc-ferido',mensagem:'Cão ferido, porte médio, coleira vermelha.',mostrar_foto:false}],
   ['ma_enviar_inscritos',{municipio:'maringa',colecao_alvo:'alertas',registro:'alerta-teste'}]]);
  // Repetir o envio só alcança inscritos novos; o servidor decide.
  await envio.getByRole('button',{name:'Enviar aos novos inscritos'}).click();
  await expect(envio.getByRole('status')).toHaveText('0 mensagens na fila.');
  const largura=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(largura).toBeLessThanOrEqual(0);
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('alerta do bairro: com o envio desligado, só aprova e avisa',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,{capacidades:['triar_animais','aprovar_alerta']});const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#filtro').selectOption('animal-ferido');
  await page.locator('.ma-animal-result').click();
  const envio=page.locator('#ma-animal-ficha-envio');
  await expect(envio).toContainText('O envio pelo WhatsApp ainda não está ligado.');
  await envio.locator('textarea[name=mensagem]').fill('Gato perdido.');
  await envio.getByRole('button',{name:'Aprovar alerta'}).click();
  await expect(envio.getByRole('status')).toHaveText('Alerta aprovado.');
  await expect(envio.getByRole('button')).toHaveCount(0);
  expect(a.calls.filter(c=>c.name==='ma_enviar_inscritos')).toEqual([]);
 }finally{await a.context.close();}
});

test('alerta do bairro: sem a capacidade de aprovar, não há botão; relato em triagem não tem alerta',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#filtro').selectOption('animal-ferido');
  await page.locator('.ma-animal-result').click();
  await expect(page.locator('#ma-animal-ficha-envio')).toContainText('Sua conta pode consultar, mas não aprovar nem enviar alertas.');
  await expect(page.locator('#ma-animal-ficha-envio button')).toHaveCount(0);
  await page.locator('#filtro').selectOption('animal-perdido');
  await page.locator('.ma-animal-result').click();
  await expect(page.locator('#ma-animal-ficha-envio')).toBeEmpty();
 }finally{await a.context.close();}
});

test('ações nos bairros: aviso aos inscritos pela mesma função do servidor',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,{capacidades:['aprovar_alerta'],envioAtivo:true});const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#camada').selectOption('acoes');
  await page.locator('.ma-animal-result').click();
  const envio=page.locator('#ma-animal-ficha-envio');
  await expect(envio.getByRole('heading')).toHaveText('Aviso aos inscritos');
  await envio.getByRole('button',{name:'Enviar aos inscritos'}).click();
  await expect(envio.getByRole('status')).toHaveText('4 mensagens na fila.');
  await expect(envio.getByRole('link',{name:'Ver página do alerta'})).toHaveAttribute('href','../alerta/?m=maringa&c=acoes&id=acao-feira');
  expect(a.calls.filter(c=>c.name==='ma_enviar_inscritos').map(c=>c.args)).toEqual([{municipio:'maringa',colecao_alvo:'acoes',registro:'acao-feira'}]);
 }finally{await a.context.close();}
});

// Revisão por IA: o relatório gravado pelo servidor aparece na ficha do relato; a sugestão vem no formulário do alerta, editável.
test('revisão por IA: relatório na ficha do relato e sugestão editável no alerta',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo,{capacidades:['triar_animais','aprovar_alerta'],sugestao:'Cão ferido, coleira vermelha, Av. Teste.'});const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await page.locator('#filtro').selectOption('animal-perdido');
  await page.locator('.ma-animal-result').click();
  const revisao=page.locator('#ma-animal-ficha-revisao');
  await expect(revisao.getByRole('heading')).toHaveText('Relatório da IA');
  await expect(revisao).toContainText('Cão caramelo perdido na Rua Teste.');
  await expect(revisao).toContainText('Urgência: Média');
  await expect(revisao.locator('li')).toHaveText(['Sem ponto de referência']);
  await expect(revisao).toContainText('Gerado por IA a partir do relato. Confira antes de decidir.');
  await page.locator('#filtro').selectOption('animal-ferido');
  await page.locator('.ma-animal-result').click();
  await expect(revisao).toBeEmpty();
  const envio=page.locator('#ma-animal-ficha-envio');
  await expect(envio.locator('textarea[name=mensagem]')).toHaveValue('Cão ferido, coleira vermelha, Av. Teste.');
  await expect(envio.locator('[data-sugestao]')).toHaveText('Texto sugerido pela IA a partir do relato. Confira e edite antes de aprovar.');
  await envio.locator('textarea[name=mensagem]').fill('Cão ferido, coleira vermelha.');
  await envio.getByRole('button',{name:'Aprovar alerta'}).click();
  await expect(envio.getByRole('status')).toHaveText('Alerta aprovado.');
  expect(a.calls.find(c=>c.name==='ma_alerta_aprovar').args.mensagem).toBe('Cão ferido, coleira vermelha.');
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});
