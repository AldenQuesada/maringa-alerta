/* filtros: opções montadas a partir do perfil e dos tipos do banco. */
(function(root){'use strict';
function criar({$,esc,perfil,consultas}){
 const opt=(v,n,sel)=>'<option value="'+esc(v)+'"'+(String(v)===String(sel)?" selected":"")+">"+esc(n)+"</option>";
 const tem=f=>perfil.filtros.includes(f);
 function montar(state,zonas){
  $("camada").innerHTML=opt("","Todas as camadas",state.camada)+perfil.camadas.filter(c=>c.colecao).map(c=>opt(c.id,c.rotulo,state.camada)).join("");
  $("zona").innerHTML=opt("","Todas as zonas",state.zona)+zonas.map(z=>opt(z,z,state.zona)).join("");
  $("filtro").innerHTML=opt("","Todas as situações",state.situacao)+consultas.tipos().map(t=>opt(t.id,t.nome,state.situacao)).join("");
  for(const [id,f] of [["filtro-camada","camada"],["filtro-zona","zona"],["filtro-situacao","situacao"],["filtro-busca","busca"],["filtro-encerradas","mostrar_resolvidas"]])$(id).hidden=!tem(f);
  const unidades=perfil.camadas.find(c=>c.catalogo);
  $("filtro-unidades").hidden=!unidades;if(unidades)$("mostrar-unidades-texto").textContent="Mostrar "+unidades.rotulo.toLocaleLowerCase("pt-BR");
  legenda();
 }
 function legenda(){
  $("ma-animal-legenda").innerHTML=consultas.tipos().map(t=>'<span><i style="--ma-animal-cor:'+esc(/^#[0-9a-f]{3,8}$/i.test(t.cor||"")?t.cor:"#93a6b8")+'">'+esc(t.icone||"")+"</i>"+esc(t.nome)+(t.visibilidade==="restrita"?" · sigiloso":"")+"</span>").join("")+
   '<span>Contorno tracejado: relato em triagem, posição aproximada pelo bairro</span>';
 }
 return {montar,legenda};
}
root.AlertaAnimalFiltros={criar};
})(globalThis);
