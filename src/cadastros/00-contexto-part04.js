  regras:{label:"Regras de acionamento",singular:"Regra",collection:"regras",summary:"Critérios previamente definidos para mobilização automática.",columns:["nome","ocorrencia","recurso"],fields:[F("nome","Nome da regra","text",{required:true}),F("ocorrencia","Tipo de ocorrência"),F("recurso","Equipe ou recurso"),F("zona","Zona","zone"),F("alternativa","Alternativa sem recurso disponível")]},
  solicitacoes:{label:"Pedidos de ajuda",singular:"Pedido",collection:"solicitacoes",summary:"Demandas pós-evento que aparecem no Mapa da Ajuda.",columns:["nome","necessidade","zona","status"],fields:[
    F("nome","Nome ou razão social","text",{required:true}),F("tipo_pessoa","Pessoa física ou jurídica (opcional)","select",{options:["FÍSICA","JURÍDICA"]}),F("telefone","WhatsApp","tel",{required:true}),F("endereco","Endereço (privado)","text",{required:true}),Z(),
    F("necessidade","O que precisa?","select",{required:true,options:CATALOGOS.necessidades}),F("descricao","Descreva a necessidade","textarea"),
    F("urgencia","Urgência","select",{options:["Normal","Alta","Crítica"]}),F("modo_recebimento","Retirada ou entrega da ajuda","select",{options:["Posso retirar em um ponto de apoio","Preciso receber no endereço informado","A combinar"]}),F("evento_referencia","Evento relacionado (opcional)"),F("status","Situação","select",{options:["Aguardando","Encaminhada","Cheguei","Atendida","Cancelada"]}),
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
