function polygon(geo){
 const feature=geo?.type==="FeatureCollection"?geo.features?.find(x=>x?.geometry?.type?.includes("Polygon")):geo?.type==="Feature"?geo:geo;
 const g=feature?.geometry||feature;if(!["Polygon","MultiPolygon"].includes(g?.type))throw Error("Malha IBGE não contém polígono.");
 if(JSON.stringify(g).length>1250000)throw Error("Malha excede limite do navegador.");
 const points=[];
 const walk=x=>{if(!Array.isArray(x))return;if(x.length>=2&&typeof x[0]==="number"&&typeof x[1]==="number"){points.push(x);return;}for(const a of x)walk(a);};
 walk(g.coordinates);if(points.length<4)throw Error("Malha sem geometria suficiente.");
 const xs=points.map(a=>a[0]),ys=points.map(a=>a[1]);
 const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
 if(![left,right,bottom,top].every(Number.isFinite))throw Error("Limite geográfico inválido.");
 return {center:[(bottom+top)/2,(left+right)/2],bbox:[bottom,top,left,right],json:JSON.stringify(g)};
}
async function syncGeo(id){
 if(busy)return;const p=current().find(x=>x.id===id);if(!p)return;
 busy=true;renderTerritorios();const status=$("geo-status");if(status)status.textContent="Consultando malha IBGE de "+p.nome+"...";
 try{
  const url="https://servicodados.ibge.gov.br/api/v3/malhas/municipios/"+p.codigo_ibge+"?formato=application%2Fvnd.geo%2Bjson&qualidade=minima";
  const controller=new AbortController(),t=setTimeout(()=>controller.abort(),28000);
  let data;try{
   const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/vnd.geo+json, application/json"}});
   if(!res.ok)throw Error("IBGE HTTP "+res.status);
   data=await res.json();
  }finally{clearTimeout(t);}
  const g=polygon(data);
  central.registrarGeo(id,{lat:g.center[0],lng:g.center[1],bbox:g.bbox,limite_geojson:g.json,fonte:"IBGE · malha municipal"});
  notice("Limite geográfico de "+p.nome+" salvo no protótipo.");
 }catch(err){notice("Malha não atualizada: "+err.message);}finally{busy=false;renderTerritorios();}
}
function renderTerritorios(){
 const xs=current();
 $("screen").innerHTML=heading("Georreferenciamento municipal","Admin Geral provisiona os limites iniciais; cada Prefeitura recebe seu território já associado ao código IBGE.")+warning+
 '<section class="panel"><div class="panel-head"><h2>Camadas por Prefeitura</h2><span id="geo-status">'+(busy?"Importando geometria oficial...":"Importação inicial assistida por município")+'</span></div><div class="table-wrap"><table class="records"><thead><tr><th>Prefeitura</th><th>IBGE</th><th>Origem territorial</th><th>Georreferenciamento</th><th>Ação</th></tr></thead><tbody>'+
 xs.map(x=>'<tr><td><strong>'+esc(x.nome)+' / '+esc(x.uf)+'</strong></td><td>'+esc(x.codigo_ibge)+'</td>'+
 '<td>'+esc(x.id==="maringa"?"113 bairros IBGE 2022 versionados":x.fonte_geo||"Nenhuma fonte importada")+'</td>'+
 '<td>'+esc(x.geo_atualizado?"Atualizado em "+new Date(x.geo_atualizado).toLocaleDateString("pt-BR"):"Malha pendente")+'</td>'+
 '<td><div class="row-actions"><button class="btn" data-geo="'+esc(x.id)+'"'+(busy?" disabled":"")+'>Importar limite IBGE</button>'+
 '<button class="btn" data-open="'+esc(x.id)+'">Abrir Prefeitura</button></div></td></tr>').join("")+
 '</tbody></table></div></section>'+
 '<section class="panel"><div class="panel-head"><h2>Bairros e zonas operacionais</h2></div><div class="panel-body"><p>Maringá já possui a malha IBGE 2022 com 113 bairros carregável no mapa. Londrina e outros municípios precisam de suas próprias camadas e verificação. Zonas operacionais não são automaticamente criadas a partir de bairros.</p></div></section>';
 $("screen").querySelectorAll("[data-geo]").forEach(x=>x.onclick=()=>syncGeo(x.dataset.geo));
 $("screen").querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>abrirMunicipio(x.dataset.open));
}
function render(){
 const p=location.hash.slice(1);
 section=["dashboard","municipios","territorios"].includes(p)?p:"dashboard";
 renderNav();
 if(section==="dashboard")renderDashboard();
 else if(section==="municipios")renderMunicipios();
 else renderTerritorios();
}
window.addEventListener("hashchange",render);
render();
})();