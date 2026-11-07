/* Persistência local. Não autentica usuários e não escreve no backend remoto. */
(function(root){
'use strict';
function criar({armazenamento,options,CHAVE,COLLECTIONS}){
 const seed=root.AlertaMunicipios.demonstracao();
 function carregar(){
  let bruto=null;try{bruto=JSON.parse(armazenamento.getItem(CHAVE)||'null');}catch{}
  const base={version:1,municipioAtivo:''};
  for(const collection of COLLECTIONS)base[collection]=[];
  if(!options.semBootstrap){base.prefeituras=[{...seed}];base.municipioAtivo=seed.id;}
  if(bruto?.version===1){
   for(const collection of COLLECTIONS)if(Array.isArray(bruto[collection]))base[collection]=bruto[collection];
   base.municipioAtivo=bruto.municipioAtivo||base.municipioAtivo;
  }
  // Um cadastro existente é preservado, mesmo sem a prefeitura de demonstração.
  if(!base.prefeituras.some(p=>p.id===base.municipioAtivo))base.municipioAtivo=base.prefeituras[0]?.id||'';
  for(const city of base.prefeituras){
   if(!city.status)city.status=city.id===seed.id?seed.status:'implantacao';
   if(!city.paisId)city.paisId=seed.paisId;
   if(!city.pais)city.pais=seed.pais;
  }
  return base;
 }
 const store={value:carregar(),refresh(){store.value=carregar();},salvar(){
  try{armazenamento.setItem(CHAVE,JSON.stringify(store.value));}
  catch{throw Error('Não foi possível salvar os dados neste navegador.');}
 }};
 return store;
}
root.AlertaCadastrosEstado={criar};
})(globalThis);
