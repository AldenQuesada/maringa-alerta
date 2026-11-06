/* Adaptador Supabase: leituras em memória, gravações confirmadas pelo servidor. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const key=(collection,item)=>JSON.stringify([collection,item.municipioId||'',item.id]);
function indexState(state,collections){
 const result=new Map();
 for(const collection of collections)for(const item of state[collection]||[])result.set(key(collection,item),{collection,item});
 return result;
}
function changes(before,after,collections,versions){
 const a=indexState(before,collections),b=indexState(after,collections),result=[];
 for(const [id,{collection,item}] of b){
  const old=a.get(id);
  if(old&&JSON.stringify(old.item)===JSON.stringify(item))continue;
  result.push({colecao:collection,id:item.id,municipio_id:item.municipioId||null,dados:item,operacao:old?'atualizar':'inserir',versao:old?versions.get(id):null});
 }
 for(const [id,{collection,item}] of a)if(!b.has(id))result.push({colecao:collection,id:item.id,municipio_id:item.municipioId||null,operacao:'excluir',versao:versions.get(id)});
 return result;
}
async function criar({client,dados,onStatus=()=>{}}){
 const collections=[...new Set(Object.values(dados.ESQUEMAS).map(x=>x.collection))];
 let state={version:1,municipioAtivo:'maringa'},versions=new Map(),queue=Promise.resolve(),needsReload=false;
 const reloadMessage='Atualize a página para conferir os dados antes de tentar salvar novamente.';
 for(const c of collections)state[c]=[];
 const checked=r=>{if(r.error)throw Error(r.error.message);return r.data;};
 async function pages(table,order){
  const rows=[];
  for(let start=0;;start+=500){
   let q=client.from(table).select('*');
   for(const field of order)q=q.order(field);
   const page=checked(await q.range(start,start+499));
   rows.push(...page);if(page.length<500)return rows;
  }
 }
 const [cities,records,profile,initialCapabilities,painelInicial]=await Promise.all([pages('ma_prefeituras',['id']),pages('ma_cadastros',['municipio_id','colecao','id']),client.rpc('ma_meu_perfil').then(checked),client.rpc('ma_minhas_capacidades').then(checked),pages('ma_painel',['municipio_id','user_id','chave'])]);
 const painelEstado=new Map(painelInicial.map(row=>[JSON.stringify([row.municipio_id,row.chave]),row]));
 let painelFila=Promise.resolve(),painelInseguro=false;
 const painel={
  ler(municipio,tipo){return copy(painelEstado.get(JSON.stringify([municipio,tipo]))?.documento||[]);},
  salvar(municipio,tipo,conteudo){
   const key=JSON.stringify([municipio,tipo]),esperada=painelEstado.get(key)?.versao||0;
   const run=painelFila.then(async()=>{
    if(painelInseguro)throw Error(reloadMessage);
    try{
     const row=checked(await client.rpc('ma_salvar_painel',{municipio,tipo,conteudo,versao_esperada:esperada}));
     if(!row||row.municipio_id!==municipio||row.chave!==tipo||!Array.isArray(row.documento)||!Number.isInteger(row.versao))throw Error('Confirmação de painel inválida.');
     painelEstado.set(key,row);return true;
    }catch(error){painelInseguro=true;throw Error(error.message+' '+reloadMessage);}
   });painelFila=run.catch(()=>{});return run;
  }
 };
 let capabilities=initialCapabilities;
 async function atualizarPermissoes(){try{const previous=JSON.stringify(capabilities);capabilities=checked(await client.rpc('ma_minhas_capacidades'));return previous!==JSON.stringify(capabilities);}catch(error){capabilities={};throw error;}}
 for(const row of cities){state.prefeituras.push(row.dados);versions.set(key('prefeituras',row.dados),row.versao);}
 for(const row of records){if(collections.includes(row.colecao)){state[row.colecao].push(row.dados);versions.set(key(row.colecao,row.dados),row.versao);}}
 if(!cities.length)throw Error('Seu e-mail está autenticado, mas ainda não possui acesso a uma prefeitura. Solicite o vínculo ao administrador.');
 state.municipioAtivo=cities.some(x=>x.id==='maringa')?'maringa':cities[0].id;
 function local(snapshot,options){
  let value=JSON.stringify(snapshot);
  const store={getItem:k=>k===dados.CHAVE?value:null,setItem:(k,v)=>{if(k===dados.CHAVE)value=String(v);}};
  return {db:dados.criarLocal(store,{...options,semBootstrap:true}),read:()=>JSON.parse(value)};
 }
 state=local(state,{}).db.estado();
 let readState=null;const readCache=new Map();
 function repositorio(options={}){
  const scope=options.municipioId;
  const pode=(module,action='ler',municipio=scope||state.municipioAtivo)=>{
   const collection=dados.ESQUEMAS[module]?.collection||module;
   return capabilities?.[municipio]?.[collection]?.[action]===true;
  };
  if(scope&&!state.prefeituras.some(p=>p.id===scope))throw Error('Sem acesso à prefeitura selecionada.');
  const leitura=name=>(...args)=>{
   if(readState!==state){readCache.clear();readState=state;}
   const k=JSON.stringify([options,name,args]);
   if(!readCache.has(k))readCache.set(k,copy(local(state,options).db[name](...args)));
   return copy(readCache.get(k));
  };
  function transacao(fn){
   const run=queue.then(async()=>{
    if(needsReload)throw Error(reloadMessage);
    const before=copy(state),draft=local(before,options);
    onStatus('salvando');
    try{
     const result=await fn(draft.db);
     const after=draft.read(),diff=changes(before,after,collections,versions);
     if(diff.length){
      for(const op of diff)if(!(op.colecao==='prefeituras'&&op.operacao==='inserir'&&profile.admin_plataforma===true)&&!pode(op.colecao,op.operacao==='excluir'?'excluir':'gravar',op.municipio_id||op.id))throw Error('Você não tem permissão para esta operação.');
      try{
       const confirmed=checked(await client.rpc('ma_aplicar_alteracoes',{alteracoes:diff}));
       if(!Array.isArray(confirmed)||confirmed.length!==diff.length)throw Error('Confirmação do servidor incompleta.');
       for(const op of diff){
        const row=confirmed.find(r=>r.colecao===op.colecao&&r.id===op.id&&(r.municipio_id||null)===(op.municipio_id||null)&&r.operacao===op.operacao);
        if(!row||(op.operacao!=='excluir'&&(!row.dados||!Number.isInteger(row.versao))))throw Error('Confirmação do servidor inválida.');
        if(op.operacao!=='excluir'){
         const index=after[op.colecao].findIndex(x=>key(op.colecao,x)===key(op.colecao,op.dados));
         after[op.colecao][index]=copy(row.dados);op.confirmada=row.versao;
        }
       }
      }
      catch(error){needsReload=true;throw Error(error.message+' '+reloadMessage);}
     }
     for(const op of diff){const k=JSON.stringify([op.colecao,op.municipio_id||'',op.id]);if(op.operacao==='excluir')versions.delete(k);else versions.set(k,op.confirmada);}
     state=after;onStatus('salvo');return copy(result??null);
    }catch(error){onStatus('erro',error.message);throw error;}
   });
   queue=run.catch(()=>{});return run;
  }
  const api={tipo:'supabase',modo:scope?'municipal':'plataforma',municipioEscopo:scope||null,transacao,pode};
  for(const name of ['municipios','municipioAtivo','lista','registro','estado'])api[name]=leitura(name);
  api.selecionarMunicipio=id=>{const draft=local(state,options);const result=draft.db.selecionarMunicipio(id);state=draft.read();return copy(result);};
  for(const name of ['gravar','excluir','importarLote','implantarPacote','atualizarGeo'])api[name]=(...args)=>transacao(db=>db[name](...args));
  api.gravar=(module,data,id)=>transacao(db=>db.gravar(module,data,id)).then(saved=>api.registro(module,saved.id));
  return api;
 }
 return {repositorio,perfil:profile,atualizarPermissoes,painel};
}
const api={criar,changes};root.AlertaRepositorioSupabase=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
