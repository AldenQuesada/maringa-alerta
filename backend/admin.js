/* Serviço do Admin Geral. Páginas pequenas; nenhum cadastro operacional é carregado. */
(function(root){
'use strict';
const PAGE_SIZE=25;
const projection='id,versao,codigo_ibge,uf,status,nome:dados->>nome,admin_municipal_email:dados->>admin_municipal_email,fonte_geo:dados->>fonte_geo,geo_atualizado:dados->>geo_atualizado';
const checked=response=>{if(response.error)throw Error(response.error.message);return response;};
function criar(client){
  let precisaAtualizar=false;
  async function gravarRPC(name,args){
    if(precisaAtualizar)throw Error('Atualize a página para conferir os dados antes de salvar novamente.');
    try{return checked(await client.rpc(name,args));}
    catch(error){precisaAtualizar=true;throw error;}
  }
  async function listar({busca='',uf='',pagina=0}={}){
    let query=client.from('ma_prefeituras').select(projection,{count:'exact'});
    if(uf)query=query.eq('uf',uf);
    if(busca.trim()){
      const value=busca.trim().replace(/[%_\\]/g,'\\$&');
      query=query.ilike(/^\d+$/.test(value)?'codigo_ibge':'dados->>nome','%'+value+'%');
    }
    const result=checked(await query.order('id').range(pagina*PAGE_SIZE,(pagina+1)*PAGE_SIZE-1));
    return {items:result.data,total:result.count,pagina,tamanho:PAGE_SIZE};
  }
  async function detalhe(id){
    const {data}=checked(await client.from('ma_prefeituras').select('dados,versao').eq('id',id).single());
    return {...data.dados,_versao:data.versao};
  }
  async function salvar(dados,anterior=null){
    const clean={...dados};delete clean._versao;
    await gravarRPC('ma_aplicar_alteracoes',{alteracoes:[{
      colecao:'prefeituras',id:clean.id,dados:clean,operacao:anterior?'atualizar':'inserir',versao:anterior?anterior._versao:null
    }]});
    return clean;
  }
  async function estatisticas(){
    const statuses=[null,'implantacao','ativa','suspensa'];
    return Promise.all(statuses.map(async status=>{
      let query=client.from('ma_prefeituras').select('id',{count:'exact',head:true});
      if(status)query=query.eq('status',status);
      return checked(await query).count;
    }));
  }
  async function catalogo(uf){
    if(!uf)return checked(await client.from('ma_ufs').select('sigla,codigo,nome').order('nome')).data;
    // A maior UF cabe numa página de 1000; usar paginação para não depender do limite da API.
    const result=[];
    for(let start=0;;start+=500){
      const {data}=checked(await client.from('ma_municipios_ibge').select('codigo_ibge,nome,uf').eq('uf',uf).order('codigo_ibge').range(start,start+499));
      result.push(...data);if(data.length<500)return result;
    }
  }
  async function acessos(municipio=null,pagina=0){
    const {data}=checked(await client.rpc('ma_admin_listar_acessos',{municipio,limite:PAGE_SIZE,deslocamento:pagina*PAGE_SIZE}));
    return data;
  }
  async function definirVinculo({municipio,email,papel,anterior=null}){
    await gravarRPC('ma_admin_definir_vinculo',{municipio,email_usuario:email,papel_novo:papel,papel_esperado:anterior});
  }
  async function auditoria(pagina=0){
    const {data,count}=checked(await client.from('ma_auditoria').select('*',{count:'exact'})
      .order('criado_em',{ascending:false}).order('id',{ascending:false}).range(pagina*PAGE_SIZE,(pagina+1)*PAGE_SIZE-1));
    return {items:data,total:count,pagina,tamanho:PAGE_SIZE};
  }
  return {listar,detalhe,salvar,estatisticas,catalogo,acessos,definirVinculo,auditoria,remoto:true};
}
const api={criar,PAGE_SIZE};root.AlertaAdminRemoto=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
