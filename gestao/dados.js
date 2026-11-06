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
 ajudas:["FORNECER ALIMENTAÇÃO","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS","CUIDADOR","LIMPEZA","PEDREIRO","METALÚRGICO","CARPINTEIRO","OPERADOR DE MOTOSSERRA","ELETRICISTA","LAUDO","EMITIR LAUDOS DE PREJUÍZOS","OUTRO","INFLUENCIADORES E DIVULGAÇÃO DE NOTÍCIAS","OPERADOR DE DRONE"],
 maquinas:["PÁ CARREGADEIRA","RETROESCAVADEIRA","MUNCK","CAMIONETE","BOBCAT","CAMINHÃO GARRA","CAMINHÃO BASCULANTE","GERADOR","MATERIAL DE CONSTRUÇÃO","STAR LINK","OUTRO","MOTOSSERRA COM OPERADOR","MOTOSSERRA"],
 empreendedores:["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO","OUTRO"],
 materiais:["MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"],
 formas_entrega_doacao:["Preciso que retirem no meu endereço","Consigo entregar no centro de acolhimento mais próximo"],
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
  bases:{label:"Bases de apoio",singular:"Base",collection:"bases",summary:"Bases, centros de doações e apoio municipal, sem cadastro paralelo.",columns:["nome","tipo","zona","endereco","geo_status","verificacao"],fields:[F("nome","Nome","text",{required:true}),F("tipo","Finalidade","select",{options:["Centro de coleta de donativos","Apoio operacional e acolhimento","Base logística","Outro"]}),Z(),F("endereco","Endereço"),F("bairro","Bairro"),F("itens_aceitos","Donativos aceitos","textarea"),F("horario","Horário divulgado"),F("lat","Latitude"),F("lng","Longitude"),F("geo_status","Precisão do ponto no mapa"),F("geo_fonte","Fonte das coordenadas"),F("coordenadas","Localização complementar"),F("observacoes","Observações","textarea"),F("fonte","Fonte"),F("url_fonte","Link da fonte pública"),F("externalId","ID de referência"),F("verificacao","Verificação","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]}),...CONTATO]},
  riscos:{label:"Áreas de risco",singular:"Área de risco",collection:"riscos",summary:"Áreas de atenção documentadas, sujeitas à confirmação municipal.",columns:["nome","zona","categoria","verificacao"],fields:[F("nome","Nome da área","text",{required:true}),Z(),F("categoria","Risco","select",{options:["Alagamento","Deslizamento","Vendaval","Incêndio","Colapso estrutural","Tecnológico","Outro"]}),F("localizacao","Endereço ou referência"),F("descricao","Descrição","textarea"),F("geojson","Polígono GeoJSON","textarea"),F("lat","Latitude"),F("lng","Longitude"),F("fonte","Fonte"),F("url_fonte","Link da fonte pública"),F("externalId","ID de referência"),F("verificacao","Verificação","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]})]},
  administradores:{label:"Administradores",singular:"Administrador",collection:"usuarios",role:"admin",summary:"Responsáveis pela administração do município.",columns:["nome","email","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),F("cargo","Cargo"),...CONTATO]},
  responsaveis:{label:"Responsáveis regionais",singular:"Responsável",collection:"usuarios",role:"responsavel",summary:"Referências diretas de cada zona.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  substitutos:{label:"Substitutos",singular:"Substituto",collection:"usuarios",role:"substituto",summary:"Pessoas que assumem na ausência do responsável.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  coordenadores:{label:"Coordenadores",singular:"Coordenador",collection:"usuarios",role:"coordenador",summary:"Coordenação de equipes e recursos.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("especialidade","Especialidade"),...CONTATO]},
  operadores:{label:"Operadores",singular:"Operador",collection:"usuarios",role:"operador",summary:"Acesso operacional ao acompanhamento do município.",columns:["nome","zona","telefone"],fields:[F("nome","Nome e sobrenome","text",{required:true}),Z(),F("cargo","Cargo"),...CONTATO]},
  equipes:{label:"Equipes de recuperação",singular:"Equipe",collection:"equipes",summary:"Equipes municipais com capacidades e disponibilidade.",columns:["nome","tipo","zona","status"],fields:[F("nome","Nome da equipe","text",{required:true}),F("tipo","Especialidade","select",{options:["Recuperação básica","Árvores e obstáculos","Obras e infraestrutura","Saúde","Assistência social","Resgate especializado","Logística","Resgate animal","Outra"]}),Z(),F("lider","Líder"),F("integrantes","Número de integrantes","number"),F("base","Base"),F("status","Disponibilidade","select",{options:["Disponível","Em atendimento","Indisponível"]}),F("recursos","Recursos e equipamentos","textarea"),F("telefone","Contato","tel")]},
  integrantes:{label:"Integrantes",singular:"Integrante",collection:"integrantes",summary:"Pessoas associadas às equipes municipais.",columns:["nome","equipe","funcao"],fields:[F("nome","Nome e sobrenome","text",{required:true}),F("equipe","Equipe","team"),F("funcao","Função"),F("habilitacoes","Habilitações"),F("telefone","Telefone","tel")]},
  voluntarios:{label:"Colaboradores",singular:"Colaborador",collection:"voluntarios",summary:"Pessoas físicas e jurídicas que oferecem ajuda. O cadastro também pode ser feito pelo atendimento simulado.",columns:["nome","tipo_pessoa","zona","telefone"],fields:[
 F("nome","Nome ou razão social","text",{required:true}),F("tipo_pessoa","Pessoa física ou jurídica","select",{required:true,options:["FÍSICA","JURÍDICA"]}),F("endereco","Endereço","text",{required:true}),F("telefone","Telefone / WhatsApp","tel",{required:true}),F("email","E-mail","email"),F("bairro","Bairro de origem"),Z(),
 F("ajudas","Ajuda para pessoas atingidas","multi",{options:CATALOGOS.ajudas}),F("maquinas","Maquinário, equipamentos e materiais","multi",{options:CATALOGOS.maquinas}),
 F("empreendedores","Apoio para empreendedores","multi",{options:CATALOGOS.empreendedores}),F("materiais","Material / combustível","multi",{options:CATALOGOS.materiais}),
 F("forma_entrega_doacao","Retirada ou entrega da doação","select",{options:CATALOGOS.formas_entrega_doacao}),
 F("outros","Especificar outros","textarea"),F("checkin_status","Estado do check-in","hidden"),F("checkin_bairro","Bairro do check-in","hidden"),F("checkin_em","Chegada registrada","hidden"),F("checkout_em","Saída registrada","hidden"),F("checkin_lat","Latitude do check-in","hidden"),F("checkin_lng","Longitude do check-in","hidden"),F("checkin_precisao","Precisão GPS","hidden"),F("checkin_fonte","Origem territorial","hidden"),F("checkin_tipo","Tipo de validação","hidden"),F("disponibilidade","Disponibilidade","select",{options:["Disponível","Indisponível","A combinar"]}),
 F("contribuicao","Observações da oferta","textarea"),F("status_simulacao","Registro demonstrativo","hidden"),F("origem_cadastro","Origem do cadastro","hidden"),F("origem_id_legado","Identificador legado","hidden")]},
  saude:{label:"UBS e hospitais",singular:"Unidade de saúde",collection:"instituicoes",category:"Saúde",summary:"Serviços de saúde e unidades de referência.",columns:["nome","tipo","telefone","responsavel_id"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["UBS","UPA","Hospital","Santa Casa","SAMU","Farmácia","Outro"]}),F("endereco","Endereço"),F("codigo_cnes","CNES"),F("servicos","Serviços e capacidade","textarea"),F("responsavel_id","Representante no Gabinete de Crise","person"),...GEO_FIELDS,...CONTATO]},
  emergencias:{label:"Bombeiros e polícias",singular:"Unidade de emergência",collection:"instituicoes",category:"Emergência",summary:"Órgãos de socorro, segurança e defesa.",columns:["nome","tipo","telefone","responsavel_id"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["Defesa Civil","Bombeiros","Polícia Militar","Polícia Civil","Guarda Municipal","Trânsito","Outro"]}),F("endereco","Endereço"),F("area","Área atendida"),F("responsavel_id","Representante no Gabinete de Crise","person"),...GEO_FIELDS,...CONTATO]},
  parceiros:{label:"Órgãos e entidades",singular:"Instituição",collection:"instituicoes",category:"Parceiros",summary:"Concessionárias, entidades e serviços de apoio.",columns:["nome","tipo","telefone","responsavel_id"],fields:[F("nome","Nome oficial","text",{required:true}),F("tipo","Tipo","select",{options:["Água","Energia","Telecomunicações","Obras","ONG","Universidade","Empresa","Transporte","Outro"]}),F("endereco","Endereço"),F("capacidade","Capacidades disponíveis","textarea"),F("responsavel_id","Representante no Gabinete de Crise","person"),...GEO_FIELDS,...CONTATO]},
  veiculos:{label:"Veículos",singular:"Veículo",collection:"veiculos",summary:"Frota e transporte disponível.",columns:["identificacao","tipo","base","status"],fields:[F("identificacao","Identificação","text",{required:true}),F("tipo","Tipo"),F("placa","Placa"),F("capacidade","Capacidade"),F("base","Base"),F("status","Disponibilidade","select",{options:["Disponível","Em uso","Indisponível"]})]},
  equipamentos:{label:"Equipamentos",singular:"Equipamento",collection:"equipamentos",summary:"Equipamentos operacionais e sua disponibilidade.",columns:["nome","quantidade","localizacao"],fields:[F("nome","Equipamento","text",{required:true}),F("quantidade","Quantidade","number"),F("localizacao","Localização"),F("condicao","Condição"),F("responsavel","Responsável")]},
  estoques:{label:"Estoques",singular:"Item de estoque",collection:"estoques",summary:"Suprimentos físicos, localização e saldo.",columns:["nome","quantidade","unidade","base"],fields:[F("nome","Item","text",{required:true}),F("quantidade","Saldo atual","number"),F("unidade","Unidade"),F("base","Depósito"),F("validade","Validade","date")]},
  abrigos:{label:"Abrigos",singular:"Abrigo",collection:"abrigos",summary:"Acolhimento emergencial e instituições públicas de referência, com vagas a confirmar.",columns:["nome","tipo","zona","endereco","capacidade","status"],fields:[F("nome","Abrigo","text",{required:true}),F("tipo","Modalidade de acolhimento"),F("zona","Zona numerada"),F("bairro","Bairro ou distrito"),F("endereco","Endereço"),F("publico","Público atendido"),F("acesso","Como solicitar acolhimento","textarea"),F("capacidade","Capacidade total publicada","number"),F("disponiveis","Vagas livres confirmadas","number"),F("acessibilidade","Estrutura e atendimento","textarea"),F("status","Situação das vagas","select",{options:["A confirmar","Disponível","Lotado","Indisponível"]}),F("contato","Contato institucional","tel"),F("lat","Latitude"),F("lng","Longitude"),F("geo_status","Precisão das coordenadas"),F("geo_fonte","Fonte das coordenadas"),F("fonte","Fonte pública"),F("url_fonte","Link da fonte"),F("externalId","Identificador externo"),F("verificacao","Conferência","select",{options:["Pendente","Em conferência","Validado","Rejeitado"]}),F("observacoes","Observações","textarea")]},
  pontos:{label:"Pontos críticos",singular:"Ponto crítico",collection:"pontos",summary:"Pontes, vias, instalações e acessos prioritários.",columns:["nome","tipo","zona"],fields:[F("nome","Nome","text",{required:true}),F("tipo","Tipo"),Z(),F("localizacao","Localização"),F("observacoes","Observações","textarea"),F("bairro","Bairro"),F("lat","Latitude"),F("lng","Longitude"),F("fonte","Fonte"),F("verificacao","Verificação")]},
  ocorrencias:{label:"Tipos de ocorrência",singular:"Tipo",collection:"ocorrenciaTipos",summary:"Catálogo de situações e encaminhamentos.",columns:["nome","competencia","prioridade"],fields:[F("nome","Categoria","text",{required:true}),F("competencia","Responsável principal"),F("prioridade","Prioridade","select",{options:["Alta","Média","Baixa"]}),F("recurso","Recurso necessário")]},
  canais:{label:"Canais de comunicação",singular:"Canal",collection:"canais",summary:"WhatsApp institucional e contatos alternativos.",columns:["nome","tipo","identificacao"],fields:[F("nome","Nome do canal","text",{required:true}),F("tipo","Canal","select",{options:["WhatsApp","Telefone","E-mail","Web","Rádio"]}),F("identificacao","Número ou identificador"),F("responsavel","Responsável")]},
  eventos:{label:"Eventos",singular:"Evento",collection:"eventos",summary:"Eventos municipais que agrupam ocorrências.",columns:["nome","tipo","status"],fields:[
    F("nome","Nome do evento","text",{required:true}),F("tipo","Tipo de evento","text",{required:true}),
    F("status","Situação","select",{options:["A confirmar","Em andamento","Encerrado"]}),F("inicio","Data e hora de início"),
    F("mapa_evento_id","Visualizar junto com o mapa de outro evento","eventoMapa"),F("descricao","Descrição","textarea"),F("fonte","Fonte"),F("url_fonte","Link da fonte"),F("referencias","Informações verificadas","textarea"),F("externalId","Identificador da fonte","hidden")]},
  regras:{label:"Regras de acionamento",singular:"Regra",collection:"regras",summary:"Critérios previamente definidos para mobilização automática.",columns:["nome","ocorrencia","recurso"],fields:[F("nome","Nome da regra","text",{required:true}),F("ocorrencia","Tipo de ocorrência"),F("recurso","Equipe ou recurso"),F("zona","Zona","zone"),F("alternativa","Alternativa sem recurso disponível")]},
  solicitacoes:{label:"Pedidos de ajuda",singular:"Pedido",collection:"solicitacoes",summary:"Demandas pós-evento que aparecem no Mapa da Ajuda.",columns:["nome","necessidade","zona","status"],fields:[
    F("nome","Nome ou razão social","text",{required:true}),F("tipo_pessoa","Pessoa física ou jurídica (opcional)","select",{options:["FÍSICA","JURÍDICA"]}),F("telefone","WhatsApp","tel",{required:true}),F("endereco","Endereço (privado)","text",{required:true}),Z(),
    F("necessidade","O que precisa?","select",{required:true,options:CATALOGOS.necessidades}),F("descricao","Descreva a necessidade","textarea"),
    F("urgencia","Urgência (classificação interna)","select",{options:["Não avaliada","Normal","Alta","Crítica"]}),F("modo_recebimento","Retirada ou entrega da ajuda","select",{options:["Posso retirar em um ponto de apoio","Preciso receber no endereço informado","A combinar"]}),F("evento_referencia","Evento relacionado (opcional)"),F("status","Situação","select",{options:["Aguardando","Encaminhada","Cheguei","Atendida","Cancelada"]}),
    F("atribuido_a","Colaborador acionado (ID)","hidden"),F("criado_em","Criado em","hidden"),F("relatos","Relatos vinculados","hidden")]},
  relatos:{label:"Relatos de ocorrências",singular:"Relato",collection:"relatos",summary:"Comunicações de cidadãos aguardando triagem operacional. Não são ocorrências confirmadas.",columns:["nome","endereco","status"],fields:[
    F("nome","Nome do comunicante","text",{required:true}),F("telefone","Telefone","tel",{required:true}),F("endereco","Endereço exato (privado)","text",{required:true}),
    F("pessoas_no_local","Pessoas no local","multi",{options:["CRIANÇA / ADOLESCENTE","PESSOA IDOSA","PCD","NÃO HÁ"]}),F("descricao","Necessidade ou situação","textarea"),
    F("foto","Imagem armazenada localmente","hidden"),F("foto_nome","Nome do arquivo","hidden"),F("status","Situação","select",{options:["Em triagem","Vinculado","Confirmado","Arquivado"]}),
    F("origem","Origem do registro","hidden"),F("criado_em","Data e hora","hidden")
  ]},
  mobilizacoes:{label:"Mobilizações de brigadas",singular:"Mobilização",collection:"mobilizacoes",summary:"Registro de preparação de mensagens para a brigada da zona; envio real depende de integração.",columns:["nome","zona","status"],fields:[
    F("nome","Nome da mobilização","text",{required:true}),Z(),F("mensagem","Mensagem","textarea"),F("status","Estado","select",{options:["Preparada","Cancelada"]}),
    F("destinatarios","Destinatários (JSON)","hidden"),F("criado_em","Criado em","hidden")]},
  apoios:{label:"Apoio entre prefeituras",singular:"Pedido intermunicipal",collection:"apoios",summary:"Solicitações de recursos a outros municípios; o protótipo prepara a mensagem, não a envia automaticamente.",columns:["nome","destino","status"],fields:[
    F("nome","Título da solicitação","text",{required:true}),F("destino","Município destinatário","text",{required:true}),F("recurso","Recursos solicitados","textarea"),
    F("mensagem","Mensagem","textarea"),F("status","Estado","select",{options:["Preparada","Cancelada"]}),
    F("destino_id","Prefeitura destinatária (ID)","hidden"),F("criado_em","Criado em","hidden")]}

};
const GROUPS=[
 {label:"Início",items:["inicio","eventos"]},
 {label:"Prefeitura",items:["territorio"]},
 {label:"Equipes e comunidade",items:["equipes","integrantes","voluntarios"]},
 {label:"Ajuda e mobilização",items:["solicitacoes","relatos","mobilizacoes","apoios"]},
 {label:"Infraestrutura e recursos",items:["veiculos","equipamentos","estoques","abrigos","pontos"]},
 {label:"Regras e comunicação",items:["ocorrencias","canais","regras"]}
];
const COLLECTIONS=[...new Set(Object.values(ESQUEMAS).map(x=>x.collection))];
function novoEstado(){const v={version:1,municipioAtivo:"maringa"};for(const k of COLLECTIONS)v[k]=[];
v.prefeituras.push({id:"maringa",nome:"Maringá",uf:"PR",codigo_ibge:"4115200",pais:"Brasil",paisId:"BR",estado:"Paraná",codigo_uf:"41",status:"ativa",origem_provisionamento:"bootstrap",lat:-23.4205,lng:-51.9333,zoom:12});
return v;}
function criar(armazenamento=global.localStorage,options={}){
 const scopedId=options&&typeof options.municipioId==="string"?options.municipioId:null;
 const accessMode=scopedId?"municipal":"plataforma";
 function carregar(){let bruto=null;try{bruto=JSON.parse(armazenamento.getItem(CHAVE)||"null")}catch(_){}const base=novoEstado();if(bruto&&bruto.version===1){for(const k of COLLECTIONS)base[k]=Array.isArray(bruto[k])?bruto[k]:base[k];base.municipioAtivo=bruto.municipioAtivo||"maringa";}/* Migração idempotente: Maringá é município fundador e não pode desaparecer em estados locais antigos. */if(!base.prefeituras.some(x=>x.id==="maringa"||x.codigo_ibge==="4115200"))base.prefeituras.unshift(novoEstado().prefeituras[0]);if(!base.prefeituras.some(x=>x.id===base.municipioAtivo))base.municipioAtivo=base.prefeituras[0]?.id||"";for(const p of base.prefeituras){if(!p.status)p.status=p.id==="maringa"?"ativa":"implantacao";if(!p.paisId)p.paisId="BR";if(!p.pais)p.pais="Brasil";}return base;}
 let estado=carregar();
 function refresh(){estado=carregar();}
 function salvar(){try{armazenamento.setItem(CHAVE,JSON.stringify(estado))}catch(e){throw new Error("Não foi possível salvar os dados neste navegador.")}}
 function municipioCorrente(){return scopedId||estado.municipioAtivo;}
 function municipios(){refresh();return estado.prefeituras.filter(x=>!scopedId||x.id===scopedId).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"))}
 function municipioAtivo(){refresh();return estado.prefeituras.find(x=>x.id===municipioCorrente())||null}
 function selecionarMunicipio(id){
  refresh();
  if(scopedId&&id!==scopedId)throw new Error("Município fora do escopo municipal.");
  if(!estado.prefeituras.some(x=>x.id===id))throw new Error("Município não encontrado.");
  if(!scopedId){estado.municipioAtivo=id;salvar();}
  return municipioAtivo();
 }
 function lista(modulo,id=municipioCorrente()){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  return estado[m.collection].filter(x=>m.collection==="prefeituras"?(!scopedId||x.id===scopedId):x.municipioId===(scopedId||id))
   .filter(x=>!m.role||x.funcao===m.role||(Array.isArray(x.papeis)&&x.papeis.includes(m.role))).filter(x=>!m.category||x.categoria===m.category)
   .sort((a,b)=>String(a.nome||a.identificacao||"").localeCompare(String(b.nome||b.identificacao||""),"pt-BR"));
 }
 function registro(modulo,id){return lista(modulo).find(x=>x.id===id)||null}
 function gravar(modulo,form,id){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  if(scopedId&&m.collection==="prefeituras")throw new Error("Somente o Admin Geral pode criar ou alterar Prefeituras.");
  const atual=id?registro(modulo,id):null;if(id&&!atual)throw new Error("Registro não encontrado neste município.");
  const campos={};for(const f of m.fields){let val=form[f.key];if(typeof val==="string")val=val.trim();if(val===undefined||val===null)val="";if(f.required&&!String(val).trim())throw new Error("Preencha: "+f.label+".");campos[f.key]=val;}
  if(modulo==="eventos"&&campos.mapa_evento_id){
   const listaEventos=estado.eventos.filter(e=>e.municipioId===municipioCorrente());
   const visitados=new Set(id?[String(id)]:[]);let ref=String(campos.mapa_evento_id);
   while(ref){if(visitados.has(ref))throw new Error("O evento não pode formar um vínculo circular de mapas.");visitados.add(ref);const alvo=listaEventos.find(e=>e.id===ref);if(!alvo)throw new Error("Evento de referência não encontrado neste município.");ref=String(alvo.mapa_evento_id||"");}
  }
  if(m.collection==="prefeituras"){
   if(!/^\d{7}$/.test(String(campos.codigo_ibge)))throw new Error("Informe um código IBGE válido.");
   if(estado.prefeituras.some(x=>x.id!==id&&x.codigo_ibge===campos.codigo_ibge))throw new Error("Esta prefeitura já está cadastrada.");
  } else if(!municipioCorrente())throw new Error("Cadastre primeiro uma prefeitura.");
  const generated=(global.crypto&&typeof global.crypto.randomUUID==="function")?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const item={...(atual||{}),...campos,id:id||generated,municipioId:m.collection==="prefeituras"?undefined:municipioCorrente()};
  if(m.role)item.funcao=m.role;if(m.category)item.categoria=m.category;
  if(!atual){estado[m.collection].push(item)}else{const idx=estado[m.collection].findIndex(x=>x.id===id);estado[m.collection][idx]=item}
  salvar();return item;
 }
 function atualizarGeo(id,geo){refresh();if(scopedId)throw new Error("Georreferenciamento inicial pertence ao Admin Geral.");const p=estado.prefeituras.find(x=>x.id===id);if(!p)return null;for(const k of ["lat","lng","zoom","bbox","limite_geojson","fonte_geo","geo_atualizado","pais","paisId","estado","codigo_uf"]){if(geo[k]!==undefined)p[k]=geo[k]}salvar();return p;}

 function importarLote(modulo,rows,{modo="revisado"}={}){
  refresh();
  const permitido=new Set(["bairros","zonas","bases","riscos","abrigos","pontos","saude","emergencias","parceiros"]);
  if(!permitido.has(modulo))throw new Error("Coleção não permitida para importação.");
  if(!Array.isArray(rows)||rows.length>5000)throw new Error("Lote inválido ou maior que 5.000 registros.");
  const m=ESQUEMAS[modulo],municipioId=municipioCorrente();
  if(!municipioId)throw new Error("Selecione o município.");
  const anterior=estado;
  const clone=JSON.parse(JSON.stringify(estado));
  const all=clone[m.collection],filtered=all.filter(x=>x.municipioId===municipioId);
  const byKey=new Map(filtered.filter(x=>x.externalId||x.codigo_cnes).map(x=>[String(x.externalId||"cnes:"+x.codigo_cnes),x]));
  const byName=new Map(filtered.filter(x=>x.nome).map(x=>[(String(x.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(x.tipo||"").toLowerCase()),x]));
  const idGen=()=>global.crypto&&typeof global.crypto.randomUUID==="function"?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const stats={novos:0,atualizados:0,preservados:0,duplicados:0};
  const batchSeen=new Set();
  for(const src of rows){
   if(!src||typeof src!=="object"||!String(src.nome||"").trim())throw new Error("Lote contém registro sem nome.");
   if(src.municipioId&&src.municipioId!==municipioId)throw new Error("Município divergente no lote.");
   if(m.category&&src.categoria&&src.categoria!==m.category)throw new Error("Categoria divergente no lote.");
   const exid=String(src.externalId||src.codigo_cnes&&"cnes:"+src.codigo_cnes||"");
   const fallback=String(src.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(src.tipo||"").toLowerCase();
   const unique=exid||fallback;
   if(batchSeen.has(unique)){stats.duplicados++;continue;}
   batchSeen.add(unique);
   const old=exid?byKey.get(exid)||byName.get(fallback):byName.get(fallback);
   if(old?.verificacao==="Validado"||old?.verificacao==="Manual confirmado"){
    stats.preservados++;continue;
   }
   const allowedFields=new Set([...m.fields.map(f=>f.key),"externalId","codigo_cnes","lat","lng","geojson","fonte","url_fonte","verificacao","atualizado_em","bairro","cep","observacoes","categoria"]);
   const cleaned=Object.fromEntries(Object.entries(src).filter(([k,v])=>allowedFields.has(k)&&v!==undefined&&v!==null));
   if(old){
    const idx=all.findIndex(x=>x.id===old.id);
    all[idx]={...old,...Object.fromEntries(Object.entries(cleaned).filter(([k,v])=>v!=="")),id:old.id,municipioId,categoria:m.category||old.categoria};
    stats.atualizados++;
   }else{
    const item={...cleaned,id:idGen(),municipioId,categoria:m.category||cleaned.categoria};
    all.push(item);byName.set(fallback,item);if(exid)byKey.set(exid,item);
    stats.novos++;
   }
  }
  estado=clone;
  try{salvar();return stats}catch(e){estado=anterior;throw e}
 }
 function implantarPacote(pacote){
  refresh();
  if(scopedId)throw new Error("Implantação territorial inicial pertence ao Admin Geral.");
  if(estado.municipioAtivo!=="maringa"||municipioAtivo()?.codigo_ibge!=="4115200")throw new Error("Implantação automática disponível somente para Maringá.");
  if(!pacote||typeof pacote!=="object")throw new Error("Pacote de importação inválido.");
  const allowed=["bairros","zonas","bases","riscos","pontos","saude","emergencias","parceiros"];
  const grupos=pacote.grupos||{},tmp={value:JSON.stringify(estado)};
  const virtual={getItem:key=>key===CHAVE?tmp.value:null,setItem:(key,value)=>{if(key===CHAVE)tmp.value=String(value);}};
  const test=criar(virtual),totais={};
  for(const name of allowed){
   if(!Object.hasOwn(grupos,name))continue;
   totais[name]=test.importarLote(name,grupos[name]);
  }
  if(pacote.municipioGeo){
   if(pacote.municipioGeo.limite_geojson&&String(pacote.municipioGeo.limite_geojson).length>1350000)throw new Error("Malha municipal acima do limite.");
   test.atualizarGeo("maringa",pacote.municipioGeo);
  }
  test.gravar("implantacao",{nome:"Implantação territorial Maringá",status:"Conferência local",fonte:String(pacote.fonte||"IBGE/CNES/GeoMaringá"),criado_em:new Date().toISOString(),quantidade:Object.values(totais).reduce((a,x)=>a+x.novos+x.atualizados,0)});
  const velho=estado;
  estado=JSON.parse(tmp.value);
  try{salvar()}catch(e){estado=velho;throw e}
  return {totais,municipio:municipioAtivo()};
 }
 function excluir(modulo,id){
  refresh();
  const m=ESQUEMAS[modulo];if(scopedId&&m?.collection==="prefeituras")throw new Error("Somente Admin Geral pode excluir Prefeituras.");
  const old=registro(modulo,id);if(!old)return false;
  if(m.collection==="prefeituras"&&estado.prefeituras.length===1)throw new Error("É necessário manter pelo menos uma prefeitura.");
  estado[m.collection]=estado[m.collection].filter(x=>x.id!==id);
  if(m.collection==="prefeituras"){for(const k of COLLECTIONS.filter(x=>x!=="prefeituras"))estado[k]=estado[k].filter(x=>x.municipioId!==id);
   if(estado.municipioAtivo===id)estado.municipioAtivo=estado.prefeituras[0]?.id||"";}
  salvar();return true;
 }
 function estadoVisivel(){
  refresh();
  if(!scopedId)return JSON.parse(JSON.stringify(estado));
  const result=JSON.parse(JSON.stringify(estado));result.municipioAtivo=scopedId;
  for(const k of COLLECTIONS){
   result[k]=k==="prefeituras"?result[k].filter(x=>x.id===scopedId):result[k].filter(x=>x.municipioId===scopedId);
  }
  return result;
 }
 return {municipios,municipioAtivo,selecionarMunicipio,lista,registro,gravar,importarLote,implantarPacote,atualizarGeo,excluir,estado:estadoVisivel,modo:accessMode,municipioEscopo:scopedId};
}
const api={CHAVE,UFS,CATALOGOS,ESQUEMAS,GROUPS,criar};
global.AlertaGestaoDados=api;if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:window);
