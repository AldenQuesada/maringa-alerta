// Páginas e Leaflet reais; só banco, tiles e rede externa são isolados.
const {test,expect}=require('@playwright/test');
const {ambiente}=require('./ambiente-mapas.cjs');
// Contrato aprovado. Nunca derivar a expectativa da configuração sob teste.
const APROVADAS={
 ajuda:{lat:-23.4196153,lng:-51.9357534,zoom:13.5732},
 colaboradores:{lat:-23.4201743,lng:-51.9334015,zoom:12},
 evento:{lat:-23.4130978,lng:-51.9164556,zoom:13.8408}
};
const origem='http://127.0.0.1:8784';
async function estado(page){return page.evaluate(()=>{
 const m=window.__cameraTeste.map,c=m.getCenter();
 return {lat:c.lat,lng:c.lng,zoom:m.getZoom(),min:m.getMinZoom(),arraste:m.dragging.enabled(),toque:m.touchZoom.enabled(),amostras:[...window.__cameraTeste.zooms]};
});}
async function canonica(page,camera){
 const atual=await estado(page);
 // Leaflet arredonda a origem para pixels; aceitar no máximo um pixel visual.
 // Os valores literais continuam protegidos, sem tolerância, pelo contrato Node.
 const desvio=await page.evaluate(c=>{const m=window.__cameraTeste.map;return m.project(m.getCenter()).distanceTo(m.project([c.lat,c.lng]));},camera);
 expect(desvio).toBeLessThanOrEqual(1);
 expect(atual.zoom).toBeCloseTo(camera.zoom,7);expect(atual.min).toBe(camera.zoom);
 expect(atual.arraste).toBe(true);expect(atual.toque).toBe(true);
 await expect(page.getByRole('button',{name:'Zoom out',exact:true})).toHaveAttribute('aria-disabled','true');
}
async function encerrarAnimacao(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.waitForFunction(()=>{
 const m=window.__cameraTeste.map;
 return !m._animatingZoom&&!m._panAnim?._inProgress&&!m.touchZoom._zooming;
});}
async function gestos(page,context,browserName){
 const cdp=browserName==='chromium'?await context.newCDPSession(page):null;
 async function enviar(type,points){
  if(cdp)return cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({x:p.x,y:p.y,id:i+1,radiusX:5,radiusY:5,force:1}))});
  // Playwright não oferece multitouch no WebKit; eventos TouchEvent percorrem
  // os listeners reais do Leaflet, sem invocar seus manipuladores privados.
  // dispatchEvent adapta Touch/TouchList ao WebKit (new Touch é ilegal nele).
  const touches=points.map((p,i)=>({identifier:i+1,clientX:p.x,clientY:p.y,screenX:p.x,screenY:p.y,radiusX:5,radiusY:5,force:1}));
  await page.locator('#map').dispatchEvent(type.toLowerCase(),{touches,targetTouches:touches,changedTouches:touches});
 }
 async function quadro(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
 return {
  async pinca(inicio,fim,{cancelar=false}={}){
   const box=await page.locator('#map').boundingBox();
   const x=box.x+box.width-50,y=box.y+Math.min(box.height*.65,innerHeightSeguro(box.height));
   const pontos=d=>[{x:x-d/2,y},{x:x+d/2,y}];
   await page.evaluate(()=>window.__cameraTeste.zooms=[]);
   await enviar('touchStart',pontos(inicio));await quadro();
   for(let i=1;i<=12;i++){await enviar('touchMove',pontos(inicio+(fim-inicio)*i/12));await quadro();}
   await enviar(cancelar?'touchCancel':'touchEnd',[]);await quadro();await encerrarAnimacao(page);
  },
  async arrastar(){
   const box=await page.locator('#map').boundingBox();
   const x=box.x+box.width-30,y=box.y+box.height*.57;
   await enviar('touchStart',[{x,y}]);await quadro();
   for(let i=1;i<=12;i++){await enviar('touchMove',[{x:x-3*i,y:y+1.5*i}]);await quadro();}
   await enviar('touchEnd',[]);await quadro();await encerrarAnimacao(page);
  }
 };
}
// Gestos ficam no mapa, afastados da atribuição e dos controles.
function innerHeightSeguro(h){return Math.max(80,h-80);}

