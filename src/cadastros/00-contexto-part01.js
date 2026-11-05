/* Cadastro de gestão independente do Mapa Operacional existente.
 * Adapter local para validar UI. Trocar por API com autenticação/RLS antes do uso real.
 */
(function(global) {
"use strict";
const CHAVE="alerta_painel_gestao_v1";
const UFS=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const F=(key,label,type="text",extra={})=>({key,label,type,...extra});
const C=(label,values)=>F(label[0],label[1],"select",{options:values});
const Z=()=>F("zona","Zona de referência","zone");
const CONTATO=[F("telefone","Telefone","tel"),F("email","E-mail","email")];
const CATALOGOS={
 ajudas:["FORNECER ALIMENTAÇÃO","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS","CUIDADOR","LIMPEZA","PEDREIRO","METALÚRGICO","CARPINTEIRO","OPERADOR DE MOTOSSERRA","ELETRICISTA","LAUDO","EMITIR LAUDOS DE PREJUÍZOS","OUTRO"],
 maquinas:["PÁ CARREGADEIRA","RETROESCAVADEIRA","MUNCK","CAMIONETE","BOBCAT","CAMINHÃO GARRA","CAMINHÃO BASCULANTE","GERADOR","MATERIAL DE CONSTRUÇÃO","STAR LINK","OUTRO","MOTOSSERRA COM OPERADOR","MOTOSSERRA"],
 empreendedores:["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO","OUTRO"],
 materiais:["MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"],
 necessidades:["Alimentação","Telhas e cobertura","Apoio financeiro","Abrigo e moradia","Roupas e cobertores","Medicamentos e saúde","Limpeza e remoção","Material de construção","Eletricidade e gerador","Água potável","Transporte","Cuidados especiais","Laudos de prejuízos","Apoio a empreendedores","Outro"]
};
const GEO_FIELDS=[
 F("bairro","Bairro"),F("zona","Zona de referência"),F("lat","Latitude"),F("lng","Longitude"),
 F("fonte","Fonte de dados"),F("url_fonte","URL da fonte"),F("externalId","ID externo"),
 F("verificacao","Verificação","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]}),
 F("atualizado_em","Atualizado em"),F("geojson","Geometria GeoJSON","textarea")
];
const ESQUEMAS={
 territorio:{label:"Prefeitura",singular:"Território",collection:"prefeituras",summary:"Município provisionado pelo Administrador Geral da plataforma.",columns:["nome","uf","codigo_ibge"],fields:[F("nome","Município","text",{required:true})]},
 implantacao:{label:"Implantar Maringá",singular:"Implantação",collection:"importacoes",summary:"Fluxo único de implantação territorial com fontes e georreferenciamento.",columns:["nome","status","criado_em"],fields:[F("nome","Importação","text",{required:true}),F("status","Estado"),F("fonte","Fonte"),F("criado_em","Data"),F("quantidade","Registros","number")]},
 bairros:{label:"Bairros",singular:"Bairro",collection:"bairros",summary:"Bairros e geometrias territoriais importadas ou validadas para Maringá.",columns:["nome","zona","verificacao"],fields:[F("nome","Nome do bairro","text",{required:true}),F("zona","Zona numerada"),F("fonte","Fonte"),F("externalId","ID na fonte"),F("verificacao","Verificação","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]}),F("geojson","Polígono GeoJSON","textarea")]},
 pessoas:{label:"Pessoas e hierarquia",singular:"Pessoa",collection:"usuarios",summary:"Cadastro integrado de pessoal, órgãos, papéis, zonas e substituições.",columns:["nome","funcao","orgao","zona"],fields:[F("nome","Nome e sobrenome","text",{required:true}),
  F("funcao","Função principal","select",{required:true,options:["admin","responsavel","substituto","coordenador","operador"]}),
  F("papeis","Outras funções","multi",{options:["admin","responsavel","substituto","coordenador","operador"]}),
  F("orgao","Órgão ou instituição"),F("estrutura_id","Estrutura vinculada ao Gabinete","structure"),F("bairro","Bairro de origem"),F("zona","Zona numerada","zone"),F("cargo","Cargo"),F("especialidade","Área de responsabilidade"),
  F("substituto_id","Substituto vinculado"),F("status","Situação","select",{options:["Pendente de validação","Ativo","Inativo"]}),
  F("verificacao","Verificação","select",{options:["Pendente","Validado","Rejeitado"]}),...CONTATO]},

  prefeituras:{label:"Prefeituras",singular:"Prefeitura",collection:"prefeituras",summary:"Municípios participantes e suas configurações territoriais.",columns:["nome","uf","codigo_ibge"],fields:[F("uf","Estado","uf",{required:true}),F("nome","Município","city",{required:true}),F("codigo_ibge","Código IBGE","text",{required:true}),F("responsavel","Contato institucional"),F("pais","País"),F("paisId","Código ISO do país"),F("estado","Estado"),F("codigo_uf","Código IBGE UF"),F("status","Situação","select",{options:["implantacao","ativa","suspensa"]}),F("admin_municipal_email","E-mail de referência do administrador municipal","email"),F("origem_provisionamento","Origem do provisionamento"),...CONTATO]},
  zonas:{label:"Zonas numeradas",singular:"Zona numerada",collection:"zonas",summary:"Zonas territoriais numeradas da Prefeitura, com limites e fontes cartográficas verificadas.",columns:["nome","tipo","responsavel"],fields:[F("nome","Zona (ex.: Zona 1)","text",{required:true}),F("tipo","Classificação territorial","select",{options:["Zona numerada","Zona Central","Zona Industrial","Outra"]}),F("responsavel","Responsável regional"),F("observacoes","Observações","textarea"),F("geojson","Polígono GeoJSON","textarea"),F("externalId","Código na fonte"),F("fonte","Fonte"),F("verificacao","Verificação","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]})]},
