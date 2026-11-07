/* Importação de malha por código IBGE; nenhuma cidade tem tratamento especial. */
(function(root){
'use strict';
function polygon(geo){
  const feature=geo?.type==='FeatureCollection'?geo.features?.find(x=>['Polygon','MultiPolygon'].includes(x?.geometry?.type)):geo;
  const geometry=feature?.geometry||feature;
  if(!['Polygon','MultiPolygon'].includes(geometry?.type))throw Error('Malha IBGE sem polígono.');
  const json=JSON.stringify(geometry);if(json.length>1250000)throw Error('Malha excede o limite de tamanho.');
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,count=0;
  function walk(value){
    if(!Array.isArray(value))throw Error('Coordenadas inválidas.');
    if(typeof value[0]==='number'){
      const [x,y]=value;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>90)throw Error('Coordenada inválida.');
      left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);count++;return;
    }
    value.forEach(walk);
  }
  walk(geometry.coordinates);if(count<4)throw Error('Polígono incompleto.');
  return {lat:(bottom+top)/2,lng:(left+right)/2,bbox:[bottom,top,left,right],limite_geojson:json};
}
async function territorio(ctx,id){
  const {esc,heading,panel}=root.AlertaPlataformaUI;
  const city=await ctx.service.detalhe(id);
  if(!ctx.show(heading('Território · '+city.nome,'Importe o limite oficial deste município. Bairros, zonas e estruturas são cadastros próprios da prefeitura.')+
    panel('Georreferenciamento municipal','<p>IBGE '+esc(city.codigo_ibge)+' · '+esc(city.uf)+'</p><p>Fonte: '+esc(city.fonte_geo||'Nenhuma importação registrada')+'</p><p>Última importação: '+esc(city.geo_atualizado?new Date(city.geo_atualizado).toLocaleString('pt-BR'):'Não realizada')+'</p><button class="btn primary" id="import-geo">Importar limite IBGE</button><p role="alert"></p>')))return;
  const button=ctx.el.querySelector('#import-geo'),feedback=ctx.el.querySelector('[role=alert]');
  button.onclick=async()=>{
    if(button.disabled)return;button.disabled=true;feedback.textContent='Consultando malha oficial…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
    try{
      const url=new URL('https://servicodados.ibge.gov.br/api/v3/malhas/municipios/'+encodeURIComponent(city.codigo_ibge));
      url.searchParams.set('formato','application/vnd.geo+json');url.searchParams.set('qualidade','minima');
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('IBGE indisponível ('+response.status+').');
      const geo=polygon(await response.json());
      await ctx.service.salvar({...city,...geo,fonte_geo:'IBGE · malha municipal',geo_atualizado:new Date().toISOString()},city);
      ctx.notice('Limite municipal salvo.');ctx.render();
    }catch(error){feedback.textContent=error.message+' Atualize a página para conferir o resultado antes de repetir.';}
    finally{clearTimeout(timer);button.disabled=false;}
  };
}
root.AlertaPlataformaUI.territorio=territorio;
root.AlertaPlataformaUI.polygon=polygon;
})(globalThis);
