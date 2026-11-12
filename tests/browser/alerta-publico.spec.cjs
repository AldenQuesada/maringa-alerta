// Página pública do aviso: página real; a função do servidor é simulada com o formato de wa.ma_wa_aviso_publico.
const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261111220000_alertas_envio.sql'),'utf8');
const envio=JSON.parse(sql.slice(sql.indexOf('$j$',sql.indexOf("'{protecaoAnimal,envio}'"))+3,sql.indexOf('$j$',sql.indexOf('$j$',sql.indexOf("'{protecaoAnimal,envio}'"))+3)));
const textos=envio.paginaPublica.textos;
const base='http://127.0.0.1:8784/alerta/';
async function abrir(browser,testInfo,resposta){
 const o=testInfo.project.use;
 const context=await browser.newContext({viewport:o.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
 const pedidos=[],errors=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/functions/v1/ma-aviso-publico'){
   pedidos.push(url.search);
   if(url.searchParams.get('foto')==='1')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
   return resposta?route.fulfill({contentType:'application/json',body:JSON.stringify(resposta)}):route.fulfill({status:404,contentType:'application/json',body:'{"erro":"nao_encontrado"}'});
  }
  if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {context,page,pedidos,errors};
}
const alerta={colecao:'alertas',cidade:'Maringá',textos:textos.alertas,rodape:textos.rodape,titulo:'Animal perdido',icone:'🐾',mensagem:'Cão caramelo, coleira azul.\nAtende por Thor.',
 especie:'Cão',bairro:'Zona 7',area:['Zona 7','Vila Operária'],publicado_em:'2026-11-11T15:00:00Z',encerrado:false,desfecho:null,foto:true};

test('alerta aprovado: mensagem, foto, área e ajuda, sem rolagem lateral',async({browser},testInfo)=>{
 const a=await abrir(browser,testInfo,alerta);
 try{
  await a.page.goto(base+'?m=maringa&c=alertas&id=alerta-1');
  await expect(a.page.getByRole('heading',{level:1})).toHaveText('🐾 Animal perdido');
  await expect(a.page.locator('.aviso-mensagem')).toHaveText('Cão caramelo, coleira azul.\nAtende por Thor.');
  await expect(a.page.locator('.aviso-foto')).toBeVisible();
  await expect(a.page.locator('dl')).toContainText('Zona 7, Vila Operária');
  await expect(a.page.locator('.aviso-ajuda')).toHaveText(textos.alertas.ajuda);
  await expect(a.page.locator('footer')).toHaveText(textos.rodape);
  await expect(a.page).toHaveTitle('Animal perdido · Maringá');
  expect(a.pedidos[0]).toBe('?m=maringa&c=alertas&id=alerta-1');
  expect(await a.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});

test('alerta encerrado: mostra o desfecho, sem foto e sem pedido de ajuda',async({browser},testInfo)=>{
 const a=await abrir(browser,testInfo,{...alerta,encerrado:true,desfecho:'Reunido com o tutor'});
 try{
  await a.page.goto(base+'?m=maringa&c=alertas&id=alerta-1');
  await expect(a.page.locator('.aviso-encerrado')).toHaveText(textos.alertas.encerrado);
  await expect(a.page.locator('dl')).toContainText('Reunido com o tutor');
  await expect(a.page.locator('.aviso-foto')).toHaveCount(0);
  await expect(a.page.locator('.aviso-ajuda')).toHaveCount(0);
 }finally{await a.context.close();}
});

test('ação nos bairros: data, horário e local',async({browser},testInfo)=>{
 const a=await abrir(browser,testInfo,{colecao:'acoes',cidade:'Maringá',textos:textos.acoes,rodape:textos.rodape,titulo:'Feira de adoção da praça',tipo:'Feira de adoção',
  data:'2026-11-22',horario:'9h às 13h',endereco:'Praça Central',bairro:'Zona 7',descricao:'Traga documento.',situacao:'Agendada'});
 try{
  await a.page.goto(base+'?m=maringa&c=acoes&id=acao-1');
  await expect(a.page.getByRole('heading',{level:1})).toHaveText('Feira de adoção da praça');
  await expect(a.page.locator('dl')).toContainText('22/11/2026, 9h às 13h');
  await expect(a.page.locator('dl')).toContainText('Praça Central, Zona 7');
  await expect(a.page.locator('.aviso-encerrado')).toHaveCount(0);
 }finally{await a.context.close();}
});

test('aviso inexistente ou link incompleto: mensagem clara, sem erro de página',async({browser},testInfo)=>{
 const a=await abrir(browser,testInfo,null);
 try{
  await a.page.goto(base+'?m=maringa&c=alertas&id=nao-existe');
  await expect(a.page.getByRole('status')).toHaveText('Este aviso não está disponível. Confira o link recebido no WhatsApp.');
  await a.page.goto(base);
  await expect(a.page.getByRole('status')).toHaveText('Este aviso não está disponível. Confira o link recebido no WhatsApp.');
  expect(a.pedidos).toEqual(['?m=maringa&c=alertas&id=nao-existe']);
  expect(a.errors).toEqual([]);
 }finally{await a.context.close();}
});
