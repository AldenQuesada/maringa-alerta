/* Normalização textual compartilhada pelos importadores. */
(function(root){
'use strict';
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const str=x=>String(x??"").trim();
const pick=(x,keys)=>{for(const k of keys){if(x?.[k]!==undefined&&x?.[k]!==null&&x?.[k]!=="")return x[k];}return "";};
const digits=x=>str(x).replace(/\D/g,"");

root.AlertaImplantacaoTexto={norm,str,pick,digits};
})(globalThis);
/* cnes: domínio independente com dependências explícitas. */
(function(root){
'use strict';
function criar({municipio,MUNICIPIO,FONTES,norm,str,pick,digits}){
function isMunicipio(value){
 const d=digits(value);
 return d===MUNICIPIO||d===MUNICIPIO.slice(0,6);
}
function normalizeCoordinates(lat,lng){
 const a=Number(String(lat??"").replace(",",".")),b=Number(String(lng??"").replace(",","."));
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)return null;
 if(a===0&&b===0)return null;
 const box=municipio.bbox_verificacao||municipio.bbox;
 if(Array.isArray(box)&&box.length===4){const [s,n,w,e]=box.map(Number);if([s,n,w,e].every(Number.isFinite)&&(a<s||a>n||b<w||b>e))return null;}
 return {lat:a,lng:b};
}
function tipoSaude(item){
 const name=norm([pick(item,["nome_fantasia","nome","nome_estabelecimento","NO_FANTASIA","NOME FANTASIA"]),pick(item,["tipo_unidade","descricao_tipo_unidade","tipo_estabelecimento","descricao_tipo_estabelecimento","DS_TIPO_UNIDADE"])].join(" "));
 if(/unidade basica|\bubs\b|saude da familia|\busf\b|posto de saude/.test(name))return "UBS";
 if(/unidade de pronto atendimento|\bupa\b/.test(name))return "UPA";
 if(/pronto socorro|pronto-socorro|\bps\b|pronto atendimento/.test(name))return "Pronto-socorro";
 if(/hospital|santa casa|maternidade/.test(name))return "Hospital";
 if(/\bsamu\b|servico de atendimento movel de urgencia/.test(name))return "SAMU";
 return "Outro estabelecimento de saúde";
}
function cnesItem(raw,{fonte=FONTES.cnes}={}){
 if(!raw||typeof raw!=="object")return null;
 const city=pick(raw,["codigo_municipio","codigo_ibge","CO_MUNICIPIO_GESTOR","CO_MUNICIPIO_GESTOR_ESTABELECIMENTO","municipio_codigo","IBGE","ibge","codigo_municipio_estabelecimento","codigo_municipio_gestor"]);
 const cityName=pick(raw,["municipio","nome_municipio","municipio_estabelecimento","MUNICIPIO"]);
 if(city&&!isMunicipio(city))return null;
 if(!city&&cityName&&norm(cityName)!==norm(municipio.nome))return null;
 if(!city&&!cityName)return null; // Não importar unidades sem prova do município
 const nome=str(pick(raw,["nome_fantasia","nome","nome_estabelecimento","NO_FANTASIA","NOME FANTASIA","nome_empresarial"]));
 if(!nome)return null;
 const cnes=digits(pick(raw,["codigo_cnes","numero_cnes","CNES","cnes","CO_CNES","codigo_estabelecimento"]));
 if(!cnes)return null;
 const logradouro=str(pick(raw,["endereco_estabelecimento","logradouro","NO_LOGRADOURO","LOGRADOURO","endereco"]));
 const numero=str(pick(raw,["numero_estabelecimento","numero","NUMERO","NU_ENDERECO"]));
 const bairro=str(pick(raw,["bairro_estabelecimento","bairro","BAIRRO","NO_BAIRRO"]));
 const cep=str(pick(raw,["codigo_cep","cep_estabelecimento","cep","CEP"]));
 const coord=normalizeCoordinates(
  pick(raw,["latitude_estabelecimento","latitude","LATITUDE","NU_LATITUDE","lat"]),
  pick(raw,["longitude_estabelecimento","longitude","LONGITUDE","NU_LONGITUDE","lng","lon"])
 );
 const tipo=tipoSaude(raw);
 return {
  id:"cnes-"+cnes,externalId:"cnes:"+cnes,nome,tipo,categoria:"Saúde",
  endereco:[logradouro,numero].filter(Boolean).join(", "),bairro,cep,codigo_cnes:cnes,
  telefone:str(pick(raw,["numero_telefone_estabelecimento","telefone","TELEFONE"])),
  lat:coord?.lat??"",lng:coord?.lng??"",zona:"",fonte:"CNES",url_fonte:fonte,
  verificacao:"Pendente",atualizado_em:new Date().toISOString().slice(0,10),
  observacoes:coord?"Coordenadas fornecidas pelo CNES. Conferir em campo.":"Localização ainda não georreferenciada."
 };
}
function unwrapCNES(value){
 if(Array.isArray(value))return {rows:value,total:null};
 const rows=pick(value,["estabelecimentos","dados","data","results","result","items","records","registros","unidades","estabelecimento"]);
 const list=Array.isArray(rows)?rows:Array.isArray(rows?.items)?rows.items:Array.isArray(value?.resultados)?value.resultados:[];
 const total=Number(pick(value,["total","total_registros","totalRegistros","total_de_registros","count","total_itens"]));
 return {rows:list,total:Number.isFinite(total)&&total>0?total:null};
}
function linhaCSVParaCNES(row){
 const o={};
 for(const [k,v] of Object.entries(row))o[norm(k).replace(/ /g,"_")]=v;
 return cnesItem({
  codigo_cnes:pick(o,["cnes","codigo_cnes"]),
  nome_fantasia:pick(o,["nome_fantasia","nome","nome_estabelecimento"]),
  codigo_municipio:pick(o,["ibge","codigo_ibge"]),
  municipio:pick(o,["municipio"]),
  logradouro:pick(o,["logradouro","endereco"]),
  numero:pick(o,["numero"]),
  bairro:pick(o,["bairro"]),
  cep:pick(o,["cep"]),
  latitude:pick(o,["latitude","latitude_estabelecimento"]),
  longitude:pick(o,["longitude","longitude_estabelecimento"]),
  tipo_unidade:pick(o,["tipo_unidade","tipo"]),
  telefone:pick(o,["telefone"])
 },{fonte:FONTES.cnesCsv});
}
return {isMunicipio,normalizeCoordinates,tipoSaude,cnesItem,unwrapCNES,linhaCSVParaCNES};
}
root.AlertaImplantacaoCnes={criar};
})(globalThis);
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
/* conciliacao: domínio independente com dependências explícitas. */
(function(root){
'use strict';
function criar({norm,str}){
function uniqueKey(x){return str(x.externalId||x.codigo_cnes&&"cnes:"+x.codigo_cnes||x.id||"n:"+norm(x.nome)+"|"+norm(x.endereco));}
function merge(existing,incoming,{preserveVerified=true}={}){
 const current=new Map(existing.map(x=>[uniqueKey(x),x]));
 const names=new Map(existing.filter(x=>x.nome).map(x=>[norm(x.nome)+"|"+norm(x.tipo)+"|"+norm(x.endereco),x]));
 const result=[],seen=new Set(),stats={new:0,updated:0,preserved:0,duplicates:0};
 for(const raw of incoming){
  if(!raw?.nome)continue;
  const key=uniqueKey(raw),nk=norm(raw.nome)+"|"+norm(raw.tipo)+"|"+norm(raw.endereco);
  if(seen.has(key)){stats.duplicates++;continue;}seen.add(key);
  const old=current.get(key)||names.get(nk);
  if(!old){stats.new++;result.push({...raw});continue;}
  if(preserveVerified&&["Validado","Manual confirmado"].includes(old.verificacao)){stats.preserved++;result.push({...old});continue;}
  stats.updated++;result.push({...old,...Object.fromEntries(Object.entries(raw).filter(([k,v])=>v!==""&&v!==null&&v!==undefined)),id:old.id,municipioId:old.municipioId});
 }
 return {items:result,stats};
}
return {uniqueKey,merge};
}
root.AlertaImplantacaoConciliacao={criar};
})(globalThis);
/* Implantação georreferenciada · motor determinístico, sem rede nem DOM.
 * As fontes remotas ficam na UI; este módulo valida, normaliza e prepara dados para revisão.
 */
