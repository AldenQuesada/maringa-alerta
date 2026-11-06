/* Cálculo puro de alterações e chaves; sem acesso ao banco. */
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
root.AlertaRepositorioDiff={copy,key,changes};
})(globalThis);
/* Consultas paginadas com escopo explícito por prefeitura. */
(function(root){
'use strict';
 async function pages(client,table,order,scope=null){
  const rows=[];
  for(let start=0;;start+=500){
   let q=client.from(table).select('*');
   if(scope)q=q.eq(table==='ma_prefeituras'?'id':'municipio_id',scope);
   for(const field of order)q=q.order(field);
   const response=await q.range(start,start+499);
   if(response.error)throw Error(response.error.message);
   const page=response.data;
   rows.push(...page);if(page.length<500)return rows;
  }
 }
root.AlertaRepositorioConsultas={pages};
})(globalThis);
/* Adaptador Supabase: leituras em memória, gravações confirmadas pelo servidor. */
(function(root){
'use strict';
const {copy,key,changes}=root.AlertaRepositorioDiff;
async function criar({client,dados,municipioId=null,onStatus=()=>{}}){
 const collections=[...new Set(Object.values(dados.ESQUEMAS).map(x=>x.collection))];
 let state={version:1,municipioAtivo:''},versions=new Map(),queue=Promise.resolve(),needsReload=false;
 const reloadMessage='Atualize a página para conferir os dados antes de tentar salvar novamente.';
 for(const c of collections)state[c]=[];
 const checked=r=>{if(r.error)throw Error(r.error.message);return r.data;};
 const pages=(table,order,scope)=>root.AlertaRepositorioConsultas.pages(client,table,order,scope);
 const [cities,profile]=await Promise.all([pages('ma_prefeituras',['id'],municipioId),client.rpc('ma_meu_perfil').then(checked)]);
 if(!cities.length)throw Error('Sem acesso à prefeitura solicitada. Solicite o vínculo ao administrador.');
 const selected=municipioId||cities[0].dados.id;
 const records=await pages('ma_cadastros',['municipio_id','colecao','id'],selected);
 for(const row of cities){state.prefeituras.push(row.dados);versions.set(key('prefeituras',row.dados),row.versao);}
 for(const row of records){if(collections.includes(row.colecao)){state[row.colecao].push(row.dados);versions.set(key(row.colecao,row.dados),row.versao);}}
 if(!cities.length)throw Error('Seu e-mail está autenticado, mas ainda não possui acesso a uma prefeitura. Solicite o vínculo ao administrador.');
 state.municipioAtivo=selected;
 function local(snapshot,options){
  let value=JSON.stringify(snapshot);
  const store={getItem:k=>k===dados.CHAVE?value:null,setItem:(k,v)=>{if(k===dados.CHAVE)value=String(v);}};
  return {db:dados.criarLocal(store,{...options,semBootstrap:true}),read:()=>JSON.parse(value)};
 }
 state=local(state,{}).db.estado();
 let readState=null;const readCache=new Map();
 function repositorio(options={}){
  const scope=options.municipioId;
  if(scope&&scope!==selected)throw Error('Sem acesso à prefeitura selecionada.');
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
      try{checked(await client.rpc('ma_aplicar_alteracoes',{alteracoes:diff}));}
      catch(error){needsReload=true;throw Error(error.message+' '+reloadMessage);}
     }
     for(const op of diff){const k=JSON.stringify([op.colecao,op.municipio_id||'',op.id]);if(op.operacao==='excluir')versions.delete(k);else versions.set(k,op.operacao==='inserir'?1:Number(op.versao)+1);}
     state=after;onStatus('salvo');return copy(result??null);
    }catch(error){onStatus('erro',error.message);throw error;}
   });
   queue=run.catch(()=>{});return run;
  }
  const api={tipo:'supabase',modo:scope?'municipal':'plataforma',municipioEscopo:scope||null,transacao};
  for(const name of ['municipios','municipioAtivo','lista','registro','estado'])api[name]=leitura(name);
  api.selecionarMunicipio=id=>{if(id!==selected)throw Error('Abra a prefeitura selecionada em uma nova sessão.');const draft=local(state,options);const result=draft.db.selecionarMunicipio(id);state=draft.read();return copy(result);};
  for(const name of ['gravar','excluir','importarLote','implantarPacote','atualizarGeo'])api[name]=(...args)=>transacao(db=>db[name](...args));
  return api;
 }
 return {repositorio,perfil:profile};
}
const api={criar,changes};root.AlertaRepositorioSupabase=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
