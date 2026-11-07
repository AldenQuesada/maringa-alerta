









let ocorrencias = [], voluntarios = [], idCounter = 1;
const gestao = AlertaGestaoDados.criar(undefined,{municipioId:tenantId});
const {normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel}=await AlertaEventoTerritorio.criar({db:gestao,municipio:prefeituraContexto,config:AlertaGestaoDados.config,bairros,conectado});
const camadasVisiveis={Zona:true,Bairro:true,'Zona cartográfica':false,'Zona demonstrativa':exibirEquipesLegadas};
let eventoAtivo=new URLSearchParams(location.search).get('evento')||'';
let eventosCache=[];const eventosMunicipio=()=>eventosCache;
let abriuEventoDaUrl=false;
const noEvento=o=>EventosMapa.corresponde(o,eventoAtivo,eventosMunicipio());
let filtroOcorrencias=null;
const noFiltro=o=>!filtroOcorrencias||filtroOcorrencias.corresponde(o);
const ocorrenciaVisivel=o=>noRecorte(o.bairro)&&noEvento(o)&&noFiltro(o);
let currentRole = {tipo:"visualizacao"}; // sem sessão ativa, apenas leitura

