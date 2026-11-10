/* territorio: bairros e zonas oficiais do catálogo municipal, e unidades de atendimento do catálogo territorial. */
(function(root){'use strict';
function criar({map,L,poligonos,normal,catalogoBairros,client,municipioId,perfil,aoMudar}){
 const bairros=new Map(),zonas=[];
 async function carregar(){
  if(!catalogoBairros)return;
  const dados=await catalogoBairros.carregar();
  for(const f of dados.bairros?.features||[]){
   const nome=String(f.properties?.nome||"").trim();if(!nome)continue;
   const b=L.geoJSON(f).getBounds();if(!b?.isValid())continue;
   bairros.set(normal(nome),{nome,centro:b.getCenter(),geometry:f.geometry});
  }
  for(const f of dados.zonasNumeradas?.features||[]){
   const nome=String(f.properties?.nome||"").trim();if(!/^Zona\s*\d+$/i.test(nome))continue;
   const layer=L.geoJSON(f,{style:{color:perfil.cores.contornoZona,weight:1.6,fillColor:perfil.cores.contornoZona,fillOpacity:.035,dashArray:"5 5"},
    onEachFeature:(_f,shape)=>shape.bindTooltip(nome,{sticky:true})});
   zonas.push({nome,geometry:f.geometry});poligonos.addLayer(layer);
  }
  zonas.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR",{numeric:true}));
  aoMudar();
 }
 // Relato do WhatsApp não tem GPS: posição aproximada pelo bairro citado no endereço.
 function bairroNoTexto(texto){
  const t=" "+normal(texto)+" ";let achado=null;
  for(const [chave,b] of bairros)if(t.includes(" "+chave+" ")&&(!achado||chave.length>normal(achado.nome).length))achado=b;
  return achado;
 }
 function posicao(x){
  const lat=Number(x.lat),lng=Number(x.lng);
  if(x.lat!=null&&x.lat!==""&&Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng,aproximada:false};
  const b=(x.bairro&&bairros.get(normal(x.bairro)))||bairroNoTexto(x.endereco);
  return b?{lat:b.centro.lat,lng:b.centro.lng,aproximada:true,bairro:b.nome}:null;
 }
 function zonaDe(x){
  const p=posicao(x);if(!p)return "";
  return zonas.find(z=>root.AlertaAnimalGeometria.contem(z.geometry,p.lat,p.lng))?.nome||"";
 }
 async function unidades(){
  const c=perfil.camadas.find(x=>x.catalogo);if(!c||!client)return [];
  const cat=await client.rpc("ma_catalogo_territorial");if(cat.error)throw Error(cat.error.message);
  const tipos=(cat.data?.tipos||[]).filter(t=>(t.categoria_id||t.categoria)===c.catalogo.categoria).map(t=>t.id);
  const lotes=await Promise.all(tipos.map(tipo=>client.rpc("ma_territorio_listar",{municipio:municipioId,tipo_alvo:tipo,limite:500})));
  // Falha parcial não pode virar mapa incompleto em silêncio.
  const falha=lotes.find(r=>r.error);if(falha)throw Error(falha.error.message);
  return lotes.flatMap(r=>r.data||[]).map(item=>({...item.cadastro?.dados,tipoTerritorial:item.territorio?.tipo_id})).filter(x=>x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng)));
 }
 return {carregar,posicao,zonaDe,zonas:()=>zonas.map(z=>z.nome),unidades};
}
root.AlertaAnimalTerritorio={criar};
})(globalThis);
