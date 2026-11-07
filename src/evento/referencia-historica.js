/* Importação explícita e idempotente de referência histórica no cadastro local. */
(function(root){'use strict';
function criar({codigo_ibge,dados,tipos}){
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function importar(db){
  if(String(db.municipioAtivo()?.codigo_ibge)!==String(codigo_ibge))throw Error('Esta referência pertence a outra prefeitura.');
  if(db.tipo==='supabase')throw Error('A referência demonstrativa não é importada no banco remoto.');
  let evento=db.lista('eventos').find(x=>x.externalId===dados.externalId||norm(x.nome)===norm(dados.nome));
  if(!evento)evento=db.gravar('eventos',dados);
  const existentes=new Set(db.lista('ocorrencias').map(x=>norm(x.nome)));
  for(const nome of tipos)if(!existentes.has(norm(nome))){db.gravar('ocorrencias',{nome});existentes.add(norm(nome));}
  return evento;
 }
 return {dados,tipos,importar};
}
root.AlertaReferenciaHistorica={criar};
})(globalThis);
