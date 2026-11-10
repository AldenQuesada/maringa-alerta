/* filtros: opções montadas a partir do perfil e dos tipos do banco. */
(function(root){'use strict';
function criar({$,esc,t,perfil,consultas}){
 const opt=(v,n,sel)=>'<option value="'+esc(v)+'"'+(String(v)===String(sel)?" selected":"")+">"+esc(n)+"</option>";
 const tem=f=>perfil.filtros.includes(f);
 function montar(state,zonas){
  $("camada").innerHTML=opt("",t("filtros.todasCamadas"),state.camada)+perfil.camadas.filter(c=>c.colecao).map(c=>opt(c.id,c.rotulo,state.camada)).join("");
  $("zona").innerHTML=opt("",t("filtros.todasZonas"),state.zona)+zonas.map(z=>opt(z,z,state.zona)).join("");
  $("filtro").innerHTML=opt("",t("filtros.todasSituacoes"),state.situacao)+consultas.tipos().map(t=>opt(t.id,t.nome,state.situacao)).join("");
  for(const [id,f] of [["filtro-camada","camada"],["filtro-zona","zona"],["filtro-situacao","situacao"],["filtro-busca","busca"],["filtro-encerradas","mostrar_resolvidas"]])$(id).hidden=!tem(f);
  const unidades=perfil.camadas.find(c=>c.catalogo);
  $("filtro-unidades").hidden=!unidades;if(unidades)$("mostrar-unidades-texto").textContent=t("filtros.mostrarUnidades",{rotulo:unidades.rotulo.toLocaleLowerCase("pt-BR")});
  legenda();
 }
 function legenda(){
  $("ma-animal-legenda").innerHTML=consultas.tipos().map(tp=>'<span><i'+(/^#[0-9a-f]{3,8}$/i.test(tp.cor||"")?' style="--ma-animal-cor:'+esc(tp.cor)+'"':"")+'>'+esc(tp.icone||"")+"</i>"+esc(tp.nome)+(tp.visibilidade==="restrita"?" · "+esc(t("legenda.sigiloso")):"")+"</span>").join("")+
   '<span>'+esc(t("legenda.triagem"))+"</span>";
 }
 return {montar,legenda};
}
root.AlertaAnimalFiltros={criar};
})(globalThis);
