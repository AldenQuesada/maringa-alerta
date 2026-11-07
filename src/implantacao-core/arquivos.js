/* arquivos: domínio independente com dependências explícitas. */
(function(root){
'use strict';
function criar({norm,str,pick,normalizeCoordinates}){
function normalizaMalha(geo){
 if(!geo||typeof geo!=="object")throw Error("Malha IBGE inválida.");
 let feature;
 if(geo.type==="FeatureCollection")feature=geo.features?.find(f=>f?.geometry?.type?.includes("Polygon"));
 else if(geo.type==="Feature")feature=geo;
 else if(["Polygon","MultiPolygon"].includes(geo.type))feature={type:"Feature",properties:{},geometry:geo};
 if(!feature||!["Polygon","MultiPolygon"].includes(feature.geometry?.type))throw Error("O arquivo não contém um polígono GeoJSON.");
 if(JSON.stringify(feature.geometry).length>1300000)throw Error("Geometria grande demais para o armazenamento local.");
 return feature.geometry;
}
function parseCSV(txt){
 const text=String(txt||"").replace(/^\uFEFF/,"");if(text.length>14e6)throw Error("Arquivo CSV maior que 14 MB.");
 const first=text.split(/\r?\n/,1)[0],sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?";":",";
 const out=[],row=[];let cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===sep&&!quoted){row.push(cell);cell="";}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell="";if(row.some(v=>v.trim()))out.push(row.splice(0));else row.length=0;
  }else cell+=c;
 }
 if(quoted)throw Error("CSV com aspas não fechadas.");
 row.push(cell);if(row.some(v=>v.trim()))out.push(row);
 if(out.length<2)return [];
 const head=out.shift().map(k=>str(k));
 return out.slice(0,7000).map(cols=>Object.fromEntries(head.map((h,i)=>[h,cols[i]??""])));
}
function normalizarGeoFeature(f,kind){
 if(!f||f.type!=="Feature"||!f.geometry)return null;
 const p=f.properties||{},name=str(pick(p,["nome","NOME","NM_BAIRRO","nm_bairro","BAIRRO","bairro","name","Name","NOME_BAIRRO","DESCRICAO","descricao","NO_BAIRRO"]));
 if(!name)return null;
 const id=norm(pick(p,["id","ID","codigo","CODIGO","ID_BAIRRO","codigo_bairro"])||name).replace(/ /g,"-").slice(0,100);
 if(kind==="bairros"||kind==="riscos"){
  if(!["Polygon","MultiPolygon"].includes(f.geometry.type))return null;
  const geo=normalizaMalha(f);
  return {id:(kind==="bairros"?"bairro-":"risco-")+id,nome:name,geojson:JSON.stringify(geo),tipo:kind==="bairros"?"Bairro":"Área de risco",fonte:"Importação municipal",verificacao:"Pendente",zona:"",localizacao:name};
 }
 if(kind==="pontos"||kind==="instituicoes"){
  if(f.geometry.type!=="Point")return null;
  const c=f.geometry.coordinates,point=normalizeCoordinates(c?.[1],c?.[0]);if(!point)return null;
  return {id:(kind==="pontos"?"ponto-":"instituicao-")+id,nome:name,...point,bairro:str(pick(p,["bairro","BAIRRO"])),tipo:str(pick(p,["tipo","TIPO"]))||"Outro",endereco:str(pick(p,["endereco","ENDERECO"])),fonte:"Importação municipal",verificacao:"Pendente",zona:""};
 }
 return null;
}
function geoItems(geo,kind){
 if(!["bairros","riscos","pontos","instituicoes"].includes(kind))throw Error("Tipo de camada inválido.");
 const feats=geo?.type==="FeatureCollection"?geo.features:geo?.type==="Feature"?[geo]:[];
 if(!Array.isArray(feats)||feats.length===0)throw Error("Selecione um GeoJSON FeatureCollection com feições.");
 if(feats.length>12000)throw Error("Camada acima do limite de 12 mil feições.");
 return feats.map(x=>normalizarGeoFeature(x,kind)).filter(Boolean);
}
return {normalizaMalha,parseCSV,normalizarGeoFeature,geoItems};
}
root.AlertaImplantacaoArquivos={criar};
})(globalThis);
