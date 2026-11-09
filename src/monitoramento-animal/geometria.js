/* geometria: ponto em polígono e centro de feições GeoJSON, sem dependências. */
(function(root){'use strict';
function anel(p,ring){
 let dentro=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/((yj-yi)||1e-12)+xi))dentro=!dentro;
 }
 return dentro;
}
function poligono(p,coords){return anel(p,coords[0])&&!coords.slice(1).some(buraco=>anel(p,buraco));}
function contem(geometry,lat,lng){
 const p=[Number(lng),Number(lat)];
 if(!geometry||!p.every(Number.isFinite))return false;
 if(geometry.type==="Polygon")return poligono(p,geometry.coordinates);
 if(geometry.type==="MultiPolygon")return geometry.coordinates.some(c=>poligono(p,c));
 return false;
}
root.AlertaAnimalGeometria={contem};
})(globalThis);