(function(global,factory){
 const config=global.AlertaMunicipiosConfiguracao||(typeof require==='function'?require('../config/municipios.js'):null);
 const api={...factory(config?.demonstracao),criar:factory};
 if(typeof module==="object"&&module.exports)module.exports=api;
 global.AlertaImplantacaoCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(municipio){
"use strict";
if(!municipio||!/^\d{7}$/.test(String(municipio.codigo_ibge))||!municipio.uf||!municipio.nome)throw Error('Município de implantação inválido.');
const MUNICIPIO=String(municipio.codigo_ibge);
const PAIS={id:municipio.paisId||'BR',nome:municipio.pais||'Brasil'};
const ESTADO={id:municipio.uf,nome:municipio.estado||municipio.uf,codigo_ibge:MUNICIPIO.slice(0,2),paisId:PAIS.id};
const MUNICIPIO_PADRAO={...municipio};
const FONTES={ibge:'https://servicodados.ibge.gov.br/api/v1/localidades/municipios/'+MUNICIPIO,
 malha:'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/'+MUNICIPIO+'?formato=application%2Fvnd.geo%2Bjson&qualidade=minima',
 cnes:'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos',
 cnesCsv:'https://cnes.datasus.gov.br/pages/estabelecimentos/extracao.jsp'};
const FONTES_DESC={ibge:'IBGE · Localidades',malha:'IBGE · Malhas municipais (GeoJSON)',cnes:'Ministério da Saúde · Cadastro CNES',manual:'Cadastro municipal'};
const EMERGENCIA=[
 {nome:"Corpo de Bombeiros",tipo:"Bombeiros",categoria:"Emergência",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Localizar unidade, endereço e contato oficial."},
 {nome:"Polícia Militar",tipo:"Polícia Militar",categoria:"Emergência",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Confirmar unidade de referência e endereço."},
 {nome:"Polícia Civil",tipo:"Polícia Civil",categoria:"Emergência",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Confirmar unidade de referência e endereço."},
 {nome:"Guarda Municipal",tipo:"Guarda Municipal",categoria:"Emergência",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Confirmar base e contato institucional."},
 {nome:"Defesa Civil Municipal",tipo:"Defesa Civil",categoria:"Emergência",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Confirmar sede e responsável."},
 {nome:"Distribuidora de energia",tipo:"Energia",categoria:"Parceiros",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Vincular agência/unidade oficial e contato de operação."},
 {nome:"Prestador de abastecimento de água",tipo:"Água",categoria:"Parceiros",fonte:"cadastro_institucional",verificacao:"Pendente",observacoes:"Vincular agência/unidade oficial e contato de operação."}
];
const {norm,str,pick,digits}=globalThis.AlertaImplantacaoTexto;
const cnes=globalThis.AlertaImplantacaoCnes.criar({municipio,MUNICIPIO,FONTES,norm,str,pick,digits});
const {normalizeCoordinates,tipoSaude,cnesItem,unwrapCNES,linhaCSVParaCNES}=cnes;
const {normalizaMalha,parseCSV,geoItems}=globalThis.AlertaImplantacaoArquivos.criar({norm,str,pick,normalizeCoordinates});
const {uniqueKey,merge}=globalThis.AlertaImplantacaoConciliacao.criar({norm,str});

function validarMunicipioIBGE(data){
 const id=str(data?.id||data?.codigo_ibge);
 if(id!==MUNICIPIO)throw Error("IBGE retornou município diferente do selecionado.");
 if(norm(data?.nome)!==norm(municipio.nome))throw Error("Nome do município não corresponde ao selecionado.");
 const uf=pick(data,["microrregiao","regiao-imediata"])?.mesorregiao?.UF?.sigla||data?.["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla||data?.uf?.sigla;
 if(uf&&uf!==municipio.uf)throw Error("IBGE retornou UF incompatível.");
 return {...MUNICIPIO_PADRAO,nome:data.nome,uf:municipio.uf,codigo_ibge:id,pais:PAIS.nome,paisId:PAIS.id,estado:ESTADO.nome,ufCodigoIbge:ESTADO.codigo_ibge,fonte:"IBGE",verificacao:"Fonte oficial",url_fonte:FONTES.ibge};
}

function validarHierarquia({pais=PAIS.id,uf=ESTADO.id,codigo=MUNICIPIO}={}){
 if(pais!==PAIS.id||uf!==ESTADO.id||String(codigo)!==MUNICIPIO)throw Error("A implantação aceita somente a prefeitura selecionada e sua hierarquia.");
 return true;
}
return {MUNICIPIO,PAIS,ESTADO,MUNICIPIO_PADRAO,FONTES,FONTES_DESC,EMERGENCIA,
  norm,pick,normalizeCoordinates,tipoSaude,cnesItem,unwrapCNES,normalizaMalha,validarMunicipioIBGE,parseCSV,linhaCSVParaCNES,geoItems,uniqueKey,merge,validarHierarquia};
});