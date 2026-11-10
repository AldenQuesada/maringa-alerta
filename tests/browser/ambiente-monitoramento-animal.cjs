// Ambiente do Monitoramento animal: cópia de ambiente-mapas.cjs com perfil, tipos e relatos de animais.
// Nunca expõe ou acessa Supabase remoto.
const D=require('../../gestao/dados.js');
const fs=require('node:fs');
// Perfil, regras e modelo lidos da própria migração: o teste não inventa configuração.
const sql=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261108194500_monitoramento_animal.sql'),'utf8');
const bloco=(inicio)=>{const i=sql.indexOf(inicio);const a=sql.indexOf('$j$',i)+3;return JSON.parse(sql.slice(a,sql.indexOf('$j$',a)));};
const sqlD=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261110120000_monitoramento_animal_triagem.sql'),'utf8');
const blocoD=(inicio)=>{const i=sqlD.indexOf(inicio);const a=sqlD.indexOf('$j$',i)+3;return JSON.parse(sqlD.slice(a,sqlD.indexOf('$j$',a)));};
// Perfil e regras como ficam no banco depois das etapas A e D.
const mapasA=bloco("values('mapas'");
const mapas={'monitoramento-animal':{...mapasA['monitoramento-animal'],...blocoD("'{monitoramento-animal}'")}};
const modelo=bloco("values('modelos'")['protecao-animal'];
const regras={...bloco("'{protecaoAnimal}'"),triagem:blocoD("'{protecaoAnimal,triagem}'")};
const operacao={protecaoAnimal:regras};
const esquemas={...D.ESQUEMAS,incidentes:{label:'Ocorrências',singular:'Ocorrência',collection:'incidentes',columns:[],fields:[]}};
async function ambiente({browser,contextOptions={},latenciaMs=0,segurarSessao=false,capacidades=['triar_animais']}){
 const esperar=()=>new Promise(resolve=>setTimeout(resolve,latenciaMs));
 let liberarSessao;
 const sessaoPronta=new Promise(resolve=>{liberarSessao=resolve;});
 if(!segurarSessao)liberarSessao();
 const context=await browser.newContext({...contextOptions,serviceWorkers:'block'});
 const city={id:'maringa',nome:'Maringá',uf:'PR',codigo_ibge:'4115200',status:'ativa',lat:-23.4205,lng:-51.9333,bbox_navegacao:[-23.578,-23.235,-52.123,-51.813]};
 const rows=[],calls=[],blocked=[],errors=[];
 const fixture=(colecao,id,dados)=>rows.push({municipio_id:city.id,colecao,id,dados:{id,municipioId:city.id,...dados},versao:1});
 fixture('eventos','protecao-animal-rotina',{nome:'Rotina da proteção animal',tipo:'Permanente',status:'Em andamento'});
 fixture('zonas','zona-teste',{nome:'Zona Teste',verificacao:'Validado'});
 fixture('bairros','bairro-teste',{nome:'Bairro Teste',zona:'Zona Teste',verificacao:'Validado',geojson:JSON.stringify({type:'Polygon',coordinates:[[[-51.95,-23.43],[-51.92,-23.43],[-51.92,-23.40],[-51.95,-23.40],[-51.95,-23.43]]]})});
 for(const t of modelo.tipos)fixture('ocorrenciaTipos',t.id,t);
 fixture('ocorrenciaTipos','tipo-outro',{nome:'Queda de árvore',prioridade:'Alta'});
 fixture('relatos','relato-perdido',{nome:'Tutora fictícia',telefone:'44999990000',endereco:'Rua Teste, 10, Bairro Teste',categoria:'animal',situacao:'Perdi meu animal',especie:'Cão',descricao:'Caramelo de coleira azul',status:'Em triagem',origem:'WhatsApp',visibilidade:'publica'});
 fixture('relatos','relato-sem-local',{nome:'Anônimo',anonimo:true,telefone:'44999990001',endereco:'Perto da padaria',categoria:'animal',situacao:'Maus-tratos ou abandono',especie:'Gato',descricao:'Gato preso',status:'Em triagem',origem:'WhatsApp',visibilidade:'restrita'});
 fixture('relatos','relato-outro',{nome:'Fora do módulo',telefone:'44999990002',endereco:'Rua X, Bairro Teste',status:'Em triagem',origem:'WhatsApp'});
 fixture('incidentes','oc-ferido',{tipo_id:'animal-ferido',evento_id:'protecao-animal-rotina',bairro:'Bairro Teste',endereco:'Av. Teste, 200',lat:'-23.415',lng:'-51.935',status:'Confirmada',protocolo:'OC-TESTE-1',categoria:'animais',visibilidade:'publica'});
 fixture('incidentes','oc-resolvida',{tipo_id:'animal-encontrado',evento_id:'protecao-animal-rotina',bairro:'Bairro Teste',endereco:'Av. Teste, 300',lat:'-23.42',lng:'-51.94',status:'Resolvida',protocolo:'OC-TESTE-2',categoria:'animais',visibilidade:'publica',desfecho:'Reunido com o tutor'});
 const caps=()=>({maringa:Object.fromEntries([...new Set(Object.values(esquemas).map(x=>x.collection))].map(c=>[c,{ler:true,gravar:false,excluir:false}]))});
 await context.exposeBinding('__fixtureSession',async()=>{await sessaoPronta;return {data:{session:{}}};});
 await context.exposeBinding('__fixtureRequest',async(_,type,name,args)=>{
  if(latenciaMs)await esperar();
  if(type==='query'){
   if(name==='ma_configuracao'){const id=args.find(x=>x[0]==='id')?.[1];return {data:{documento:id==='interface'?{esquemas,catalogos:D.CATALOGOS,grupos:D.GROUPS}:id==='mapas'?mapas:operacao}};}
   return {data:name==='ma_prefeituras'?[{id:city.id,dados:city,versao:1}]:name==='ma_cadastros'?rows.filter(x=>caps().maringa[x.colecao]?.ler):[]};
  }
  if(name==='ma_meu_perfil')return {data:{admin_plataforma:false}};
  if(name==='ma_minhas_capacidades')return {data:caps()};
  if(name==='ma_capacidades_operacionais')return {data:capacidades};
  if(name==='ma_triar_animal'){calls.push({name,args});return {data:{colecao:args.colecao_alvo,id:args.registro,status:'ok'}};}
  if(name==='ma_catalogo_territorial')return {data:{categorias:[{id:'animais'}],tipos:[{id:'clinica_veterinaria',categoria_id:'animais'}]}};
  if(name==='ma_territorio_listar')return {data:args.tipo_alvo==='clinica_veterinaria'?[{cadastro:{dados:{id:'vet-teste',nome:'Clínica veterinária fictícia',endereco:'Rua Vet, 1',lat:-23.418,lng:-51.93}},territorio:{tipo_id:'clinica_veterinaria'}}]:[]};
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
