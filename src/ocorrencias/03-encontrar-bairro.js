function encontrarBairro(areas,pos){
 function noAnel(p,anel){
  let dentro=false;
  for(let i=0,j=anel.length-1;i<anel.length;j=i++){
   const [x,y]=anel[i],[xj,yj]=anel[j];
   if((y>p[1])!==(yj>p[1])&&p[0]<(xj-x)*(p[1]-y)/(yj-y)+x) dentro=!dentro;
  }
  return dentro;
 }
 const encontrado=areas.filter(area=>{
  if(area.tipoArea!=='Bairro'||!area.geojson)return false;
  try{
   const valor=typeof area.geojson==='string'?JSON.parse(area.geojson):area.geojson;
   const geo=valor.type==='Feature'?valor.geometry:valor;
   const poligonos=geo.type==='Polygon'?[geo.coordinates]:geo.type==='MultiPolygon'?geo.coordinates:[];
   return poligonos.some(p=>p.length&&noAnel([pos[1],pos[0]],p[0])&&!p.slice(1).some(anel=>noAnel([pos[1],pos[0]],anel)));
  }catch(_){return false;}
 });
 return encontrado.length===1?encontrado[0].nome:null;
}
global.CadastroOcorrencia={iniciar,encontrarBairro};
})(window);
