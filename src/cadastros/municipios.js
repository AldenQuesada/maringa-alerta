/* Resolução de contexto municipal sem pressupor nome, UF ou código de cidade. */
(function(root){
'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
function demonstracao(){return clone(root.AlertaMunicipiosConfiguracao.demonstracao);}
function referencias(municipio){return clone(root.AlertaMunicipiosConfiguracao.referencias[municipio?.codigo_ibge]||{});}
function selecionar(dados,sessoes=root.sessionStorage){
 const db=dados.criar(),requested=sessoes?.getItem('alerta_contexto_municipal_demo_v1');
 const cities=db.municipios();
 if(requested){if(!cities.some(c=>c.id===requested))throw Error('Prefeitura selecionada não está disponível. Abra o cadastro pelo Admin Geral.');return requested;}
 const selected=db.municipioAtivo()?.id||cities[0]?.id;
 if(!selected)throw Error('Nenhuma prefeitura disponível.');
 return selected;
}
function marca(municipio){return municipio?.marca||[municipio?.nome,'Alerta'].filter(Boolean).join(' ');}
function centro(municipio){
 if(municipio?.lat!=null&&municipio?.lng!=null&&municipio.lat!==''&&municipio.lng!==''&&[Number(municipio.lat),Number(municipio.lng)].every(Number.isFinite)&&Math.abs(Number(municipio.lat))<=90&&Math.abs(Number(municipio.lng))<=180)return [Number(municipio.lat),Number(municipio.lng)];
 const box=municipio?.bbox;if(Array.isArray(box)&&box.length===4&&box.every(x=>Number.isFinite(Number(x))))return [(Number(box[0])+Number(box[1]))/2,(Number(box[2])+Number(box[3]))/2];
 return null;
}
function limites(municipio){
 const box=municipio?.bbox_navegacao||municipio?.bbox;
 return Array.isArray(box)&&box.length===4&&box.every(x=>Number.isFinite(Number(x)))?[[Number(box[0]),Number(box[2])],[Number(box[1]),Number(box[3])]]:null;
}
root.AlertaMunicipios={demonstracao,referencias,selecionar,marca,centro,limites};
})(globalThis);
