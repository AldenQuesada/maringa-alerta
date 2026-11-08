// Fixture exclusiva do navegador isolado; nunca expõe ou acessa Supabase remoto.
const D=require('../../gestao/dados.js');
const operacao={};
async function ambiente({browser,contextOptions={},latenciaMs=0,segurarSessao=false}){
 const esperar=()=>new Promise(resolve=>setTimeout(resolve,latenciaMs));
 let liberarSessao;
 const sessaoPronta=new Promise(resolve=>{liberarSessao=resolve;});
 if(!segurarSessao)liberarSessao();
 const context=await browser.newContext({...contextOptions,serviceWorkers:'block'});
 const city={id:'maringa',nome:'Maringá',uf:'PR',codigo_ibge:'4115200',status:'ativa',lat:-23.4205,lng:-51.9333,bbox_navegacao:[-23.578,-23.235,-52.123,-51.813]};
 const rows=[],calls=[],blocked=[],errors=[];
 const fixture=(colecao,id,dados)=>rows.push({municipio_id:city.id,colecao,id,dados:{id,municipioId:city.id,...dados},versao:1});
 fixture('eventos','evento-teste',{nome:'Evento de teste isolado',tipo:'Vendaval',status:'Em andamento'});
 fixture('ocorrenciaTipos','tipo-teste',{nome:'Queda de árvore',prioridade:'Alta'});
 fixture('zonas','zona-teste',{nome:'Zona Teste',verificacao:'Validado'});
 fixture('bairros','bairro-teste',{nome:'Bairro Teste',zona:'Zona Teste',verificacao:'Validado',geojson:JSON.stringify({type:'Polygon',coordinates:[[[-51.95,-23.43],[-51.92,-23.43],[-51.92,-23.40],[-51.95,-23.40],[-51.95,-23.43]]]})});
 fixture('bases','base-teste',{nome:'Base de teste isolado',tipo:'Ponto de água potável',zona:'Zona Teste',bairro:'Bairro Teste',endereco:'Endereço exclusivo do teste',lat:-23.4205,lng:-51.9333,verificacao:'Validado'});
 fixture('instituicoes','ubs-teste',{nome:'UBS de teste isolado',categoria:'Saúde',tipo:'UBS',zona:'Zona Teste',lat:-23.422,lng:-51.932,verificacao:'Validado'});
 fixture('voluntarios','voluntario-teste',{nome:'Colaborador de teste isolado',tipo_pessoa:'FÍSICA',telefone:'44999990000',endereco:'Endereço exclusivo do teste',zona:'Zona Teste',bairro:'Bairro Teste',ajudas:['LIMPEZA'],disponibilidade:'Disponível',lat:-23.421,lng:-51.934});
 fixture('solicitacoes','pedido-teste',{nome:'Pedido de teste isolado',telefone:'44999990000',endereco:'Endereço exclusivo do teste',zona:'Zona Teste',necessidade:'Água potável',status:'Aguardando',urgencia:'Normal',lat:-23.423,lng:-51.935});
 const caps=()=>({maringa:Object.fromEntries([...new Set(Object.values(D.ESQUEMAS).map(x=>x.collection))].map(c=>[c,{ler:c!=='incidentes',gravar:false,excluir:false}]))});
 await context.exposeBinding('__fixtureSession',async()=>{await sessaoPronta;return {data:{session:{}}};});
 await context.exposeBinding('__fixtureRequest',async(_,type,name,args)=>{
  if(latenciaMs)await esperar();
  if(type==='query'){
   if(name==='ma_configuracao')return {data:{documento:args.find(x=>x[0]==='id')?.[1]==='interface'?{esquemas:D.ESQUEMAS,catalogos:D.CATALOGOS,grupos:D.GROUPS}:operacao}};
   return {data:name==='ma_prefeituras'?[{id:city.id,dados:city,versao:1}]:name==='ma_cadastros'?rows.filter(x=>caps().maringa[x.colecao]?.ler):[]};
  }
  if(name==='ma_meu_perfil')return {data:{admin_plataforma:false}};
  if(name==='ma_minhas_capacidades')return {data:caps()};
  calls.push({name,args});
  return {error:{message:'Escrita ou RPC inesperada no teste de câmera: '+name}};
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(latenciaMs&&['script','stylesheet'].includes(route.request().resourceType()))await esperar();
  if(url.hostname.endsWith('supabase.co')){blocked.push(url.href);return route.abort();}
  if(url.pathname.includes('/backend/vendor/supabase-'))return route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:()=>window.__fixtureSession(),getUser:async()=>({data:{user:{email:'teste@example.invalid'}}}),onAuthStateChange(){},signOut:async()=>({}),signInWithOtp:async()=>({error:{message:'Envio bloqueado no teste'}})},from(table){const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},range(){return window.__fixtureRequest('query',table,filters)},single(){return window.__fixtureRequest('query',table,filters)}};return q},rpc:(name,args)=>window.__fixtureRequest('rpc',name,args)})};`});
  {
   const arquivos={
    '/ajax/libs/leaflet/1.9.4/leaflet.min.js':['leaflet/dist/leaflet.js','text/javascript'],
    '/ajax/libs/leaflet/1.9.4/leaflet.min.css':['leaflet/dist/leaflet.css','text/css'],
    '/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js':['leaflet.heat/dist/leaflet-heat.js','text/javascript']
   };
   const arquivo=url.hostname==='cdnjs.cloudflare.com'&&arquivos[url.pathname];
   if(arquivo)return route.fulfill({path:require.resolve(arquivo[0]),contentType:arquivo[1]});
   if(url.hostname.endsWith('.tile.openstreetmap.org'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
   if(!['127.0.0.1','localhost'].includes(url.hostname)){
    blocked.push(url.href);return route.abort();
   }
  }
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {browser,context,page,rows,calls,blocked,errors,liberarSessao};
}
module.exports={ambiente};
