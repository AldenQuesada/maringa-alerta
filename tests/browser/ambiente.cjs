// Fixture exclusiva do navegador isolado; nunca expõe ou acessa Supabase remoto.
const fs=require('node:fs'),path=require('node:path');
const D=require('../../gestao/dados.js');
const PW=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=require(PW);
const sql=fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261107013933_ocorrencias_mapa_persistentes.sql'),'utf8');
D.ESQUEMAS.incidentes=JSON.parse(sql.match(/\$schema\$(.*?)\$schema\$/s)[1]);
const operacao={ocorrenciasMapa:JSON.parse(sql.match(/'\{ocorrenciasMapa\}','([^']+)'/)[1]),transicoes:{incidentes:JSON.parse(sql.match(/'\{transicoes,incidentes\}','([^']+)'/)[1])}};
async function ambiente({role='editor',width=1440}={}){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
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
 const caps=()=>({maringa:Object.fromEntries([...new Set(Object.values(D.ESQUEMAS).map(x=>x.collection))].map(c=>[c,{ler:(role!=='restrito'||c==='prefeituras')&&!(role==='leitor'&&c==='incidentes'),gravar:role==='editor',excluir:role==='editor'}]))});
 let rejectWrite=false;
 await context.exposeBinding('__fixtureRequest',async(_,type,name,args)=>{
  if(type==='query'){
   if(name==='ma_configuracao')return {data:{documento:args.find(x=>x[0]==='id')?.[1]==='interface'?{esquemas:D.ESQUEMAS,catalogos:D.CATALOGOS,grupos:[...D.GROUPS,{label:'Operação',items:['incidentes']}]}:operacao}};
   return {data:name==='ma_prefeituras'?[{id:city.id,dados:city,versao:1}]:name==='ma_cadastros'?rows.filter(x=>caps().maringa[x.colecao]?.ler):[]};
  }
  if(name==='ma_meu_perfil')return {data:{admin_plataforma:false}};
  if(name==='ma_minhas_capacidades')return {data:caps()};
  calls.push({name,args});
  if(rejectWrite)return {error:{message:'Falha de gravação do teste isolado'}};
  if(name==='ma_aplicar_alteracoes'){
   const confirmed=[];for(const op of args.alteracoes){
    if(!caps().maringa[op.colecao]?.[op.operacao==='excluir'?'excluir':'gravar'])return {error:{message:'Sem permissão no teste'}};
    const idx=rows.findIndex(x=>x.id===op.id&&x.colecao===op.colecao);
    if(idx>=0)rows.splice(idx,1);
    const result={...op,versao:(op.versao||0)+1};if(op.colecao==='incidentes')result.dados={...op.dados,nome:'Queda de árvore',bairro:'Bairro Teste',protocolo:'OC-'+op.id,criado_em:new Date().toISOString()};if(op.operacao!=='excluir')rows.push(result);confirmed.push(result);
   }return {data:confirmed};
  }
  if(name==='ma_salvar_painel')return {data:{municipio_id:args.municipio,chave:args.tipo,documento:args.conteudo,versao:args.versao_esperada+1}};
  return {error:{message:'RPC não prevista no teste: '+name}};
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname.endsWith('supabase.co')){blocked.push(url.href);return route.abort();}
  if(url.pathname.includes('/backend/vendor/supabase-'))return route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:${role==='anon'?'null':'{}'}}}),getUser:async()=>({data:{user:{email:'teste@example.invalid'}}}),onAuthStateChange(){},signOut:async()=>({}),signInWithOtp:async()=>({error:{message:'Envio bloqueado no teste'}})},from(table){const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},range(){return window.__fixtureRequest('query',table,filters)},single(){return window.__fixtureRequest('query',table,filters)}};return q},rpc:(name,args)=>window.__fixtureRequest('rpc',name,args)})};`});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {browser,context,page,rows,calls,blocked,errors,setRole:r=>role=r,reject:()=>rejectWrite=true};
}
module.exports={ambiente};
