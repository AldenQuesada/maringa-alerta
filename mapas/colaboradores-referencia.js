/* Leitura dos colaboradores do cadastro e do estado operacional anterior, sem criar cópias. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ColaboradoresReferencia=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function listar(cadastrados,estado){
 const anteriores=estado?.estado==='restauravel'?estado.dados.voluntarios:[];
 const anterioresPorId=new Map(anteriores.map(p=>[String(p.id),p]));
 const lista=(Array.isArray(cadastrados)?cadastrados:[]).map(p=>{
  const anterior=anterioresPorId.get(String(p.origem_id_legado||''));
  return anterior&&Array.isArray(anterior.pos)&&anterior.pos.length>=2&&anterior.pos.every(Number.isFinite)?{...p,posicaoAnterior:anterior.pos}:p;
 });
 const telefones=new Set(lista.map(p=>String(p.telefone||p.tel||'').replace(/\D/g,'')).filter(Boolean));
 const ids=new Set(lista.flatMap(p=>[String(p.id),String(p.origem_id_legado||"")]).filter(Boolean));
 return [...lista,...anteriores.filter(p=>{
  const telefone=String(p.telefone||p.tel||'').replace(/\D/g,'');
  return !ids.has(String(p.id))&&(!telefone||!telefones.has(telefone));
 }).map(p=>({...p,registroAnterior:true,zona:p.zona||p.bairro,ajudas:p.contribuicoes||[p.ajuda].filter(Boolean)}))];
}
return {listar};
});
