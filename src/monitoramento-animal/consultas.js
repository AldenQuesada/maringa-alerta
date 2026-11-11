/* consultas: leitura dos registros autorizados. O servidor já esconde o que o usuário não pode ver. */
(function(root){'use strict';
function criar({db,perfil,regras,normal}){
 const camada=id=>perfil.camadas.find(c=>c.id===id)||null;
 const tipos=()=>db.lista("ocorrencias").filter(t=>t.categoria===regras.categoriaTipos);
 const tipoPorId=id=>tipos().find(t=>t.id===id)||null;
 const tipoPorSituacao=s=>tipos().find(t=>t.situacao_whatsapp===s)||null;
 const confere=(x,filtro)=>Object.entries(filtro||{}).every(([k,v])=>String(x[k]??"")===String(v));
 function relatos(){
  const c=camada("triagem");if(!c)return [];
  return db.lista(c.colecao).filter(x=>confere(x,c.filtro)).map(x=>({...x,origemCamada:"triagem",tipo:tipoPorSituacao(x.situacao)}));
 }
 function incidentes(){
  const c=camada("ocorrencias");if(!c)return [];
  const ids=new Set(tipos().map(t=>t.id));
  return db.lista(c.colecao).filter(x=>ids.has(x.tipo_id)).map(x=>({...x,origemCamada:"ocorrencias",tipo:tipoPorId(x.tipo_id)}));
 }
 // Ações agendadas de hoje em diante, nas situações listadas no perfil. O tipo vem do catálogo pelo nome gravado.
 function acoes(hoje){
  const c=camada("acoes");if(!c)return [];
  return db.lista(c.colecao).filter(x=>(c.estados||[]).includes(x.status)&&String(x.data||"")>=hoje)
   .map(x=>({...x,origemCamada:"acoes",tipoAcao:x.tipo,tipo:{nome:x.nome,icone:c.icone}}));
 }
 function situacaoDe(x){return x.tipo?.id||"";}
 function filtrar(xs,{zona,situacao,busca,mostrarEncerradas,zonaDe}){
  const termo=normal(busca);
  return xs.filter(x=>{
   if(!mostrarEncerradas&&perfil.estadosEncerrados.includes(x.status))return false;
   if(situacao&&situacaoDe(x)!==situacao)return false;
   if(zona&&zonaDe(x)!==zona)return false;
   if(termo&&!normal([x.protocolo,x.tipo?.nome,x.situacao,x.especie,x.endereco,x.bairro,x.descricao,x.status].filter(Boolean).join(" ")).includes(termo))return false;
   return true;
  });
 }
 return {camada,tipos,tipoPorId,relatos,incidentes,acoes,filtrar};
}
root.AlertaAnimalConsultas={criar};
})(globalThis);
