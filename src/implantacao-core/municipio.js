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
