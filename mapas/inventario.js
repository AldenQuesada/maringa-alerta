/* Inventário canônico para os três mapas.
 * Adaptador SOMENTE LEITURA: consulta diretamente gestao/dados.js.
 * Nunca duplica coleções ou usa armazenamento próprio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 root.AlertaInventarioMapas=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const CAMADAS=[
 {id:"territorio",nome:"Gerais da Prefeitura",grupo:"Prefeitura"},
 {id:"zonas",nome:"Zonas numeradas",grupo:"Geoterritorialidade"},
 {id:"bairros",nome:"Bairros",grupo:"Geoterritorialidade"},
 {id:"pessoas",nome:"Gabinete de Crise",grupo:"Prefeitura"},
 {id:"saude",nome:"Unidades de saúde",grupo:"Estruturas"},
 {id:"emergencias",nome:"Bombeiros e segurança",grupo:"Estruturas"},
 {id:"parceiros",nome:"Órgãos e concessionárias",grupo:"Estruturas"},
 {id:"eventos",nome:"Eventos",grupo:"Operação"},
 {id:"equipes",nome:"Equipes",grupo:"Operação"},
 {id:"integrantes",nome:"Integrantes das equipes",grupo:"Operação"},
 {id:"voluntarios",nome:"Colaboradores",grupo:"Operação"},
 {id:"solicitacoes",nome:"Pedidos de ajuda",grupo:"Operação"},
 {id:"mobilizacoes",nome:"Mobilizações",grupo:"Operação"},
 {id:"apoios",nome:"Apoio entre prefeituras",grupo:"Operação"},
 {id:"bases",nome:"Bases e centros de doações",grupo:"Recursos"},
 {id:"riscos",nome:"Áreas de risco",grupo:"Recursos"},
 {id:"pontos",nome:"Pontos críticos",grupo:"Recursos"},
 {id:"veiculos",nome:"Veículos",grupo:"Recursos"},
 {id:"equipamentos",nome:"Equipamentos",grupo:"Recursos"},
 {id:"estoques",nome:"Estoques",grupo:"Recursos"},
 {id:"abrigos",nome:"Abrigos",grupo:"Recursos"},
 {id:"ocorrencias",nome:"Tipos de ocorrência",grupo:"Configuração"},
 {id:"canais",nome:"Canais de comunicação",grupo:"Configuração"},
 {id:"regras",nome:"Regras de acionamento",grupo:"Configuração"}
];
const INDICE=new Map(CAMADAS.map(c=>[c.id,c]));
const PRIVADOS=new Set(["pessoas","voluntarios","solicitacoes","integrantes"]);
const NAO_PONTUAIS=new Set(["territorio","zonas","bairros","eventos","ocorrencias","canais","regras","mobilizacoes","apoios"]);
const normal=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim().replace(/^zona\s*0*(\d+)$/,(_,n)=>"zona "+Number(n));
const valido=(lat,lng)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&lat!==""&&lng!==""&&lat!=null&&lng!=null&&Number(lat)>=-90&&Number(lat)<=90&&Number(lng)>=-180&&Number(lng)<=180;
const escopo=source=>source?.lista&&typeof source.lista==="function";
function transformar(modulo,registro,relacao){
 const def=INDICE.get(modulo);if(!def)return null;
 const privado=PRIVADOS.has(modulo);
 const bairro=String(registro.bairro||"").trim();
 let zona=modulo==="zonas"?String(registro.nome||"").trim():String(registro.zona||"").trim();
 if(!zona&&bairro)zona=relacao.get(normal(bairro))||"";
 const nome=String(registro.nome||registro.identificacao||registro.necessidade||registro.tipo||def.nome).trim();
 const categoria=String(registro.tipo||registro.categoria||registro.necessidade||registro.funcao||"").trim();
 const situacao=String(registro.status||registro.verificacao||registro.disponibilidade||registro.checkin_status||"").trim();
 const classe=situacao||categoria||"Não informada";
 const podePonto=!privado&&!NAO_PONTUAIS.has(modulo)&&valido(registro.lat,registro.lng);
 const endereco=privado?"":String(registro.endereco||registro.localizacao||"").trim();
 const detalhes=[
  categoria,
  registro.cargo,
  registro.especialidade,
  registro.quantidade?String(registro.quantidade)+" "+String(registro.unidade||""):"",
  registro.itens_aceitos,
  registro.recursos,
  registro.servicos,
  registro.urgencia,
  registro.descricao,
  registro.observacoes,
  registro.publico,
  registro.acesso,
  registro.capacidade?("Capacidade total: "+registro.capacidade):"",
  registro.disponiveis!==""&&registro.disponiveis!=null?("Vagas informadas: "+registro.disponiveis):""
 ].filter(Boolean).join(" · ");
 const extras=[
  nome,categoria,situacao,zona,bairro,registro.identificacao,registro.cargo,
  registro.necessidade,registro.tipo_pessoa,
  registro.ajudas,registro.maquinas,registro.empreendedores,registro.materiais,
  registro.condicao,registro.recurso,registro.itens_aceitos,registro.fonte,registro.publico,registro.acesso,
  privado?"":endereco
 ].flat().filter(Boolean).join(" ");
 return {
  id:String(registro.id??""),chave:modulo+":"+String(registro.id??""),
  modulo,moduloNome:def.nome,grupo:def.grupo,nome,
  categoria,situacao,classe,zona,bairro,endereco,detalhes,
  lat:podePonto?Number(registro.lat):null,lng:podePonto?Number(registro.lng):null,
  georreferenciado:podePonto,
  precisao:!privado?String(registro.geo_status||registro.verificacao||""):"",
  fonte:String(registro.fonte||"").trim(),
  fonteUrl:!privado&&/^https:\/\//.test(registro.url_fonte||"")?String(registro.url_fonte):"",
  privado,termo:normal(extras)
 };
}
function registros(db){
 if(!escopo(db))throw Error("O inventário exige o cadastro municipal canônico.");
 const relacao=new Map(db.lista("bairros").filter(b=>b.zona).map(b=>[normal(b.nome),String(b.zona)]));
 const itens=[];
 for(const camada of CAMADAS){
  for(const registro of db.lista(camada.id)){
   if(registro.verificacao==="Rejeitado")continue;
   const item=transformar(camada.id,registro,relacao);
   if(item)itens.push(item);
  }
 }
 return itens;
}
function filtrar(itens,{modulo="",zona="",classe="",busca=""}={}){
 const m=normal(modulo),z=normal(zona),c=normal(classe),q=normal(busca);
 return itens.filter(item=>
  (!m||m==="todos"||item.modulo===modulo)&&
  (!z||normal(item.zona)===z||normal(item.bairro)===z||(item.modulo==="bairros"&&normal(item.nome)===z))&&
  (!c||normal(item.classe)===c||normal(item.categoria)===c||normal(item.situacao)===c)&&
  (!q||item.termo.includes(q))
 );
}
function classes(itens){return [...new Set(itens.flatMap(x=>[x.classe,x.categoria,x.situacao]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));}
function resumo(db){const rows=registros(db);return CAMADAS.map(c=>({...c,total:rows.filter(x=>x.modulo===c.id).length,comPonto:rows.filter(x=>x.modulo===c.id&&x.georreferenciado).length}));}
return {CAMADAS,normal,registros,filtrar,classes,resumo,transformar};
});
