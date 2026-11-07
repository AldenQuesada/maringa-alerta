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
