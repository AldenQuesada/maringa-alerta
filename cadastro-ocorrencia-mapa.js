/* Adapta os cadastros e regras existentes ao formulário do Mapa de Evento. */
(function(global){
"use strict";
function instalar(ctx){
  if(global.AlertaNuvem?.ativo){global.AlertaOcorrenciasServidor.instalar(ctx);return;}
  const {tenantId,tenantConfig,areas,tiposOcorrencia,map,ocLayer,MUNICIPIO_CENTER,
    normalizarTerritorio,pertence,canActZone,responsavelDaOcorrencia,ocIcon,
    refreshOcTooltip,salvarPrototipo,acionarAjuda,atualizarFluxo,atualizarFiltroEventos,
    openOcorrencia,fecharMenuMobile,obterOcorrencias,proximoId,reverterId,setEventoFiltro,obterEventoSelecionado}=ctx;
  const db=()=>AlertaGestaoDados.criar(undefined,{municipioId:tenantId});
  const tipos=()=>{
    const cadastrados=db().lista('ocorrencias',tenantId).map(x=>({tipo:x.nome,icone:'📍',gravBase:x.prioridade==='Alta'?3:x.prioridade==='Baixa'?1:x.prioridade==='Média'?2:null,resp:[]}));
    return cadastrados;
  };
  const organizacoes=()=>['saude','emergencias','parceiros','equipes'].flatMap(modulo=>
    db().lista(modulo,tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome,zona:x.zona||x.bairro||'',modulo,registro:x})));
  const normalizar=texto=>normalizarTerritorio(texto).replace(/[^a-z0-9]+/g,' ').trim();
  const equipeAtende=(zona,bairro)=>{
    if(!zona||!bairro)return false;
    if(normalizarTerritorio(zona)===normalizarTerritorio(bairro))return true;
    return areas.some(area=>area.tipoArea==='Zona'&&[area.nome,area.id].some(id=>normalizarTerritorio(id)===normalizarTerritorio(zona))&&pertence(area,bairro));
  };
  function duplicados(d){
    if(!d.tipo||!d.endereco)return [];
    const quando=new Date(d.quando).getTime()||Date.now();
    const perto=(pos,local)=>{
      const distancia=d.pos&&Array.isArray(pos)?map.distance(d.pos,pos):Infinity;
      const endereco=normalizar(local),busca=normalizar(d.endereco);
      return distancia<=d.raio || (endereco.length>=8&&busca.length>=8&&(endereco.includes(busca)||busca.includes(endereco)));
    };
    const ocorrenciasParecidas=obterOcorrencias().filter(o=>o.status!=='resolvida'&&Math.abs(quando-o.reportadoEm)<=d.janela*3600000&&perto(o.pos,o.endereco))
      .map(o=>({id:'ocorrencia:'+o.id,tipo:o.tipo,local:o.endereco||o.bairro,origem:o.origem||'Mapa',descricao:o.descricao||'',situacao:o.confirmado===false?'Em triagem':o.status,quando:o.reportadoEm,vinculavel:true}));
    const relatos=db().lista('solicitacoes',tenantId).filter(x=>x.status!=='Atendida'&&x.status!=='Cancelada'&&(!x.criado_em||Math.abs(quando-new Date(x.criado_em).getTime())<=d.janela*3600000)&&perto(null,x.endereco))
      .map(x=>({id:'pedido:'+x.id,tipo:x.necessidade,local:x.endereco,origem:'Pedido de ajuda',descricao:x.descricao||'',situacao:x.status,quando:x.criado_em,vinculavel:true}));
    return [...ocorrenciasParecidas,...relatos];
  }
  CadastroOcorrencia.iniciar({
    trigger:document.getElementById('demo-new'),center:MUNICIPIO_CENTER||[map.getCenter().lat,map.getCenter().lng],municipio:db().municipioAtivo(),onClose:()=>fecharMenuMobile(),
    feedback:mensagem=>{
      const aviso=document.getElementById('cadastro-ocorrencia-aviso');
      aviso.textContent=mensagem;aviso.hidden=false;
      setTimeout(()=>{aviso.hidden=true;},6000);
    },
    types:()=>tipos().map(t=>({value:t.tipo,label:t.tipo,gravidade:t.gravBase,responsabilidade:t.resp?.length===1?t.resp[0]:null})),
    events:()=>db().lista('eventos',tenantId).filter(e=>e.status!=='Encerrado').map(e=>({value:e.id,label:e.nome+' · '+e.tipo})),
    createType:(nome,prioridade)=>{
      if(tipos().some(t=>normalizarTerritorio(t.tipo)===normalizarTerritorio(nome)))throw Error('Já existe um tipo com este nome.');
      return db().gravar('ocorrencias',{nome,prioridade});
    },
    createOrganization:(nome,categoria,bairro)=>{
      if(!['equipes','emergencias','saude','parceiros'].includes(categoria))throw Error('Categoria inválida.');
      if(db().lista(categoria,tenantId).some(x=>normalizarTerritorio(x.nome)===normalizarTerritorio(nome)))throw Error('Já existe um cadastro com este nome nesta categoria.');
      const area=areas.find(a=>normalizarTerritorio(a.nome)===normalizarTerritorio(bairro));
      const dados={nome,tipo:categoria==='equipes'?'Outra':'Outro'};
      if(categoria==='equipes'){dados.zona=bairro;dados.status='Disponível';}
      else if(area?.tipoArea==='Bairro')dados.bairro=bairro;
      else dados.zona=bairro;
      const item=db().gravar(categoria,dados);return categoria+':'+item.id;
    },
    selectedEvent:()=>obterEventoSelecionado(),
    isWithinMunicipality:pos=>!!AlertaGestaoDados.config.limites(db().municipioAtivo())&&L.latLngBounds(AlertaGestaoDados.config.limites(db().municipioAtivo())).contains(pos),
    neighborhoods:()=>areas.filter(a=>a.tipoArea==='Bairro'||a.tipoArea==='Zona'||a.demo).filter((a,i,all)=>all.findIndex(x=>normalizarTerritorio(x.nome)===normalizarTerritorio(a.nome))===i).map(a=>({value:a.nome,label:a.nome})),
    neighborhood:pos=>CadastroOcorrencia.encontrarBairro(areas,pos),
    organizations:bairro=>organizacoes().sort((a,b)=>{
      const relevante=x=>normalizarTerritorio(x.zona)===normalizarTerritorio(bairro)?0:x.zona?2:1;
      return relevante(a)-relevante(b)||a.nome.localeCompare(b.nome,'pt-BR');
    }),
    suggest:(tipo,bairro)=>{
      const regras=db().lista('regras',tenantId).filter(r=>normalizarTerritorio(r.ocorrencia)===normalizarTerritorio(tipo)&&(!r.zona||normalizarTerritorio(r.zona)===normalizarTerritorio(bairro)));
      return organizacoes().filter(o=>(o.modulo==='equipes'&&equipeAtende(o.zona,bairro)&&o.registro.status!=='Indisponível')
        || regras.some(r=>normalizarTerritorio(r.recurso)===normalizarTerritorio(o.nome))).map(o=>o.id);
    },
    findDuplicates:duplicados,
    link:async(id,d)=>{
      if(id.startsWith('pedido:')){
        const cadastro=db(),pedido=cadastro.registro('solicitacoes',id.slice(7));
        if(!pedido)throw Error('Pedido não encontrado.');
        if(!canActZone(pedido.zona))throw Error('Seu perfil não pode alterar este pedido.');
        let relatos=[];try{relatos=Array.isArray(pedido.relatos)?pedido.relatos:JSON.parse(pedido.relatos||'[]');}catch(_){}
        cadastro.gravar('solicitacoes',{...pedido,relatos:[...relatos,d]},pedido.id);
        return;
      }
      const o=obterOcorrencias().find(x=>x.id===id.replace(/^ocorrencia:/,''));if(!o)throw Error('Ocorrência não encontrada.');
      if(!canActZone(o.bairro))throw Error('Seu perfil não pode alterar esta ocorrência.');
      const anterior=o.relatos||[];o.relatos=[...anterior,d];
      if(!salvarPrototipo()){o.relatos=anterior;throw Error('Não foi possível salvar o relato.');}
      openOcorrencia(o);
    },
    save:async(d,acao)=>{
      if(!canActZone(d.bairro))throw Error('Seu perfil não pode registrar ocorrência neste bairro.');
      if(!db().registro('eventos',d.evento))throw Error('Selecione um evento cadastrado na Gestão.');
      const tipo=tipos().find(t=>t.tipo===d.tipo);if(!tipo)throw Error('Tipo de ocorrência não disponível.');
      const selecionadas=organizacoes().filter(o=>d.organizacoes.includes(o.id)).map(o=>({id:o.id,nome:o.nome,status:'preparado'}));
      const equipesBairro=organizacoes().filter(o=>o.modulo==='equipes'&&equipeAtende(o.zona,d.bairro)&&o.registro.status!=='Indisponível');
      equipesBairro.forEach(e=>{if(!selecionadas.some(x=>x.id===e.id))selecionadas.push({id:e.id,nome:e.nome,status:'preparado'});});
      const eventoSelecionado=db().registro('eventos',d.evento);
      const num=proximoId(),agora=Date.now(),confirmada=acao==='confirmar';
      const o={id:'oc'+num,tenantId,confirmado:confirmada,protocolo:tenantConfig.prefixo+'-'+String(10000+num).slice(-5),
        tipo:tipo.tipo,icone:tipo.icone,bairro:d.bairro,pos:d.pos,gravidade:d.gravidade,responsabilidade:d.responsabilidade,
        endereco:d.endereco,acesso:d.acesso,descricao:d.descricao,riscos:d.riscos,afetados:d.afetados,evento:eventoSelecionado?.nome||'',eventoId:eventoSelecionado?.id||'',
        origem:d.origem,comunicante:d.comunicante,contato:d.contato,organizacoes:selecionadas,relatos:[d],
        relatorio:d.fotos.length?{fotoAtual:d.fotos[0].dados,fotoFinal:null,pendencias:'',fotosPublicas:d.fotosPublicas}:null,
        reportadoEm:new Date(d.quando).getTime(),confirmadoEm:null,resolvidoEm:null,tempoEstimado:0,status:'ativa',
        responsavel:responsavelDaOcorrencia(d.bairro),voluntariosProx:[],timeline:[{tipo:confirmada?'confirmada':'triagem',texto:confirmada?'Ocorrência confirmada':'Relato salvo para triagem',ts:agora}]};
      o.marker=L.marker(o.pos,{icon:ocIcon(o.status)}).addTo(ocLayer);o.marker.on('click',()=>openOcorrencia(o));
      obterOcorrencias().push(o);refreshOcTooltip(o);
      if(!salvarPrototipo()){obterOcorrencias().pop();o.marker.remove();reverterId(num);throw Error('Não foi possível salvar. Reduza as fotos ou verifique o armazenamento.');}
      if(confirmada)acionarAjuda(o);
      if(!salvarPrototipo())throw Error('Ocorrência salva, mas o acionamento não pôde ser atualizado. Verifique o armazenamento.');
      setEventoFiltro(o.eventoId||'');atualizarFiltroEventos();atualizarFluxo();map.setView(o.pos,15);openOcorrencia(o);
    }
  });
}

global.CadastroOcorrenciaMapa={instalar};
})(window);
