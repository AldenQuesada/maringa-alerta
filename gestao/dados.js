/* Cadastro de gestão independente do Mapa Operacional existente.
 * Adapter local para validar UI. Trocar por API com autenticação/RLS antes do uso real.
 */
(function(global) {
"use strict";
const CHAVE="alerta_painel_gestao_v1";
const UFS=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const F=(key,label,type="text",extra={})=>({key,label,type,...extra});
const C=(label,values)=>F(label[0],label[1],"select",{options:values});
const Z=()=>F("zona","Zona operacional","zone");
const CONTATO=[F("telefone","Telefone","tel"),F("email","E-mail","email")];
const CATALOGOS={
 ajudas:["FORNECER ALIMENTAÇÃO","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS","CUIDADOR","LIMPEZA","PEDREIRO","METALÚRGICO","CARPINTEIRO","OPERADOR DE MOTOSSERRA","ELETRICISTA","LAUDO","EMITIR LAUDOS DE PREJUÍZOS","OUTRO"],
 maquinas:["PÁ CARREGADEIRA","RETROESCAVADEIRA","MUNCK","CAMIONETE","BOBCAT","CAMINHÃO GARRA","CAMINHÃO BASCULANTE","GERADOR","MATERIAL DE CONSTRUÇÃO","STAR LINK","OUTRO","MOTOSSERRA COM OPERADOR","MOTOSSERRA"],
 empreendedores:["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO","OUTRO"],
 materiais:["MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"],
 necessidades:["Alimentação","Telhas e cobertura","Apoio financeiro","Abrigo e moradia","Roupas e cobertores","Medicamentos e saúde","Limpeza e remoção","Material de construção","Eletricidade e gerador","Água potável","Transporte","Cuidados especiais","Laudos de prejuízos","Apoio a empreendedores","Outro"]
};
const ESQUEMAS={
  prefeituras:{label:"Prefeituras",singular:"Prefeitura",collection:"prefeituras",summary:"Municípios participantes e suas configurações territoriais.",columns:["nome","uf","codigo_ibge"],fields:[F("uf","Estado","uf",{required:true}),F("nome","Município","city",{required:true}),F("codigo_ibge","Código IBGE","text",{required:true}),F("responsavel","Contato institucional"),...CONTATO]},
  zonas:{label:"Zonas operacionais",singular:"Zona",collection:"zonas",summary:"Divisões utilizadas para localização e coordenação.",columns:["nome","tipo","responsavel"],fields:[F("nome","Nome da zona","text",{required:true}),F("tipo","Tipo de área","select",{options:["Urbana","Rural","Mista","Outra"]}),F("responsavel","Responsável regional"),F("observacoes","Observações","textarea")]},
  bases:{label:"Bases de apoio",singular:"Base",collection:"bases",summary:"Locais de apoio e estacionamento operacional.",columns:["nome","zona","endereco"],fields:[F("nome","Nome","text",{required:true}),Z(),F("endereco","Endereço"),F("coordenadas","Localização"),...CONTATO]},
  riscos:{label:"Áreas de risco",singular:"Área de risco",collection:"riscos",summary:"Pontos e setores que requerem atenção.",columns:["nome","zona","categoria"],fields:[F("nome","Nome da área","text",{required:true}),Z(),F("categoria","Risco","select",{options:["Alagamento","Deslizamento","Vendaval","Incêndio","Colapso estrutural","Tecnológico","Outro"]}),F("localizacao","Endereço ou referência"),F("descricao","Descrição","textarea")]},
  administradores:{label:"Administradores",singular:"Administrador",collection:"usuarios",role:"admin",summary:"Responsáveis pela administração do município.",columns:["nome","email","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),F("cargo","Cargo"),...CONTATO]},
  responsaveis:{label:"Responsáveis regionais",singular:"Responsável",collection:"usuarios",role:"responsavel",summary:"Referências diretas de cada zona.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  substitutos:{label:"Substitutos",singular:"Substituto",collection:"usuarios",role:"substituto",summary:"Pessoas que assumem na ausência do responsável.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  coordenadores:{label:"Coordenadores",singular:"Coordenador",collection:"usuarios",role:"coordenador",summary:"Coordenação de equipes e recursos.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("especialidade","Especialidade"),...CONTATO]},
  operadores:{label:"Operadores",singular:"Operador",collection:"usuarios",role:"operador",summary:"Acesso operacional ao acompanhamento do município.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  equipes:{label:"Equipes de recuperação",singular:"Equipe",collection:"equipes",summary:"Equipes municipais com capacidades e disponibilidade.",columns:["nome","tipo","zona","status"],fields:[F("nome","Nome da equipe","text",{required:true}),F("tipo","Especialidade","select",{options:["Recuperação básica","Árvores e obstáculos","Obras e infraestrutura","Saúde","Assistência social","Resgate especializado","Logística","Resgate animal","Outra"]}),Z(),F("lider","Líder"),F("integrantes","Número de integrantes","number"),F("base","Base"),F("status","Disponibilidade","select",{options:["Disponível","Em atendimento","Indisponível"]}),F("recursos","Recursos e equipamentos","textarea"),F("telefone","Contato","tel")]},
  integrantes:{label:"Integrantes",singular:"Integrante",collection:"integrantes",summary:"Pessoas associadas às equipes municipais.",columns:["nome","equipe","funcao"],fields:[F("nome","Nome e sobrenome","text",{required:true}),F("equipe","Equipe","team"),F("funcao","Função"),F("habilitacoes","Habilitações"),F("telefone","Telefone","tel")]},
  voluntarios:{label:"Colaboradores",singular:"Colaborador",collection:"voluntarios",summary:"Pessoas físicas e jurídicas que oferecem ajuda. O cadastro também pode ser feito pelo atendimento simulado.",columns:["nome","tipo_pessoa","zona","telefone"],fields:[
 F("nome","Nome ou razão social","text",{required:true}),F("tipo_pessoa","Pessoa física ou jurídica","select",{required:true,options:["FÍSICA","JURÍDICA"]}),F("endereco","Endereço","text",{required:true}),F("telefone","Telefone / WhatsApp","tel",{required:true}),Z(),
 F("ajudas","Ajuda para pessoas atingidas","multi",{options:CATALOGOS.ajudas}),F("maquinas","Maquinário, equipamentos e materiais","multi",{options:CATALOGOS.maquinas}),
 F("empreendedores","Apoio para empreendedores","multi",{options:CATALOGOS.empreendedores}),F("materiais","Material / combustível","multi",{options:CATALOGOS.materiais}),
 F("outros","Especificar outros","textarea"),F("disponibilidade","Disponibilidade","select",{options:["Disponível","Indisponível","A combinar"]}),
 F("contribuicao","Observações da oferta","textarea")]},
  saude:{label:"UBS e hospitais",singular:"Unidade de saúde",collection:"instituicoes",category:"Saúde",summary:"Serviços de saúde e unidades de referência.",columns:["nome","tipo","telefone"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["UBS","UPA","Hospital","Santa Casa","SAMU","Farmácia","Outro"]}),F("endereco","Endereço"),F("codigo_cnes","CNES"),F("servicos","Serviços e capacidade","textarea"),...CONTATO]},
  emergencias:{label:"Bombeiros e polícias",singular:"Unidade de emergência",collection:"instituicoes",category:"Emergência",summary:"Órgãos de socorro, segurança e defesa.",columns:["nome","tipo","telefone"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["Defesa Civil","Bombeiros","Polícia Militar","Polícia Civil","Guarda Municipal","Trânsito","Outro"]}),F("endereco","Endereço"),F("area","Área atendida"),...CONTATO]},
  parceiros:{label:"Órgãos e entidades",singular:"Instituição",collection:"instituicoes",category:"Parceiros",summary:"Concessionárias, entidades e serviços de apoio.",columns:["nome","tipo","telefone"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["Água","Energia","Telecomunicações","Obras","ONG","Universidade","Empresa","Transporte","Outro"]}),F("endereco","Endereço"),F("capacidade","Capacidades disponíveis","textarea"),...CONTATO]},
  veiculos:{label:"Veículos",singular:"Veículo",collection:"veiculos",summary:"Frota e transporte disponível.",columns:["identificacao","tipo","base","status"],fields:[F("identificacao","Identificação","text",{required:true}),F("tipo","Tipo"),F("placa","Placa"),F("capacidade","Capacidade"),F("base","Base"),F("status","Disponibilidade","select",{options:["Disponível","Em uso","Indisponível"]})]},
  equipamentos:{label:"Equipamentos",singular:"Equipamento",collection:"equipamentos",summary:"Equipamentos operacionais e sua disponibilidade.",columns:["nome","quantidade","localizacao"],fields:[F("nome","Equipamento","text",{required:true}),F("quantidade","Quantidade","number"),F("localizacao","Localização"),F("condicao","Condição"),F("responsavel","Responsável")]},
  estoques:{label:"Estoques",singular:"Item de estoque",collection:"estoques",summary:"Suprimentos físicos, localização e saldo.",columns:["nome","quantidade","unidade","base"],fields:[F("nome","Item","text",{required:true}),F("quantidade","Saldo atual","number"),F("unidade","Unidade"),F("base","Depósito"),F("validade","Validade","date")]},
  abrigos:{label:"Abrigos",singular:"Abrigo",collection:"abrigos",summary:"Acolhimento e capacidade por localização.",columns:["nome","endereco","capacidade","status"],fields:[F("nome","Abrigo","text",{required:true}),F("endereco","Endereço"),F("capacidade","Capacidade","number"),F("disponiveis","Vagas disponíveis","number"),F("acessibilidade","Acessibilidade e estrutura"),F("status","Situação","select",{options:["Disponível","Lotado","Indisponível"]}),F("contato","Contato","tel")]},
  pontos:{label:"Pontos críticos",singular:"Ponto crítico",collection:"pontos",summary:"Pontes, vias, instalações e acessos prioritários.",columns:["nome","tipo","zona"],fields:[F("nome","Nome","text",{required:true}),F("tipo","Tipo"),Z(),F("localizacao","Localização"),F("observacoes","Observações","textarea")]},
  ocorrencias:{label:"Tipos de ocorrência",singular:"Tipo",collection:"ocorrenciaTipos",summary:"Catálogo de situações e encaminhamentos.",columns:["nome","competencia","prioridade"],fields:[F("nome","Categoria","text",{required:true}),F("competencia","Responsável principal"),F("prioridade","Prioridade","select",{options:["Alta","Média","Baixa"]}),F("recurso","Recurso necessário")]},
  canais:{label:"Canais de comunicação",singular:"Canal",collection:"canais",summary:"WhatsApp institucional e contatos alternativos.",columns:["nome","tipo","identificacao"],fields:[F("nome","Nome do canal","text",{required:true}),F("tipo","Canal","select",{options:["WhatsApp","Telefone","E-mail","Web","Rádio"]}),F("identificacao","Número ou identificador"),F("responsavel","Responsável")]},
  regras:{label:"Regras de acionamento",singular:"Regra",collection:"regras",summary:"Critérios previamente definidos para mobilização automática.",columns:["nome","ocorrencia","recurso"],fields:[F("nome","Nome da regra","text",{required:true}),F("ocorrencia","Tipo de ocorrência"),F("recurso","Equipe ou recurso"),F("zona","Zona","zone"),F("alternativa","Alternativa sem recurso disponível")]},
  solicitacoes:{label:"Pedidos de ajuda",singular:"Pedido",collection:"solicitacoes",summary:"Demandas pós-evento que aparecem no Mapa da Ajuda.",columns:["nome","necessidade","zona","status"],fields:[
    F("nome","Nome ou razão social","text",{required:true}),F("tipo_pessoa","Pessoa física ou jurídica","select",{required:true,options:["FÍSICA","JURÍDICA"]}),F("telefone","WhatsApp","tel",{required:true}),F("endereco","Endereço (privado)","text",{required:true}),Z(),
    F("necessidade","O que precisa?","select",{required:true,options:CATALOGOS.necessidades}),F("descricao","Descreva a necessidade","textarea"),
    F("urgencia","Urgência","select",{options:["Normal","Alta","Crítica"]}),F("evento_referencia","Evento relacionado (opcional)"),F("status","Situação","select",{options:["Aguardando","Encaminhada","Cheguei","Atendida","Cancelada"]}),
    F("atribuido_a","Colaborador acionado (ID)","hidden"),F("criado_em","Criado em","hidden")]},
  mobilizacoes:{label:"Mobilizações de brigadas",singular:"Mobilização",collection:"mobilizacoes",summary:"Registro de preparação de mensagens para a brigada da zona; envio real depende de integração.",columns:["nome","zona","status"],fields:[
    F("nome","Nome da mobilização","text",{required:true}),Z(),F("mensagem","Mensagem","textarea"),F("status","Estado","select",{options:["Preparada","Cancelada"]}),
    F("destinatarios","Destinatários (JSON)","hidden"),F("criado_em","Criado em","hidden")]},
  apoios:{label:"Apoio entre prefeituras",singular:"Pedido intermunicipal",collection:"apoios",summary:"Solicitações de recursos a outros municípios; o protótipo prepara a mensagem, não a envia automaticamente.",columns:["nome","destino","status"],fields:[
    F("nome","Título da solicitação","text",{required:true}),F("destino","Município destinatário","text",{required:true}),F("recurso","Recursos solicitados","textarea"),
    F("mensagem","Mensagem","textarea"),F("status","Estado","select",{options:["Preparada","Cancelada"]}),
    F("destino_id","Prefeitura destinatária (ID)","hidden"),F("criado_em","Criado em","hidden")]}

};
const GROUPS=[
 {label:"Início",items:["inicio"]},
 {label:"Prefeituras e território",items:["prefeituras","zonas","bases","riscos"]},
 {label:"Usuários e hierarquia",items:["administradores","responsaveis","substitutos","coordenadores","operadores"]},
 {label:"Equipes e comunidade",items:["equipes","integrantes","voluntarios"]},
 {label:"Ajuda e mobilização",items:["solicitacoes","mobilizacoes","apoios"]},
 {label:"Rede de emergência",items:["saude","emergencias","parceiros"]},
 {label:"Infraestrutura e recursos",items:["veiculos","equipamentos","estoques","abrigos","pontos"]},
 {label:"Regras e comunicação",items:["ocorrencias","canais","regras"]}
];
const COLLECTIONS=[...new Set(Object.values(ESQUEMAS).map(x=>x.collection))];
function novoEstado(){const v={version:1,municipioAtivo:"maringa"};for(const k of COLLECTIONS)v[k]=[];
v.prefeituras.push({id:"maringa",nome:"Maringá",uf:"PR",codigo_ibge:"4115200",lat:-23.4205,lng:-51.9333,zoom:12});
return v;}
function criar(armazenamento=global.localStorage){
 function carregar(){let bruto=null;try{bruto=JSON.parse(armazenamento.getItem(CHAVE)||"null")}catch(_){}const base=novoEstado();if(bruto&&bruto.version===1){for(const k of COLLECTIONS)base[k]=Array.isArray(bruto[k])?bruto[k]:base[k];base.municipioAtivo=bruto.municipioAtivo||"maringa";}if(!base.prefeituras.some(x=>x.id===base.municipioAtivo))base.municipioAtivo=base.prefeituras[0]?.id||"";return base;}
 let estado=carregar();
 function salvar(){try{armazenamento.setItem(CHAVE,JSON.stringify(estado))}catch(e){throw new Error("Não foi possível salvar os dados neste navegador.")}}
 function municipios(){return [...estado.prefeituras].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"))}
 function municipioAtivo(){return estado.prefeituras.find(x=>x.id===estado.municipioAtivo)||null}
 function selecionarMunicipio(id){if(!estado.prefeituras.some(x=>x.id===id))throw new Error("Município não encontrado.");estado.municipioAtivo=id;salvar();return municipioAtivo()}
 function lista(modulo,id=estado.municipioAtivo){
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  return estado[m.collection].filter(x=>m.collection==="prefeituras"||x.municipioId===id)
   .filter(x=>!m.role||x.funcao===m.role).filter(x=>!m.category||x.categoria===m.category)
   .sort((a,b)=>String(a.nome||a.identificacao||"").localeCompare(String(b.nome||b.identificacao||""),"pt-BR"));
 }
 function registro(modulo,id){return lista(modulo).find(x=>x.id===id)||null}
 function gravar(modulo,form,id){
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  const atual=id?registro(modulo,id):null;if(id&&!atual)throw new Error("Registro não encontrado neste município.");
  const campos={};for(const f of m.fields){let val=form[f.key];if(typeof val==="string")val=val.trim();if(val===undefined||val===null)val="";if(f.required&&!String(val).trim())throw new Error("Preencha: "+f.label+".");campos[f.key]=val;}
  if(m.collection==="prefeituras"){
   if(!/^\d{7}$/.test(String(campos.codigo_ibge)))throw new Error("Informe um código IBGE válido.");
   if(estado.prefeituras.some(x=>x.id!==id&&x.codigo_ibge===campos.codigo_ibge))throw new Error("Esta prefeitura já está cadastrada.");
  } else if(!estado.municipioAtivo)throw new Error("Cadastre primeiro uma prefeitura.");
  const generated=(global.crypto&&typeof global.crypto.randomUUID==="function")?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const item={...(atual||{}),...campos,id:id||generated,municipioId:m.collection==="prefeituras"?undefined:estado.municipioAtivo};
  if(m.role)item.funcao=m.role;if(m.category)item.categoria=m.category;
  if(!atual){estado[m.collection].push(item)}else{const idx=estado[m.collection].findIndex(x=>x.id===id);estado[m.collection][idx]=item}
  salvar();return item;
 }
 function atualizarGeo(id,geo){const p=estado.prefeituras.find(x=>x.id===id);if(!p)return null;for(const k of ["lat","lng","zoom","bbox"]){if(geo[k]!==undefined)p[k]=geo[k]}salvar();return p;}
 function excluir(modulo,id){
  const m=ESQUEMAS[modulo],old=registro(modulo,id);if(!old)return false;
  if(m.collection==="prefeituras"&&estado.prefeituras.length===1)throw new Error("É necessário manter pelo menos uma prefeitura.");
  estado[m.collection]=estado[m.collection].filter(x=>x.id!==id);
  if(m.collection==="prefeituras"){for(const k of COLLECTIONS.filter(x=>x!=="prefeituras"))estado[k]=estado[k].filter(x=>x.municipioId!==id);
   if(estado.municipioAtivo===id)estado.municipioAtivo=estado.prefeituras[0]?.id||"";}
  salvar();return true;
 }
 return {municipios,municipioAtivo,selecionarMunicipio,lista,registro,gravar,atualizarGeo,excluir,estado:()=>JSON.parse(JSON.stringify(estado))};
}
const api={CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,criar};
global.AlertaGestaoDados=api;if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:window);
