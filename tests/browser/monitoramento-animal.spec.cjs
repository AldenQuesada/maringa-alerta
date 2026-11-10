// Mapa Monitoramento animal: página e Leaflet reais; banco, tiles e rede externa isolados.
const {test,expect}=require('@playwright/test');
const {ambiente}=require('./ambiente-monitoramento-animal.cjs');
// Câmera do mapa de Ajuda, aprovada em 07/11/2026. Nunca derivar da configuração sob teste.
const AJUDA={lat:-23.4196153,lng:-51.9357534,zoom:13.5732};
const url='http://127.0.0.1:8784/mapas/monitoramento-animal.html';

async function abrir({browser},testInfo,extra={}){
 const o=testInfo.project.use;
 const a=await ambiente({browser,...extra,contextOptions:{viewport:o.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
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

test('abre na câmera do mapa de Ajuda, sem rolagem lateral e sem erros',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  const m=await page.evaluate(c=>{const m=window.__cameraTeste.map;return {zoom:m.getZoom(),desvio:m.project(m.getCenter()).distanceTo(m.project([c.lat,c.lng]))};},AJUDA);
  expect(m.desvio).toBeLessThanOrEqual(1);expect(m.zoom).toBeCloseTo(AJUDA.zoom,7);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#map')).toHaveCSS('background-color','rgb(23, 42, 55)');
  expect(a.errors).toEqual([]);expect(a.calls.map(x=>x.name).filter(n=>!['ma_catalogo_territorial','ma_territorio_listar'].includes(n))).toEqual([]);
  expect(a.blocked.filter(u=>!u.includes('fonts.g'))).toEqual([]);
 }finally{await a.context.close();}
});

test('perfil, filtros e marcadores vêm do banco',async({browser},testInfo)=>{
 const a=await abrir({browser},testInfo);const {page}=a;
 try{
  await page.getByRole('button',{name:'Abrir painel',exact:true}).click();
  await expect(page.locator('#title')).toHaveText('Monitoramento animal');
  await expect(page.locator('#eyebrow')).toHaveText('PROTEÇÃO ANIMAL');
  await expect(page.locator('#filtro option')).toHaveText(['Todas as situações','Animal encontrado','Animal ferido ou em risco','Animal perdido','Maus-tratos ou abandono']);
  await expect(page.locator('#camada option')).toHaveText(['Todas as camadas','Triagem','Ocorrências']);
  // Dois relatos de animal e uma ocorrência aberta; o relato fora do módulo e a resolvida não aparecem.
  await expect(page.locator('#list-count')).toHaveText('3 registros · 1 sem posição');
  await expect(page.locator('#metric-one')).toHaveText('2');await expect(page.locator('#metric-two')).toHaveText('1');await expect(page.locator('#metric-three')).toHaveText('1');
  await expect(page.locator('.ma-animal-pin')).toHaveCount(2);
  await expect(page.locator('.ma-animal-pin.triagem')).toHaveCount(1);
  await expect(page.getByTitle('Clínica veterinária fictícia')).toHaveCount(1);
  await page.getByLabel('Mostrar resolvidas e arquivadas').check();
  await expect(page.locator('#list-count')).toHaveText('4 registros · 1 sem posição');
  await page.locator('#filtro').selectOption('animal-perdido');
  await expect(page.locator('.ma-animal-result')).toHaveCount(1);
  await page.locator('.ma-animal-result').click();
  await expect(page.locator('#ma-animal-ficha')).toBeVisible();
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('Aproximada pelo bairro');
  await expect(page.locator('#ma-animal-ficha-dados')).toContainText('Bairro Teste');
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
