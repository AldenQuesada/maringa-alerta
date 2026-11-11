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
// Etapa do enquadramento: o valor vem da migração, como os demais.
const sqlE=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261111170000_monitoramento_animal_enquadramento.sql'),'utf8');
const enquadramento=JSON.parse(sqlE.match(/\{monitoramento-animal,enquadramento\}','(\[[^']+\])'/)[1]);
const sqlAc=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261111190000_protecao_animal_lugares_acoes.sql'),'utf8');
const blocoAc=i=>{const a=sqlAc.indexOf('$j$',sqlAc.indexOf(i))+3;return JSON.parse(sqlAc.slice(a,sqlAc.indexOf('$j$',a)));};
// Etapas E2 a E4: textos do alerta do bairro na ficha.
const sqlEnv=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261111220000_alertas_envio.sql'),'utf8');
const blocoEnv=i=>{const a=sqlEnv.indexOf('$j$',sqlEnv.indexOf(i))+3;return JSON.parse(sqlEnv.slice(a,sqlEnv.indexOf('$j$',a)));};
// Revisão por IA: textos do relatório na ficha e da sugestão no formulário do alerta.
const sqlRev=fs.readFileSync(require('node:path').join(__dirname,'../../supabase/migrations/20261111230000_revisao_ia.sql'),'utf8');
const blocoRev=i=>{const a=sqlRev.indexOf('$j$',sqlRev.indexOf(i))+3;return JSON.parse(sqlRev.slice(a,sqlRev.indexOf('$j$',a)));};
const sugestaoIA=JSON.parse(sqlRev.match(/\{monitoramento-animal,textos,envio,sugestaoIA\}','("[^']+")'/)[1]);
const perfilAD={...mapasA['monitoramento-animal'],...blocoD("'{monitoramento-animal}'")};
const mapas={'monitoramento-animal':{...perfilAD,enquadramento,camadas:[...perfilAD.camadas,...blocoAc("'{monitoramento-animal,camadas}'")],
 textos:{...perfilAD.textos,acao:blocoAc("'{monitoramento-animal,textos,acao}'"),envio:{...blocoEnv("'{monitoramento-animal,textos,envio}'"),sugestaoIA},revisao:blocoRev("'{monitoramento-animal,textos,revisao}'")}}};
// Datas locais relativas a hoje, como a página calcula.
const diaDepois=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const modelo=bloco("values('modelos'")['protecao-animal'];
const regras={...bloco("'{protecaoAnimal}'"),triagem:blocoD("'{protecaoAnimal,triagem}'")};
const operacao={protecaoAnimal:regras};
const esquemas={...D.ESQUEMAS,incidentes:{label:'Ocorrências',singular:'Ocorrência',collection:'incidentes',columns:[],fields:[]},
 acoes:{label:'Ações nos bairros',singular:'Ação',collection:'acoes',columns:[],fields:[]}};
async function ambiente({browser,contextOptions={},latenciaMs=0,segurarSessao=false,capacidades=['triar_animais'],envioAtivo=false,sugestao=null}){
 // Alerta do bairro: o painel do servidor é simulado com o mesmo formato de public.ma_envio_painel.
 const envio={alertas:{},entregas:{}};
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
 // Ações: uma feira agendada daqui a 3 dias aparece; a de ontem e a cancelada não.
 fixture('acoes','acao-feira',{nome:'Feira de adoção fictícia',tipo:'Feira de adoção',tipo_id:'feira_adocao',data:diaDepois(3),horario:'9h às 13h',endereco:'Praça Teste',lat:'-23.41',lng:'-51.925',status:'Agendada'});
 fixture('acoes','acao-passada',{nome:'Feira passada',tipo:'Feira de adoção',data:diaDepois(-1),lat:'-23.41',lng:'-51.93',status:'Agendada'});
 fixture('acoes','acao-cancelada',{nome:'Feira cancelada',tipo:'Feira de adoção',data:diaDepois(5),lat:'-23.41',lng:'-51.935',status:'Cancelada'});
 // Cadastro do mapa de Ajuda, com coordenadas: não pode aparecer no Monitoramento animal.
 fixture('bases','base-ajuda',{nome:'Centro de doações fictício',tipo:'Centro de doações',lat:'-23.418',lng:'-51.93',endereco:'Rua Ajuda, 1'});
 fixture('relatos','relato-perdido',{nome:'Tutora fictícia',telefone:'44999990000',endereco:'Rua Teste, 10, Bairro Teste',categoria:'animal',situacao:'Perdi meu animal',especie:'Cão',descricao:'Caramelo de coleira azul',status:'Em triagem',origem:'WhatsApp',visibilidade:'publica',
 revisao_ia:{resumo:'Cão caramelo perdido na Rua Teste.',urgencia:'Média',situacao_confere:true,observacoes:['Sem ponto de referência'],sugestao_alerta:'Cão caramelo, coleira azul, Rua Teste.',modelo:'claude-opus-5-5',revisado_em:'2026-11-11T15:00:00Z'}});
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
  if(name==='ma_envio_painel'){
   const r=rows.find(x=>x.colecao===args.colecao_alvo&&x.id===args.registro)?.dados||{},al=envio.alertas[args.registro]||null,origem=args.colecao_alvo==='acoes'?args.registro:al?.id;
   return {data:!capacidades.includes('aprovar_alerta')?{capaz:false}:{capaz:true,ativo:envioAtivo,alerta:al,tem_foto:false,sugestao:al?null:sugestao,
    enviavel:args.colecao_alvo==='acoes'?r.status==='Agendada':r.status==='Confirmada',bairros:['Bairro Teste'],inscritos:4,entregas:envio.entregas[origem]||{}}};
  }
  if(name==='ma_alerta_aprovar'){calls.push({name,args});envio.alertas[args.incidente]={id:'alerta-teste',mensagem:args.mensagem,status:'Aprovado',aprovado_em:'2026-11-11T15:00:00Z',mostrar_foto:args.mostrar_foto};return {data:{id:'alerta-teste',status:'Aprovado'}};}
  if(name==='ma_enviar_inscritos'){calls.push({name,args});const novos=envio.entregas[args.registro]?0:4;envio.entregas[args.registro]={pending:4};return {data:{na_fila:novos,total:4}};}
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
module.exports={ambiente,enquadramento};
