/* camadas: marcadores do mapa. Cor e ícone vêm do tipo de ocorrência no banco. */
(function(root){'use strict';
function criar({L,esc,grupos,territorio,aoAbrir}){
 function icone(x){
  const cor=/^#[0-9a-f]{3,8}$/i.test(x.tipo?.cor||"")?x.tipo.cor:"";
  const classe="ma-animal-pin"+(x.origemCamada==="triagem"?" triagem":"")+(x.visibilidade==="restrita"?" restrito":"");
  return L.divIcon({className:"pin "+classe,html:'<span class="ma-animal-pin-corpo"'+(cor?' style="--ma-animal-cor:'+cor+'"':"")+'>'+esc(x.tipo?.icone||"•")+'</span>',iconSize:[32,32],iconAnchor:[16,32]});
 }
 function desenhar(xs){
  grupos.triagem.clearLayers();grupos.ocorrencias.clearLayers();
  const ocupacao=new Map();let semPosicao=0;
  for(const x of xs){
   const p=territorio.posicao(x);if(!p){semPosicao++;continue;}
   const chave=p.lat.toFixed(5)+":"+p.lng.toFixed(5),n=ocupacao.get(chave)||0;ocupacao.set(chave,n+1);
   const desloc=p.aproximada?n*0.0009:0;
   const titulo=(x.tipo?.nome||x.situacao||"Relato")+(x.protocolo?" · "+x.protocolo:"");
   L.marker([p.lat+desloc,p.lng+desloc],{icon:icone(x),title:titulo})
    .bindTooltip("<strong>"+esc(titulo)+"</strong><br>"+esc(x.status||"")+(p.aproximada?" · localização aproximada do bairro "+esc(p.bairro):""),{direction:"top"})
    .on("click",()=>aoAbrir(x)).addTo(grupos[x.origemCamada]);
  }
  return semPosicao;
 }
 function desenharUnidades(xs,visivel){
  grupos.unidades.clearLayers();if(!visivel)return;
  for(const u of xs){
   L.marker([Number(u.lat),Number(u.lng)],{icon:L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">🏥</span>',iconSize:[32,32],iconAnchor:[16,32]}),title:u.nome})
    .bindTooltip("<strong>"+esc(u.nome)+"</strong><br>"+esc(u.endereco||"Endereço não informado"),{direction:"top"}).addTo(grupos.unidades);
  }
 }
 return {desenhar,desenharUnidades};
}
root.AlertaAnimalCamadas={criar};
})(globalThis);
