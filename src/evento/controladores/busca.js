/* Controlador busca: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('busca',{
 dependencias:{
  "escHtml": "contexto",
  "prefeituraContexto": "contexto",
  "tenantConfig": "contexto",
  "ocorrencias": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "map": "mapa",
  "selectZone": "recorte",
  "atualizarRecorte": "recorte",
  "pessoasMunicipio": "pessoas",
  "mostrarFicha": "pessoas",
  "openOcorrencia": "ocorrencias",
  "atualizarFiltroEventos": "persistencia",
  "buscaMapa": "inicializacao",
  "resultadosMapa": "inicializacao",
  "INVENTARIO": "inicializacao",
  "filtrosCadastros": "inicializacao",
  "listarRecursosPublicos": "inicializacao",
  "marcadorBusca": "inicializacao",
  "montarMarcadoresPublicos": "inicializacao"
},
 criar(dependencias){
 let bairroSolicitado;
 function atualizarFiltroCadastros(){dependencias.filtrosCadastros?.atualizar();}
function incluirTerritorio(territorio){
  if(dependencias.noRecorte(territorio)) return;
  const area=dependencias.areas.find(a=>a.tipoArea==='Bairro'&&dependencias.pertence(a,territorio))||dependencias.areas.find(a=>dependencias.pertence(a,territorio));
  if(area) dependencias.selectZone(area.chave);
}
function abrirRecurso(recurso){
  incluirTerritorio(recurso.bairro||recurso.zona);
  dependencias.marcadorBusca?.remove();
  const pos=[Number(recurso.lat),Number(recurso.lng)];
  const localizado=recurso.lat && recurso.lng && pos.every(Number.isFinite);
  const conteudo=`<strong>${dependencias.escHtml(recurso.nome)}</strong><br>${dependencias.escHtml(recurso.endereco||recurso.localizacao||'')}`;
  if(localizado){
    dependencias.marcadorBusca=L.marker(pos).addTo(dependencias.map).bindPopup(conteudo);
    dependencias.map.setView(pos,Math.max(dependencias.map.getZoom(),15));
    dependencias.marcadorBusca.openPopup();
  }else{
    L.popup().setLatLng(dependencias.map.getCenter()).setContent(conteudo+'<br>Sem coordenadas cadastradas.').openOn(dependencias.map);
  }
}
function buscarNoMapa(){
  const termos=dependencias.normalizarTerritorio(dependencias.buscaMapa.value).split(/\s+/).filter(Boolean);
  dependencias.resultadosMapa.replaceChildren();
  dependencias.resultadosMapa.hidden=!termos.length;
  dependencias.buscaMapa.setAttribute('aria-expanded',String(!!termos.length));
  if(!termos.length)return;
  const grupos=[
    ['Bairros e zonas',dependencias.areas.map(a=>({nome:a.nome,meta:a.tipoArea,abrir:()=>{if(!dependencias.selecao.has(a.chave))dependencias.selectZone(a.chave);}}))],
    ['Ocorrências',dependencias.ocorrencias.map(o=>({nome:o.tipo,meta:[o.protocolo,o.bairro,o.endereco].filter(Boolean).join(' · '),territorio:o.bairro,
      abrir:()=>{if(!dependencias.noEvento(o)){dependencias.eventoAtivo='';dependencias.atualizarFiltroEventos();dependencias.atualizarRecorte();}incluirTerritorio(o.bairro);if(o.pos)dependencias.map.panTo(o.pos);dependencias.openOcorrencia(o);}}))],
    ['Pessoas',dependencias.pessoasMunicipio().map(p=>({nome:p.nome,meta:[p.sub,p.bairroOrigem].filter(Boolean).join(' · '),territorio:p.bairroOrigem,
      abrir:()=>{incluirTerritorio(p.bairroOrigem);dependencias.mostrarFicha(p.id);}}))],
    ['Cadastros da Prefeitura',dependencias.listarRecursosPublicos().map(r=>({nome:r.nome,meta:[r.moduloNome,r.categoria,r.classe,r.endereco].filter(Boolean).join(' · '),
      territorio:r.bairro||r.zona,abrir:()=>abrirRecurso(r)}))]
  ];
  for(const [titulo,registros] of grupos){
    const encontrados=registros.filter(r=>termos.every(t=>dependencias.normalizarTerritorio(r.nome+' '+r.meta).includes(t)));
    if(!encontrados.length)continue;
    const secao=document.createElement('section');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=titulo;
    secao.append(cabecalho);
    encontrados.forEach(r=>{
      const botao=document.createElement('button');
      botao.type='button';
      botao.textContent=[r.nome,r.meta,r.territorio&&!dependencias.noRecorte(r.territorio)?'Fora do filtro':''].filter(Boolean).join(' · ');
      botao.onclick=()=>{dependencias.buscaMapa.value='';buscarNoMapa();r.abrir();};
      secao.append(botao);
    });
    dependencias.resultadosMapa.append(secao);
  }
  if(!dependencias.resultadosMapa.childElementCount) dependencias.resultadosMapa.textContent='Nenhum resultado em '+dependencias.tenantConfig.nome+'.';
}
 async function iniciar(){
 void Promise.allSettled((AlertaGestaoDados.config.referencias(dependencias.prefeituraContexto).publicas||[]).map(url=>AlertaImportacaoPublica.carregar(dependencias.gestao,{url}))).then(()=>{
 dependencias.montarMarcadoresPublicos();
 if(dependencias.buscaMapa.value.trim())buscarNoMapa();
 atualizarFiltroCadastros();
}).catch(error=>console.warn("Referências municipais de abrigo e apoio indisponíveis",error));
dependencias.montarMarcadoresPublicos();
dependencias.filtrosCadastros=FiltrosCadastros.montar({alvo:document.getElementById('filtros-cadastros-municipais'),inventario:dependencias.INVENTARIO,db:dependencias.gestao,recorte:x=>dependencias.noRecorte(x.zona||x.bairro),aoMudar:()=>dependencias.montarMarcadoresPublicos(),localizar:x=>dependencias.map.flyTo([x.lat,x.lng],Math.max(dependencias.map.getZoom(),15))});
dependencias.montarMarcadoresPublicos();
dependencias.buscaMapa.addEventListener('input',buscarNoMapa);
dependencias.buscaMapa.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();dependencias.resultadosMapa.querySelector('button')?.click();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!dependencias.resultadosMapa.hidden){dependencias.buscaMapa.value='';buscarNoMapa();dependencias.buscaMapa.focus();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.event-search')&&!dependencias.resultadosMapa.hidden){dependencias.buscaMapa.value='';buscarNoMapa();}
});
(bairroSolicitado=new URLSearchParams(location.search).get('bairro'));
if(bairroSolicitado){
  const area=dependencias.areasCadastradas.find(a=>dependencias.normalizarTerritorio(a.nome)===dependencias.normalizarTerritorio(bairroSolicitado));
  if(area) dependencias.selectZone(area.chave);
}
 return true;
 }
 return {iniciar,atualizarFiltroCadastros,incluirTerritorio,abrirRecurso,buscarNoMapa,get bairroSolicitado(){return bairroSolicitado;}};
 }
});
})(globalThis);