for(const [tipo,aprovada] of Object.entries(APROVADAS))test(tipo+': câmera, retorno, arraste e pinça móveis',async({browser,browserName},testInfo)=>{
 const options=testInfo.project.use;
 const a=await ambiente({browser,contextOptions:{viewport:options.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
 const {page,context}=a;
 await context.tracing.start({screenshots:true,snapshots:true});
 try{
  // Observação somente: não altera opções, câmera nem métodos do mapa.
  await page.addInitScript(()=>{
   let leaflet;
   Object.defineProperty(window,'L',{configurable:true,get:()=>leaflet,set:value=>{
    leaflet=value;if(!value?.Map||value.Map.__observado)return;value.Map.__observado=true;
    value.Map.addInitHook(function(){if(this.getContainer().id!=='map')return;
     window.__cameraTeste={map:this,zooms:[]};
     this.on('zoom',()=>window.__cameraTeste.zooms.push(this.getZoom()));
    });
   }});
  });
  const url=origem+(tipo==='evento'?'/index.html':'/mapas/?tipo='+tipo);
  const abrir=async()=>{
   await page.goto(url);await page.getByRole('button',{name:'Voltar à posição original',exact:true}).waitFor();
   await page.waitForFunction(()=>window.__cameraTeste?.map?.getMinZoom()>2);
   await encerrarAnimacao(page);
  };
  await abrir();await canonica(page,aprovada);
  expect(await page.evaluate(()=>innerWidth)).toBe(options.viewport.width);
  await test.step('barra técnica removida dos mapas',async()=>{
   await expect(page.locator('#backend-bar,[data-refresh],[data-logout]')).toHaveCount(0);
   await expect(page.getByText('Conectado · cadastros no Supabase',{exact:true})).toHaveCount(0);
  });
  const gesto=await gestos(page,context,browserName);
  const voltar=async()=>{await page.getByRole('button',{name:'Voltar à posição original',exact:true}).tap();await encerrarAnimacao(page);await canonica(page,aprovada);};
  await test.step('arraste de um dedo no zoom inicial',async()=>{
   await gesto.arrastar();const movida=await estado(page);
   expect(Math.abs(movida.lng-aprovada.lng)).toBeGreaterThan(.0001);expect(movida.zoom).toBe(aprovada.zoom);
   await voltar();
  });
  await test.step('pinça aproxima e depois cruza o limite',async()=>{
   await gesto.pinca(40,84);expect((await estado(page)).zoom).toBeGreaterThan(aprovada.zoom+.8);
   await gesto.pinca(84,12);const atual=await estado(page);
   expect(atual.amostras.length).toBeGreaterThan(0);expect(Math.min(...atual.amostras)).toBeGreaterThanOrEqual(aprovada.zoom-1e-8);
   expect(atual.zoom).toBeCloseTo(aprovada.zoom,7);expect(atual.arraste).toBe(true);await voltar();
  });
  await test.step('pinça no mínimo e cancelamento nunca afastam além dele',async()=>{
   for(const cancelar of [false,true]){
    await gesto.pinca(84,12,{cancelar});const atual=await estado(page);
    expect(atual.amostras.length).toBeGreaterThan(0);expect(Math.min(...atual.amostras)).toBeGreaterThanOrEqual(aprovada.zoom-1e-8);
    expect(atual.zoom).toBeCloseTo(aprovada.zoom,7);await voltar();
   }
  });
  await test.step('botões de zoom respeitam o limite e retorno',async()=>{
   await page.getByRole('button',{name:'Zoom in',exact:true}).tap();await encerrarAnimacao(page);
   expect((await estado(page)).zoom).toBeGreaterThan(aprovada.zoom);
   await voltar();
   // O controle está desabilitado de propósito; tocar nele deve ser inofensivo.
   await page.getByRole('button',{name:'Zoom out',exact:true}).tap({force:true});await encerrarAnimacao(page);await canonica(page,aprovada);
  });
  await test.step('rotação e recarga preservam a referência',async()=>{
   await page.setViewportSize({width:options.viewport.height,height:options.viewport.width});await page.waitForTimeout(150);await canonica(page,aprovada);
   await page.setViewportSize(options.viewport);await page.waitForTimeout(150);await canonica(page,aprovada);
   await gesto.arrastar();await page.reload();await page.getByRole('button',{name:'Voltar à posição original',exact:true}).waitFor();await canonica(page,aprovada);
  });
  expect(a.errors).toEqual([]);expect(a.blocked).toEqual([]);expect(a.calls).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('canonico.png')});
 }catch(error){
  await page.screenshot({path:testInfo.outputPath('falha.png'),fullPage:true}).catch(()=>{});
  throw error;
 }finally{
  await context.tracing.stop({path:testInfo.outputPath('trace.zip')}).catch(()=>{});await context.close();
 }
});
